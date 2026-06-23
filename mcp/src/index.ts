#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z, type ZodRawShape } from 'zod'
import { sb } from './supabase.js'
import { counts, richDocToText, textToRichDoc } from './richdoc.js'
import {
  itemProjectId,
  nextSortOrder,
  requireOwner,
  resolveProjectId,
  withOwner
} from './helpers.js'
import { EMBED_DIM, embedBatch, embedText, geminiKey, toVectorLiteral } from './embeddings.js'
import { chunkText, tokenEstimate } from './chunk.js'

const server = new McpServer({ name: 'wrighting', version: '0.2.0' })

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean }

function ok(data: unknown): ToolResult {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  return { content: [{ type: 'text', text }] }
}
function fail(msg: string): ToolResult {
  return { content: [{ type: 'text', text: `ERROR: ${msg}` }], isError: true }
}

function tool(
  name: string,
  description: string,
  shape: ZodRawShape,
  handler: (args: any) => Promise<unknown>
): void {
  server.registerTool(name, { description, inputSchema: shape }, async (args: any) => {
    try {
      return ok(await handler(args))
    } catch (e) {
      return fail((e as Error).message)
    }
  })
}

/** 모든 작품-범위 도구가 공유하는 작품 지정 입력 */
const proj = {
  projectId: z.string().optional().describe('작품 id (생략 시 project 제목/기본 프로젝트로 해석)'),
  project: z.string().optional().describe('작품 제목(부분 일치 허용)')
}
const SHEET_SUBTYPES = [
  'character',
  'event',
  'organization',
  'item',
  'place',
  'worldview',
  'other',
  'concept'
] as const

// ═══════════════════════════ 작품 & 매핑 ═══════════════════════════

tool('list_projects', '모든 작품(프로젝트) 목록을 반환한다.', {}, async () => {
  const { data, error } = await withOwner(
    sb.from('projects').select('id,title,created_at,updated_at').order('updated_at', {
      ascending: false
    }) as any
  )
  if (error) throw error
  return data
})

