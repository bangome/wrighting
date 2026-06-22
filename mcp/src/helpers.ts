import { OWNER, sb } from './supabase.js'

/** owner 컬럼이 있는 쿼리에 OWNER 한정을 선택적으로 적용 */
export function withOwner<T extends { eq: (c: string, v: string) => T }>(q: T): T {
  return OWNER ? q.eq('owner', OWNER) : q
}

/** owner 가 필요한 작업(작품·공용 하네스 생성)에서 강제 */
export function requireOwner(): string {
  if (!OWNER) {
    throw new Error(
      'WRIGHTING_OWNER_ID 환경변수가 필요합니다(작품/공용 데이터 생성 시 소유자 지정). .env 에 설정하세요.'
    )
  }
  return OWNER
}

const DEFAULT_PROJECT_ID = process.env.WRIGHTING_PROJECT_ID || null
const DEFAULT_PROJECT_TITLE = process.env.WRIGHTING_PROJECT || null

interface ProjRef {
  projectId?: string
  project?: string
}

async function lookupByTitle(title: string): Promise<string> {
  // 정확히 일치 우선, 없으면 부분 일치
  const exact = await withOwner(sb.from('projects').select('id,title').eq('title', title) as any)
  let rows = (exact.data ?? []) as { id: string; title: string }[]
  if (rows.length === 0) {
    const like = await withOwner(
      sb.from('projects').select('id,title').ilike('title', `%${title}%`) as any
    )
    rows = (like.data ?? []) as { id: string; title: string }[]
  }
  if (rows.length === 1) return rows[0].id
  if (rows.length === 0) throw new Error(`'${title}' 과(와) 일치하는 작품이 없습니다.`)
  throw new Error(
    `'${title}' 에 여러 작품이 일치합니다: ${rows.map((r) => `${r.title}(${r.id})`).join(', ')}. projectId 로 지정하세요.`
  )
}

/**
 * 작품 매핑 해석. 우선순위:
 * 1) 인자 projectId  2) 인자 project(제목)  3) env WRIGHTING_PROJECT_ID
 * 4) env WRIGHTING_PROJECT(제목)  5) 작품이 하나뿐이면 그것  6) 실패(목록 안내)
 */
export async function resolveProjectId(args: ProjRef): Promise<string> {
  if (args.projectId) return args.projectId
  if (args.project) return lookupByTitle(args.project)
  if (DEFAULT_PROJECT_ID) return DEFAULT_PROJECT_ID
  if (DEFAULT_PROJECT_TITLE) return lookupByTitle(DEFAULT_PROJECT_TITLE)

  const { data } = await withOwner(sb.from('projects').select('id,title') as any)
  const rows = (data ?? []) as { id: string; title: string }[]
  if (rows.length === 1) return rows[0].id
  if (rows.length === 0) throw new Error('작품이 없습니다. create_project 로 먼저 생성하세요.')
  throw new Error(
    `여러 작품이 있습니다. projectId 또는 project 를 지정하거나 WRIGHTING_PROJECT(_ID) env 를 설정하세요: ${rows
      .map((r) => `${r.title}(${r.id})`)
      .join(', ')}`
  )
}

/** 항목의 소속 작품 id (본문·보드 insert 에 필요한 project_id) */
export async function itemProjectId(itemId: string): Promise<string> {
  const { data, error } = await sb.from('items').select('project_id').eq('id', itemId).single()
  if (error) throw error
  return (data as { project_id: string }).project_id
}

/** 형제 항목 중 다음 sort_order */
export async function nextSortOrder(projectId: string, parentId: string | null): Promise<number> {
  let q = sb.from('items').select('sort_order').eq('project_id', projectId)
  q = parentId ? q.eq('parent_id', parentId) : q.is('parent_id', null)
  const { data } = await q
  return (
    ((data ?? []) as { sort_order: number }[]).reduce(
      (m, r) => Math.max(m, r.sort_order ?? 0),
      -1
    ) + 1
  )
}