tool(
  'resolve_project',
  '현재 매핑될 작품을 확인한다. projectId/project 인자나 WRIGHTING_PROJECT(_ID) env, 또는 단일 작품 규칙으로 해석된 작품을 반환. MCP 작업 전 어떤 작품에 연결되는지 확인용.',
  { ...proj },
  async (args) => {
    const id = await resolveProjectId(args)
    const { data, error } = await sb.from('projects').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
)

tool(
  'create_project',
  '새 작품을 만들고 기본 폴더(캐릭터·문서·플롯·리서치 자료)·라벨·상태를 시드한다. WRIGHTING_OWNER_ID 필요. 생성된 작품을 반환.',
  { title: z.string().describe('작품 제목') },
  async ({ title }) => {
    const owner = requireOwner()
    const { data: projRow, error } = await sb
      .from('projects')
      .insert({ owner, title: title?.trim() || '제목 없는 작품' })
      .select('*')
      .single()
    if (error) throw error
    const pid = projRow.id

    // 기본 트리/라벨/상태 시드 (create_project RPC 와 동일)
    await sb.from('items').insert([
      { project_id: pid, type: 'folder', title: '캐릭터', icon: 'users', folder_view: 'grid', sort_order: 0 },
      { project_id: pid, type: 'folder', title: '문서', icon: 'folder', folder_view: 'grid', sort_order: 1 },
      { project_id: pid, type: 'folder', title: '플롯', icon: 'route', folder_view: 'list', sort_order: 2 },
      { project_id: pid, type: 'folder', title: '리서치 자료', icon: 'archive', folder_view: 'list', sort_order: 3 }
    ])
    await sb.from('labels').insert([
      { project_id: pid, name: '빨간색', color: '#cf6a6a', sort_order: 0 },
      { project_id: pid, name: '주황색', color: '#d6924a', sort_order: 1 },
      { project_id: pid, name: '노란색', color: '#d7b36a', sort_order: 2 },
      { project_id: pid, name: '초록색', color: '#5fae7a', sort_order: 3 },
      { project_id: pid, name: '파란색', color: '#5b8fd6', sort_order: 4 }
    ])
    await sb.from('statuses').insert([
      { project_id: pid, name: '구상', color: '#888888', sort_order: 0 },
      { project_id: pid, name: '초안', color: '#d6924a', sort_order: 1 },
      { project_id: pid, name: '검토', color: '#5b8fd6', sort_order: 2 },
      { project_id: pid, name: '완료됨', color: '#5fae7a', sort_order: 3 }
    ])
    return projRow
  }
)

// ═══════════════════════════ 바인더(항목) ═══════════════════════════

tool(
  'list_items',
  '한 작품의 바인더 트리 항목을 평면 목록으로 반환한다. parent_id 로 트리를 재구성.',
  {
    ...proj,
    type: z
      .enum(['folder', 'document', 'sheet', 'plotboard', 'canvas', 'notes'])
      .optional(),
    includeDeleted: z.boolean().optional().describe('휴지통 포함 (기본 false)')
  },
  async (args) => {
    const pid = await resolveProjectId(args)
    let q = sb
      .from('items')
      .select(
        'id,parent_id,type,sheet_subtype,title,synopsis,sort_order,status_id,label_id,deleted_at'
      )
      .eq('project_id', pid)
      .order('sort_order')
    if (!args.includeDeleted) q = q.is('deleted_at', null)
    if (args.type) q = q.eq('type', args.type)
    const { data, error } = await q
    if (error) throw error
    return data
  }
)

tool(
  'find_items',
  '제목으로 항목을 검색한다(부분 일치).',
  { ...proj, query: z.string() },
  async (args) => {
    const pid = await resolveProjectId(args)
    const { data, error } = await sb
      .from('items')
      .select('id,parent_id,type,sheet_subtype,title')
      .eq('project_id', pid)
      .is('deleted_at', null)
      .ilike('title', `%${args.query}%`)
      .limit(50)
    if (error) throw error
    return data
  }
)

tool(
  'get_item',
  '항목 메타 + 종류별 본문(document→텍스트, sheet→속성·본문, plotboard/canvas→노드·엣지, folder→하위 항목).',
  { itemId: z.string() },
  async ({ itemId }) => {
    const { data: item, error } = await sb.from('items').select('*').eq('id', itemId).single()
    if (error) throw error
    const out: Record<string, unknown> = { item }
    if (item.type === 'document' || item.type === 'notes') {
      const { data } = await sb.from('documents').select('*').eq('item_id', itemId).maybeSingle()
      out.content = data ? richDocToText(data.content) : ''
      out.char_count = data?.char_count ?? 0
    } else if (item.type === 'sheet') {
      const { data } = await sb.from('sheets').select('*').eq('item_id', itemId).maybeSingle()
      out.attributes = data?.attributes ?? {}
      out.tags = data?.tags ?? []
      out.body = data ? richDocToText(data.body) : ''
    } else if (item.type === 'plotboard' || item.type === 'canvas') {
      const { data: nodes } = await sb.from('board_nodes').select('*').eq('board_item_id', itemId)
      const { data: edges } = await sb.from('board_edges').select('*').eq('board_item_id', itemId)
      out.nodes = nodes ?? []
      out.edges = edges ?? []
    } else if (item.type === 'folder') {
      const { data: children } = await sb
        .from('items')
        .select('id,type,title,sort_order')
        .eq('parent_id', itemId)
        .is('deleted_at', null)
        .order('sort_order')
      out.children = children ?? []
    }
    return out
  }
)

tool(
  'create_folder',
  '새 폴더를 만든다.',
  { ...proj, title: z.string(), parentId: z.string().optional() },
  async (args) => {
    const pid = await resolveProjectId(args)
    const sort = await nextSortOrder(pid, args.parentId ?? null)
    const { data, error } = await sb
      .from('items')
      .insert({
        project_id: pid,
        parent_id: args.parentId ?? null,
        type: 'folder',
        title: args.title,
        sort_order: sort
      })
      .select('id')
      .single()
    if (error) throw error
    return { itemId: data.id }
  }
)

tool(
  'create_document',
  '새 문서를 만든다. 본문은 평문/간이 마크다운(#·##·###). 생성된 item id 반환.',
  {
    ...proj,
    title: z.string(),
    text: z.string().optional(),
    parentId: z.string().optional().describe('상위 폴더 item id')
  },
  async (args) => {
    const pid = await resolveProjectId(args)
    const sort = await nextSortOrder(pid, args.parentId ?? null)
    const { data: item, error } = await sb
      .from('items')
      .insert({
        project_id: pid,
        parent_id: args.parentId ?? null,
        type: 'document',
        title: args.title,
        sort_order: sort
      })
      .select('id')
      .single()
    if (error) throw error
    const body = args.text ?? ''
    const { char_count, word_count } = counts(body)
    const { error: dErr } = await sb.from('documents').insert({
      item_id: item.id,
      project_id: pid,
      content: textToRichDoc(body),
      text_plain: body,
      word_count,
      char_count
    })
    if (dErr) throw dErr
    return { itemId: item.id, char_count }
  }
)

tool(
  'create_sheet',
  '새 시트(캐릭터·장소·조직·아이템·세계관·이벤트 등)를 만든다. subtype 으로 종류 지정, attributes(키-값)·tags·본문을 함께 넣을 수 있다.',
  {
    ...proj,
    title: z.string(),
    subtype: z.enum(SHEET_SUBTYPES).describe('시트 종류'),
    parentId: z.string().optional(),
    attributes: z.record(z.string()).optional().describe('속성 키-값'),
    tags: z.array(z.string()).optional(),
    bodyText: z.string().optional(),
    synopsis: z.string().optional().describe('한 줄 요약')
  },
  async (args) => {
    const pid = await resolveProjectId(args)
    const sort = await nextSortOrder(pid, args.parentId ?? null)
    const { data: item, error } = await sb
      .from('items')
      .insert({
        project_id: pid,
        parent_id: args.parentId ?? null,
        type: 'sheet',
        sheet_subtype: args.subtype,
        title: args.title,
        synopsis: args.synopsis ?? null,
        sort_order: sort
      })
      .select('id')
      .single()
    if (error) throw error
    const { error: sErr } = await sb.from('sheets').insert({
      item_id: item.id,
      project_id: pid,
      attributes: args.attributes ?? {},
      tags: args.tags ?? [],
      body: args.bodyText != null ? textToRichDoc(args.bodyText) : null
    })
    if (sErr) throw sErr
    return { itemId: item.id }
  }
)

tool(
  'create_plotboard',
  '새 플롯보드를 만든다. 생성 후 create_board_node/create_board_edge 로 노드·엣지를 추가한다.',
  {
    ...proj,
    title: z.string(),
    parentId: z.string().optional().describe('상위 폴더 item id')
  },
  async (args) => {
    const pid = await resolveProjectId(args)
    const sort = await nextSortOrder(pid, args.parentId ?? null)
    const { data, error } = await sb
      .from('items')
      .insert({
        project_id: pid,
        parent_id: args.parentId ?? null,
        type: 'plotboard',
        title: args.title,
        sort_order: sort
      })
      .select('id')
      .single()
    if (error) throw error
    return { itemId: data.id }
  }
)

tool(
  'create_canvas',
  '새 캔버스를 만든다. 생성 후 create_board_node/create_board_edge 로 카드·도형·파일참조·엣지를 추가한다.',
  {
    ...proj,
    title: z.string(),
    parentId: z.string().optional().describe('상위 폴더 item id')
  },
  async (args) => {
    const pid = await resolveProjectId(args)
    const sort = await nextSortOrder(pid, args.parentId ?? null)
    const { data, error } = await sb
      .from('items')
      .insert({
        project_id: pid,
        parent_id: args.parentId ?? null,
        type: 'canvas',
        title: args.title,
        sort_order: sort
      })
      .select('id')
      .single()
    if (error) throw error
    return { itemId: data.id }
  }
)

tool(
  'update_item',
  '항목 메타데이터를 수정한다(제목·요약·상위폴더 이동·상태·라벨·아이콘·정렬). 전달한 필드만 변경.',
  {
    itemId: z.string(),
    title: z.string().optional(),
    synopsis: z.string().optional(),
    parentId: z.string().nullable().optional().describe('이동할 상위 폴더(루트는 null)'),
    statusId: z.string().nullable().optional(),
    labelId: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    sortOrder: z.number().optional()
  },
  async (args) => {
    const patch: Record<string, unknown> = {}
    if (args.title !== undefined) patch.title = args.title
    if (args.synopsis !== undefined) patch.synopsis = args.synopsis
    if (args.parentId !== undefined) patch.parent_id = args.parentId
    if (args.statusId !== undefined) patch.status_id = args.statusId
    if (args.labelId !== undefined) patch.label_id = args.labelId
    if (args.icon !== undefined) patch.icon = args.icon
    if (args.sortOrder !== undefined) patch.sort_order = args.sortOrder
    if (Object.keys(patch).length === 0) return { itemId: args.itemId, changed: false }
    const { error } = await sb.from('items').update(patch).eq('id', args.itemId)
    if (error) throw error
    return { itemId: args.itemId, changed: true }
  }
)

tool(
  'delete_item',
  '항목을 휴지통으로 보낸다(soft delete). hard=true 면 영구 삭제(하위·본문 cascade).',
  { itemId: z.string(), hard: z.boolean().optional() },
  async ({ itemId, hard }) => {
    if (hard) {
      const { error } = await sb.from('items').delete().eq('id', itemId)
      if (error) throw error
      return { itemId, deleted: 'hard' }
    }
    const { error } = await sb
      .from('items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', itemId)
    if (error) throw error
    return { itemId, deleted: 'trash' }
  }
)

tool(
  'restore_item',
  '휴지통의 항목을 복원한다.',
  { itemId: z.string() },
  async ({ itemId }) => {
    const { error } = await sb.from('items').update({ deleted_at: null }).eq('id', itemId)
    if (error) throw error
    return { itemId, restored: true }
  }
)

// ═══════════════════════════ 본문(문서·시트) ═══════════════════════════

tool(
  'get_document',
  '문서(document/notes) 본문을 평문으로 반환.',
  { itemId: z.string() },
  async ({ itemId }) => {
    const { data, error } = await sb.from('documents').select('*').eq('item_id', itemId).single()
    if (error) throw error
    return {
      text: richDocToText(data.content),
      char_count: data.char_count,
      word_count: data.word_count,
      updated_at: data.updated_at
    }
  }
)

tool(
  'update_document',
  '문서 본문을 통째로 교체한다(평문/마크다운). 전체 대치이므로 주의.',
  { itemId: z.string(), text: z.string() },
  async ({ itemId, text }) => {
    const pid = await itemProjectId(itemId)
    const { char_count, word_count } = counts(text)
    const { error } = await sb.from('documents').upsert(
      {
        item_id: itemId,
        project_id: pid,
        content: textToRichDoc(text),
        text_plain: text,
        word_count,
        char_count
      },
      { onConflict: 'item_id' }
    )
    if (error) throw error
    return { itemId, char_count }
  }
)

tool(
  'get_sheet',
  '시트 속성·태그·본문 반환.',
  { itemId: z.string() },
  async ({ itemId }) => {
    const { data, error } = await sb.from('sheets').select('*').eq('item_id', itemId).single()
    if (error) throw error
    return { attributes: data.attributes, tags: data.tags, body: richDocToText(data.body) }
  }
)

tool(
  'update_sheet',
  '시트 속성·태그·본문을 갱신한다. 전달한 필드만 변경(나머지 유지).',
  {
    itemId: z.string(),
    attributes: z.record(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    bodyText: z.string().optional()
  },
  async ({ itemId, attributes, tags, bodyText }) => {
    const pid = await itemProjectId(itemId)
    const { data: cur } = await sb.from('sheets').select('*').eq('item_id', itemId).maybeSingle()
    const { error } = await sb.from('sheets').upsert(
      {
        item_id: itemId,
        project_id: pid,
        attributes: attributes ?? cur?.attributes ?? {},
        tags: tags ?? cur?.tags ?? [],
        body: bodyText != null ? textToRichDoc(bodyText) : (cur?.body ?? null)
      },
      { onConflict: 'item_id' }
    )
    if (error) throw error
    return { itemId, ok: true }
  }
)

// ═══════════════════════════ 복선(foreshadow) ═══════════════════════════

tool(
  'list_foreshadow',
  '복선 원장(코드·내용·회수시점·상태)을 반환.',
  { ...proj },
  async (args) => {
    const pid = await resolveProjectId(args)
    const { data, error } = await sb.from('foreshadow').select('*').eq('project_id', pid)
    if (error) throw error
    return data
  }
)

tool(
  'create_foreshadow',
  '복선 원장 항목을 추가한다. itemId로 특정 항목(인물·사물 등)에 귀속시킬 수 있다.',
  {
    ...proj,
    code: z.string().describe('복선 코드(예: F-01)'),
    content: z.string().optional(),
    revealAt: z.string().optional().describe('회수 예정(회차 등 자유 텍스트)'),
    status: z.enum(['hidden', 'hinted', 'paid']).optional(),
    itemId: z.string().optional().describe('귀속 항목 ID — 복선이 특정 인물·사물과 연결될 때')
  },
  async (args) => {
    const pid = await resolveProjectId(args)
    const { data, error } = await sb
      .from('foreshadow')
      .insert({
        project_id: pid,
        code: args.code,
        content: args.content ?? null,
        reveal_at: args.revealAt ?? null,
        status: args.status ?? 'hidden',
        item_id: args.itemId ?? null
      })
      .select('*')
      .single()
    if (error) throw error
    return data
  }
)

tool(
  'update_foreshadow',
  '복선 항목을 수정한다(전달 필드만). itemId로 귀속 항목을 설정/해제(null)할 수 있다.',
  {
    id: z.string(),
    code: z.string().optional(),
    content: z.string().nullable().optional(),
    revealAt: z.string().nullable().optional(),
    status: z.enum(['hidden', 'hinted', 'paid']).optional(),
    itemId: z.string().nullable().optional().describe('귀속 항목 ID. null이면 귀속 해제')
  },
  async (args) => {
    const patch: Record<string, unknown> = {}
    if (args.code !== undefined) patch.code = args.code
    if (args.content !== undefined) patch.content = args.content
    if (args.revealAt !== undefined) patch.reveal_at = args.revealAt
    if (args.status !== undefined) patch.status = args.status
    if (args.itemId !== undefined) patch.item_id = args.itemId
    const { error } = await sb.from('foreshadow').update(patch).eq('id', args.id)
    if (error) throw error
    return { id: args.id, changed: true }
  }
)

tool('delete_foreshadow', '복선 항목을 삭제한다.', { id: z.string() }, async ({ id }) => {
  const { error } = await sb.from('foreshadow').delete().eq('id', id)
  if (error) throw error
  return { id, deleted: true }
})

// ═══════════════════════════ 링크(관계·복선) ═══════════════════════════

tool(
  'list_links',
  '작품 내 항목 간 링크(관계·백링크·복선 plant/payoff)를 반환.',
  { ...proj },
  async (args) => {
    const pid = await resolveProjectId(args)
    const { data, error } = await sb.from('links').select('*').eq('project_id', pid)
    if (error) throw error
    return data
  }
)

tool(
  'create_link',
  '두 항목 사이에 링크를 만든다. rel: relation(일반)·causes(인과)·precedes(시간선후)·opposes(대립)·allies(협력)·transforms(변화계기)·symbolizes(상징)·plant(복선심기)·payoff(복선회수)·ref(멘션,auto)·parent(계층,auto).',
  {
    ...proj,
    fromItem: z.string(),
    toItem: z.string(),
    rel: z
      .enum([
        'relation',
        'causes',
        'precedes',
        'opposes',
        'allies',
        'transforms',
        'symbolizes',
        'plant',
        'payoff',
        'ref',
        'parent'
      ])
      .optional(),
    label: z.string().optional()
  },
  async (args) => {
    const pid = await resolveProjectId(args)
    const { data, error } = await sb
      .from('links')
      .insert({
        project_id: pid,
        from_item: args.fromItem,
        to_item: args.toItem,
        rel: args.rel ?? 'relation',
        label: args.label ?? null
      })
      .select('*')
      .single()
    if (error) throw error
    return data
  }
)

tool('delete_link', '링크를 삭제한다.', { id: z.string() }, async ({ id }) => {
  const { error } = await sb.from('links').delete().eq('id', id)
  if (error) throw error
  return { id, deleted: true }
})

// ═══════════════════════════ 라벨·상태 ═══════════════════════════

tool('list_labels', '작품의 라벨(색상 태그) 목록.', { ...proj }, async (args) => {
  const pid = await resolveProjectId(args)
  const { data, error } = await sb.from('labels').select('*').eq('project_id', pid).order('sort_order')
  if (error) throw error
  return data
})

tool('list_statuses', '작품의 상태(구상·초안 등) 목록.', { ...proj }, async (args) => {
  const pid = await resolveProjectId(args)
  const { data, error } = await sb
    .from('statuses')
    .select('*')
    .eq('project_id', pid)
    .order('sort_order')
  if (error) throw error
  return data
})

tool(
  'create_status',
  '새 상태를 추가한다.',
  { ...proj, name: z.string(), color: z.string().optional() },
  async (args) => {
    const pid = await resolveProjectId(args)
    const { data, error } = await sb
      .from('statuses')
      .insert({ project_id: pid, name: args.name, color: args.color ?? '#888888' })
      .select('*')
      .single()
    if (error) throw error
    return data
  }
)

tool(
  'create_label',
  '새 라벨을 추가한다.',
  { ...proj, name: z.string(), color: z.string().optional() },
  async (args) => {
    const pid = await resolveProjectId(args)
    const { data, error } = await sb
      .from('labels')
      .insert({ project_id: pid, name: args.name, color: args.color ?? '#888888' })
      .select('*')
      .single()
    if (error) throw error
    return data
  }
)

// ═══════════════════════════ 플롯보드 ═══════════════════════════

tool(
  'create_board_node',
  '플롯보드/캔버스에 노드를 추가한다. boardItemId 는 plotboard/canvas 항목 id. 플롯보드 파트 카드(kind=card)는 colId(소속 막 그룹 노드 id)·ord·tags·docIds·mentionIds 사용.',
  {
    boardItemId: z.string(),
    kind: z.enum(['card', 'group', 'ref', 'shape']).optional(),
    title: z.string().optional(),
    body: z.string().optional().describe('설명'),
    color: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    refItemId: z.string().optional().describe('kind=ref 일 때 참조 항목'),
    colId: z.string().optional().describe('(플롯보드) 소속 막(group 노드) id'),
    ord: z.number().optional().describe('(플롯보드) 컬럼 내 순서'),
    tags: z.array(z.string()).optional().describe('태그 목록'),
    docIds: z.array(z.string()).optional().describe('연결된 문서 item id 목록'),
    mentionIds: z.array(z.string()).optional().describe('언급된 항목(시트 등) id 목록')
  },
  async (args) => {
    const pid = await itemProjectId(args.boardItemId)
    const { data, error } = await sb
      .from('board_nodes')
      .insert({
        board_item_id: args.boardItemId,
        project_id: pid,
        kind: args.kind ?? 'card',
        title: args.title ?? null,
        body: args.body ?? null,
        color: args.color ?? null,
        x: args.x ?? 0,
        y: args.y ?? 0,
        ref_item_id: args.refItemId ?? null,
        col_id: args.colId ?? null,
        ord: args.ord ?? 0,
        tags: args.tags ?? [],
        doc_ids: args.docIds ?? [],
        mention_ids: args.mentionIds ?? []
      })
      .select('*')
      .single()
    if (error) throw error
    return data
  }
)

tool(
  'update_board_node',
  '플롯보드 노드를 수정한다(전달 필드만). 파트 카드는 colId·ord·tags·docIds·mentionIds 사용 가능.',
  {
    id: z.string(),
    title: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    colId: z.string().nullable().optional().describe('(플롯보드) 소속 막 이동'),
    ord: z.number().optional().describe('(플롯보드) 컬럼 내 순서'),
    tags: z.array(z.string()).optional(),
    docIds: z.array(z.string()).optional(),
    mentionIds: z.array(z.string()).optional()
  },
  async (args) => {
    const patch: Record<string, unknown> = {}
    if (args.title !== undefined) patch.title = args.title
    if (args.body !== undefined) patch.body = args.body
    if (args.color !== undefined) patch.color = args.color
    if (args.x !== undefined) patch.x = args.x
    if (args.y !== undefined) patch.y = args.y
    if (args.colId !== undefined) patch.col_id = args.colId
    if (args.ord !== undefined) patch.ord = args.ord
    if (args.tags !== undefined) patch.tags = args.tags
    if (args.docIds !== undefined) patch.doc_ids = args.docIds
    if (args.mentionIds !== undefined) patch.mention_ids = args.mentionIds
    const { error } = await sb.from('board_nodes').update(patch).eq('id', args.id)
    if (error) throw error
    return { id: args.id, changed: true }
  }
)

tool('delete_board_node', '플롯보드 노드를 삭제한다.', { id: z.string() }, async ({ id }) => {
  const { error } = await sb.from('board_nodes').delete().eq('id', id)
  if (error) throw error
  return { id, deleted: true }
})

tool(
  'create_board_edge',
  '플롯보드 노드 사이에 연결선을 만든다.',
  {
    boardItemId: z.string(),
    source: z.string().describe('출발 노드 id'),
    target: z.string().describe('도착 노드 id'),
    label: z.string().optional()
  },
  async (args) => {
    const pid = await itemProjectId(args.boardItemId)
    const { data, error } = await sb
      .from('board_edges')
      .insert({
        board_item_id: args.boardItemId,
        project_id: pid,
        source: args.source,
        target: args.target,
        label: args.label ?? null
      })
      .select('*')
      .single()
    if (error) throw error
    return data
  }
)

tool('delete_board_edge', '플롯보드 연결선을 삭제한다.', { id: z.string() }, async ({ id }) => {
  const { error } = await sb.from('board_edges').delete().eq('id', id)
  if (error) throw error
  return { id, deleted: true }
})

// ═══════════════════════════ 하네스 ═══════════════════════════

tool(
  'get_harness',
  '작품의 실효 하네스를 반환한다: CLAUDE.md(메인 지침) + 에이전트 + 스킬. 공용과 작품 전용을 병합하되 같은 이름은 작품 전용이 공용을 덮어쓴다.',
  { ...proj },
  async (args) => {
    const projectId = await resolveProjectId(args)
    const orFilter = `project_id.is.null,project_id.eq.${projectId}`
    const [{ data: agents }, { data: skills }, { data: docs }] = await Promise.all([
      withOwner(sb.from('harness_agents').select('*').or(orFilter) as any),
      withOwner(sb.from('harness_skills').select('*').or(orFilter) as any),
      withOwner(sb.from('harness_docs').select('*').or(orFilter) as any)
    ])
    const mergeByName = (rows: any[]): any[] => {
      const m = new Map<string, any>()
      for (const r of (rows ?? []).filter((x) => x.project_id === null)) m.set(r.name, r)
      for (const r of (rows ?? []).filter((x) => x.project_id !== null)) m.set(r.name, r)
      return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
    }
    const claudeMd =
      (docs ?? []).find((d: any) => d.project_id === projectId) ??
      (docs ?? []).find((d: any) => d.project_id === null) ??
      null
    return {
      claudeMd: claudeMd?.body ?? null,
      agents: mergeByName(agents ?? []).map((a) => ({
        name: a.name,
        description: a.description,
        model: a.model,
        body: a.body
      })),
      skills: mergeByName(skills ?? []).map((s) => ({
        name: s.name,
        description: s.description,
        body: s.body
      }))
    }
  }
)

// ═══════════════════════════ 지식 그래프·검색 ═══════════════════════════

interface Ref {
  id: string
  title: string
  type: string
  subtype?: string | null
}
function toRef(i: any): Ref {
  return { id: i.id, title: i.title, type: i.type, subtype: i.sheet_subtype }
}

/** 여러 item id 를 EntityRef 로 일괄 해석(살아있는 항목만, 작품 범위) */
async function resolveRefs(pid: string, ids: string[]): Promise<Map<string, Ref>> {
  const uniq = [...new Set(ids)].filter(Boolean)
  if (!uniq.length) return new Map()
  const { data } = await sb
    .from('items')
    .select('id,title,type,sheet_subtype')
    .eq('project_id', pid)
    .is('deleted_at', null)
    .in('id', uniq)
  return new Map(((data ?? []) as any[]).map((i) => [i.id, toRef(i)]))
}

/** 항목의 관계(트리플)를 방향·rel 필터로 조회하고 상대 항목을 EntityRef 로 해석 */
async function relationsOf(
  pid: string,
  itemId: string,
  direction: 'out' | 'in' | 'both',
  rel?: string
) {
  const out: any[] = []
  const inc: any[] = []
  if (direction !== 'in') {
    let q = sb.from('links').select('*').eq('project_id', pid).eq('from_item', itemId)
    if (rel) q = q.eq('rel', rel)
    out.push(...(((await q).data as any[]) ?? []))
  }
  if (direction !== 'out') {
    let q = sb.from('links').select('*').eq('project_id', pid).eq('to_item', itemId)
    if (rel) q = q.eq('rel', rel)
    inc.push(...(((await q).data as any[]) ?? []))
  }
  const refs = await resolveRefs(pid, [
    ...out.map((l) => l.to_item),
    ...inc.map((l) => l.from_item)
  ])
  const edge = (l: any, dir: 'out' | 'in', otherId: string) => ({
    rel: l.rel,
    label: l.label,
    auto: l.auto,
    direction: dir,
    other: refs.get(otherId) ?? { id: otherId, title: '(삭제됨)', type: 'unknown' }
  })
  return [
    ...out.map((l) => edge(l, 'out', l.to_item)),
    ...inc.map((l) => edge(l, 'in', l.from_item))
  ]
}

tool(
  'list_by_subtype',
  '특정 시트 하위종류(character/place/organization 등)의 항목만 경량 참조로 반환.',
  { ...proj, subtype: z.enum(SHEET_SUBTYPES), limit: z.number().optional() },
  async (args) => {
    const pid = await resolveProjectId(args)
    const { data, error } = await sb
      .from('items')
      .select('id,title,type,sheet_subtype')
      .eq('project_id', pid)
      .eq('type', 'sheet')
      .eq('sheet_subtype', args.subtype)
      .is('deleted_at', null)
      .order('sort_order')
      .limit(args.limit ?? 100)
    if (error) throw error
    return (data as any[]).map(toRef)
  }
)

tool(
  'search_sheets',
  '시트를 하위종류·태그·제목으로 검색한다.',
  {
    ...proj,
    subtype: z.enum(SHEET_SUBTYPES).optional(),
    tag: z.string().optional(),
    query: z.string().optional().describe('제목 부분 일치'),
    limit: z.number().optional()
  },
  async (args) => {
    const pid = await resolveProjectId(args)
    let ids: string[] | null = null
    if (args.tag) {
      const { data: sheets } = await sb
        .from('sheets')
        .select('item_id')
        .eq('project_id', pid)
        .contains('tags', [args.tag])
      ids = ((sheets ?? []) as any[]).map((s) => s.item_id)
      if (!ids.length) return []
    }
    let q = sb
      .from('items')
      .select('id,title,type,sheet_subtype')
      .eq('project_id', pid)
      .eq('type', 'sheet')
      .is('deleted_at', null)
      .limit(args.limit ?? 50)
    if (args.subtype) q = q.eq('sheet_subtype', args.subtype)
    if (args.query) q = q.ilike('title', `%${args.query}%`)
    if (ids) q = q.in('id', ids)
    const { data, error } = await q
    if (error) throw error
    return (data as any[]).map(toRef)
  }
)

tool(
  'get_relations',
  '항목의 관계(트리플)를 반환. direction(out/in/both)·rel 필터. rel: relation·causes·precedes·opposes·allies·transforms·symbolizes·plant·payoff·ref·parent. 상대 항목은 {id,title,type,subtype}로 해석.',
  {
    itemId: z.string(),
    direction: z.enum(['out', 'in', 'both']).optional(),
    rel: z
      .enum([
        'relation',
        'causes',
        'precedes',
        'opposes',
        'allies',
        'transforms',
        'symbolizes',
        'plant',
        'payoff',
        'ref',
        'parent'
      ])
      .optional()
  },
  async ({ itemId, direction, rel }) => {
    const pid = await itemProjectId(itemId)
    return relationsOf(pid, itemId, direction ?? 'both', rel)
  }
)

tool(
  'get_backlinks',
  '이 항목을 가리키는 들어오는 링크. 특히 type=document 인 상대는 "이 개체가 등장하는 문서".',
  { itemId: z.string() },
  async ({ itemId }) => {
    const pid = await itemProjectId(itemId)
    const rels = await relationsOf(pid, itemId, 'in')
    return {
      all: rels,
      appears_in_documents: rels.filter((r) => r.other.type === 'document')
    }
  }
)

tool(
  'traverse',
  '관계 그래프를 BFS 로 탐색해 인접 노드·엣지를 반환(깊이·노드 수 제한).',
  {
    itemId: z.string(),
    depth: z.number().optional().describe('기본 2, 최대 4'),
    rel: z
      .enum([
        'relation',
        'causes',
        'precedes',
        'opposes',
        'allies',
        'transforms',
        'symbolizes',
        'plant',
        'payoff',
        'ref',
        'parent'
      ])
      .optional(),
    maxNodes: z.number().optional().describe('기본 50')
  },
  async ({ itemId, depth, rel, maxNodes }) => {
    const pid = await itemProjectId(itemId)
    const maxN = maxNodes ?? 50
    const maxD = Math.min(depth ?? 2, 4)
    const visited = new Set<string>([itemId])
    const nodes = new Map<string, Ref>()
    const edges: unknown[] = []
    let frontier = [itemId]
    for (let d = 0; d < maxD && visited.size < maxN; d++) {
      const next: string[] = []
      for (const id of frontier) {
        const rels = await relationsOf(pid, id, 'both', rel)
        for (const e of rels) {
          edges.push({ from: id, ...e })
          if (!visited.has(e.other.id) && visited.size < maxN) {
            visited.add(e.other.id)
            nodes.set(e.other.id, e.other as Ref)
            next.push(e.other.id)
          }
        }
      }
      frontier = next
    }
    return { nodes: [...nodes.values()], edges }
  }
)

async function keywordSearch(pid: string, query: string, lim: number) {
  const like = `%${query}%`
  const { data: titleHits } = await sb
    .from('items')
    .select('id,title,type,sheet_subtype,synopsis')
    .eq('project_id', pid)
    .is('deleted_at', null)
    .ilike('title', like)
    .limit(lim)
  const { data: docHits } = await sb
    .from('documents')
    .select('item_id,text_plain')
    .eq('project_id', pid)
    .ilike('text_plain', like)
    .limit(lim)
  const docRefs = await resolveRefs(pid, ((docHits ?? []) as any[]).map((d) => d.item_id))
  const results: { ref: Ref; snippet: string; via: string }[] = []
  for (const i of (titleHits ?? []) as any[])
    results.push({ ref: toRef(i), snippet: i.synopsis ?? i.title, via: 'title' })
  for (const d of (docHits ?? []) as any[]) {
    const ref = docRefs.get(d.item_id)
    if (!ref || results.some((r) => r.ref.id === ref.id)) continue
    const idx = (d.text_plain as string).toLowerCase().indexOf(query.toLowerCase())
    const start = Math.max(0, idx - 60)
    results.push({ ref, snippet: (d.text_plain as string).slice(start, start + 160).trim(), via: 'body' })
  }
  return results.slice(0, lim)
}

async function semanticSearch(pid: string, query: string, lim: number) {
  const qv = await embedText(query, 'RETRIEVAL_QUERY')
  const { data, error } = await sb.rpc('match_doc_chunks', {
    query_embedding: toVectorLiteral(qv),
    p_project_id: pid,
    match_count: lim
  })
  if (error) throw error
  const rows = (data ?? []) as any[]
  const refs = await resolveRefs(pid, rows.map((r) => r.item_id))
  return rows.map((r) => ({
    ref: refs.get(r.item_id) ?? { id: r.item_id, title: '(삭제됨)', type: 'unknown' },
    similarity: Number(Number(r.similarity).toFixed(3)),
    snippet: (r.content as string).slice(0, 220)
  }))
}

tool(
  'search',
  '작품 본문 검색. mode=semantic(임베딩 의미검색, reindex 선행 필요)·keyword(제목·평문 ILIKE)·auto(의미검색 시도 후 결과 없으면 키워드). GEMINI_API_KEY 없으면 키워드로 동작.',
  {
    ...proj,
    query: z.string(),
    limit: z.number().optional(),
    mode: z.enum(['auto', 'semantic', 'keyword']).optional()
  },
  async (args) => {
    const pid = await resolveProjectId(args)
    const lim = args.limit ?? 30
    const mode = args.mode ?? 'auto'
    const canSemantic = !!geminiKey()
    if (mode !== 'keyword' && canSemantic) {
      try {
        const results = await semanticSearch(pid, args.query, lim)
        if (results.length || mode === 'semantic') return { mode: 'semantic', results }
      } catch (e) {
        if (mode === 'semantic') throw e
        // auto: 의미검색 실패 시 키워드로 폴백
      }
    } else if (mode === 'semantic' && !canSemantic) {
      throw new Error('GEMINI_API_KEY 가 없어 의미검색을 쓸 수 없습니다. keyword 모드를 쓰세요.')
    }
    return { mode: 'keyword', results: await keywordSearch(pid, args.query, lim) }
  }
)

tool(
  'reindex',
  '작품의 문서·시트 본문을 청크로 쪼개 Gemini 임베딩을 (재)생성한다. semantic search 전에 1회 실행. itemId 지정 시 해당 항목만 재색인.',
  {
    ...proj,
    scope: z.enum(['documents', 'sheets', 'all']).optional().describe('기본 all'),
    itemId: z.string().optional().describe('이 항목만 재색인')
  },
  async (args) => {
    if (!geminiKey()) throw new Error('GEMINI_API_KEY 가 필요합니다(.env 확인).')
    const pid = await resolveProjectId(args)
    const scope = args.scope ?? 'all'
    const raw: { item_id: string; text: string }[] = []

    const flattenAttrs = (a: Record<string, string> | null | undefined): string =>
      a ? Object.entries(a).map(([k, v]) => `${k}: ${v}`).join('\n') : ''

    if (args.itemId) {
      const { data: it } = await sb.from('items').select('id,type').eq('id', args.itemId).single()
      if (it?.type === 'document' || it?.type === 'notes') {
        const { data } = await sb.from('documents').select('text_plain').eq('item_id', args.itemId).maybeSingle()
        if (data?.text_plain?.trim()) raw.push({ item_id: args.itemId, text: data.text_plain })
      } else if (it?.type === 'sheet') {
        const { data } = await sb.from('sheets').select('attributes,body').eq('item_id', args.itemId).maybeSingle()
        const text = `${flattenAttrs(data?.attributes)}\n\n${richDocToText(data?.body)}`.trim()
        if (text) raw.push({ item_id: args.itemId, text })
      }
    } else {
      if (scope !== 'sheets') {
        const { data: docs } = await sb.from('documents').select('item_id,text_plain').eq('project_id', pid)
        for (const d of (docs ?? []) as any[])
          if (d.text_plain?.trim()) raw.push({ item_id: d.item_id, text: d.text_plain })
      }
      if (scope !== 'documents') {
        const { data: sheets } = await sb.from('sheets').select('item_id,attributes,body').eq('project_id', pid)
        for (const s of (sheets ?? []) as any[]) {
          const text = `${flattenAttrs(s.attributes)}\n\n${richDocToText(s.body)}`.trim()
          if (text) raw.push({ item_id: s.item_id, text })
        }
      }
    }

    // 제목을 앞에 붙여 의미 기반 grounding 강화
    const titles = await resolveRefs(pid, raw.map((r) => r.item_id))
    let itemsIndexed = 0
    let chunksTotal = 0
    for (const r of raw) {
      const title = titles.get(r.item_id)?.title ?? ''
      const chunks = chunkText(`[${title}]\n${r.text}`)
      await sb.from('doc_chunks').delete().eq('item_id', r.item_id)
      if (!chunks.length) continue
      const vecs = await embedBatch(chunks, 'RETRIEVAL_DOCUMENT')
      const rows = chunks.map((content, i) => ({
        project_id: pid,
        item_id: r.item_id,
        chunk_index: i,
        content,
        embedding: toVectorLiteral(vecs[i]),
        token_estimate: tokenEstimate(content)
      }))
      const { error } = await sb.from('doc_chunks').insert(rows)
      if (error) throw error
      itemsIndexed++
      chunksTotal += rows.length
    }
    return { itemsIndexed, chunksTotal, scope, embedDim: EMBED_DIM }
  }
)

tool(
  'get_entity_context',
  '집필에 필요한 한 항목의 지식을 1콜로 묶음: 시트 속성 + 관계 + 등장 문서 + 연관 시트. 인물/설정 일관성 확인에 최적.',
  { itemId: z.string() },
  async ({ itemId }) => {
    const { data: item, error } = await sb.from('items').select('*').eq('id', itemId).single()
    if (error) throw error
    const pid = item.project_id as string
    let sheet: { attributes: unknown; tags: unknown; body: string } | null = null
    if (item.type === 'sheet') {
      const { data } = await sb.from('sheets').select('*').eq('item_id', itemId).maybeSingle()
      if (data)
        sheet = { attributes: data.attributes, tags: data.tags, body: richDocToText(data.body) }
    }
    const rels = await relationsOf(pid, itemId, 'both')
    return {
      item: toRef(item),
      synopsis: item.synopsis,
      sheet,
      relations: rels,
      appears_in: rels
        .filter((r) => r.direction === 'in' && r.other.type === 'document')
        .map((r) => r.other),
      related_sheets: rels
        .filter((r) => r.other.type === 'sheet')
        .map((r) => ({ rel: r.rel, label: r.label, ...r.other }))
    }
  }
)

// ═══════════════════════════ 부팅 ═══════════════════════════

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('wrighting-mcp 서버 시작 (stdio)')
}

main().catch((e) => {
  console.error('wrighting-mcp 시작 실패:', e)
  process.exit(1)
})
