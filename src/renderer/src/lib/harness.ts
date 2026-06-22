import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  HarnessAgent,
  HarnessBundle,
  HarnessDoc,
  HarnessHistory,
  HarnessSkill
} from '@shared/types'
import { supabase } from './supabase'

export type Scope = 'global' | 'project'

// ── 변경 이력 (append-only, .claude 로 내보내지 않음) ───────────────────
interface HistoryEntry {
  projectId: string | null
  targetKind: HarnessHistory['target_kind']
  targetId: string | null
  targetName: string
  action: HarnessHistory['action']
  summary: string
  snapshot?: string | null
}

/** 이력 적립. 실패해도 본 작업을 막지 않는다(이력은 부가 기능). */
async function logHarnessChange(e: HistoryEntry): Promise<void> {
  try {
    const { error } = await supabase.from('harness_history').insert({
      project_id: e.projectId,
      target_kind: e.targetKind,
      target_id: e.targetId,
      target_name: e.targetName,
      action: e.action,
      summary: e.summary,
      snapshot: e.snapshot ?? null
    })
    if (error) throw error
  } catch (err) {
    console.error('[harness] 이력 기록 실패:', err)
  }
}

const FIELD_LABEL: Record<string, string> = {
  name: '이름',
  description: '설명',
  model: '모델',
  body: '본문'
}

/** 패치된 필드명을 사람이 읽는 요약으로 ("본문·설명 수정") */
function summarizePatch(patch: Record<string, unknown>): string {
  const parts = Object.keys(patch)
    .filter((k) => k in FIELD_LABEL)
    .map((k) => FIELD_LABEL[k])
  return parts.length ? `${parts.join('·')} 수정` : '수정'
}

/** 선택 항목의 변경 이력(최신순). targetId 가 없으면 비활성. */
export function useHarnessHistory(targetId: string | undefined) {
  return useQuery({
    queryKey: ['harness_history', targetId],
    enabled: !!targetId,
    queryFn: async (): Promise<HarnessHistory[]> => {
      const { data, error } = await supabase
        .from('harness_history')
        .select('*')
        .eq('target_id', targetId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as HarnessHistory[]
    }
  })
}

/** 데스크톱(Electron)에서만 .claude 파일 입출력이 가능 */
export const harnessFs = typeof window !== 'undefined' ? window.wrighting?.harness : undefined

// ── 조회: 공용(project_id null) + 해당 작품 전용 ─────────────────────────
export function useHarnessAgents(projectId: string | undefined) {
  return useQuery({
    queryKey: ['harness_agents', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<HarnessAgent[]> => {
      const { data, error } = await supabase
        .from('harness_agents')
        .select('*')
        .or(`project_id.is.null,project_id.eq.${projectId}`)
        .order('sort_order')
        .order('name')
      if (error) throw error
      return data as HarnessAgent[]
    }
  })
}

export function useHarnessSkills(projectId: string | undefined) {
  return useQuery({
    queryKey: ['harness_skills', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<HarnessSkill[]> => {
      const { data, error } = await supabase
        .from('harness_skills')
        .select('*')
        .or(`project_id.is.null,project_id.eq.${projectId}`)
        .order('sort_order')
        .order('name')
      if (error) throw error
      return data as HarnessSkill[]
    }
  })
}

// ── 메인 지침 CLAUDE.md (싱글톤: 공용 + 작품 전용) ──────────────────────
export function useHarnessDocs(projectId: string | undefined) {
  return useQuery({
    queryKey: ['harness_docs', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<HarnessDoc[]> => {
      const { data, error } = await supabase
        .from('harness_docs')
        .select('*')
        .or(`project_id.is.null,project_id.eq.${projectId}`)
      if (error) throw error
      return data as HarnessDoc[]
    }
  })
}

/** 실효 CLAUDE.md: 작품 전용이 있으면 그것, 없으면 공용 */
export function resolveEffectiveDoc(docs: HarnessDoc[] | undefined, projectId: string | undefined) {
  return (
    docs?.find((d) => d.project_id === projectId) ?? docs?.find((d) => d.project_id === null) ?? null
  )
}

export function useUpsertHarnessDoc(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { scope: Scope; body: string }): Promise<HarnessDoc> => {
      const { data: u } = await supabase.auth.getUser()
      const owner = u.user?.id
      if (!owner) throw new Error('로그인이 필요합니다.')
      const { data, error } = await supabase
        .from('harness_docs')
        .upsert(
          { owner, project_id: projectIdFor(input.scope, projectId), body: input.body },
          { onConflict: 'owner,project_id' }
        )
        .select('*')
        .single()
      if (error) throw error
      const doc = data as HarnessDoc
      await logHarnessChange({
        projectId: doc.project_id,
        targetKind: 'doc',
        targetId: doc.id,
        targetName: 'CLAUDE.md',
        action: 'update',
        summary: '지침 저장',
        snapshot: input.body
      })
      return doc
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harness_docs', projectId] })
      qc.invalidateQueries({ queryKey: ['harness_history'] })
    },
    onError: (e) => console.error('[harness] CLAUDE.md 저장 실패:', e)
  })
}

export function useDeleteHarnessDoc(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: row } = await supabase
        .from('harness_docs')
        .select('project_id')
        .eq('id', id)
        .single()
      const { error } = await supabase.from('harness_docs').delete().eq('id', id)
      if (error) throw error
      await logHarnessChange({
        projectId: (row as { project_id: string | null } | null)?.project_id ?? null,
        targetKind: 'doc',
        targetId: id,
        targetName: 'CLAUDE.md',
        action: 'delete',
        summary: '지침 삭제'
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harness_docs', projectId] })
      qc.invalidateQueries({ queryKey: ['harness_history'] })
    },
    onError: (e) => console.error('[harness] CLAUDE.md 삭제 실패:', e)
  })
}

/**
 * 작품의 실효 세트: 공용 + 작품 전용을 합치되, 같은 name 은 작품 전용이 공용을 덮어쓴다.
 * 내보내기·미리보기에 쓴다.
 */
export function resolveEffective<T extends { name: string; project_id: string | null }>(
  rows: T[]
): T[] {
  const byName = new Map<string, T>()
  // 먼저 공용을 깔고, 작품 전용으로 덮어쓴다.
  for (const r of rows.filter((x) => x.project_id === null)) byName.set(r.name, r)
  for (const r of rows.filter((x) => x.project_id !== null)) byName.set(r.name, r)
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function projectIdFor(scope: Scope, projectId: string | undefined): string | null {
  return scope === 'project' ? (projectId ?? null) : null
}

// ── 에이전트 CRUD ──────────────────────────────────────────────────────
export function useAddHarnessAgent(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      scope: Scope
      name: string
      description?: string
      model?: string | null
      body?: string
    }): Promise<HarnessAgent> => {
      const { data, error } = await supabase
        .from('harness_agents')
        .insert({
          project_id: projectIdFor(input.scope, projectId),
          name: input.name,
          description: input.description ?? '',
          model: input.model ?? null,
          body: input.body ?? ''
        })
        .select('*')
        .single()
      if (error) throw error
      const agent = data as HarnessAgent
      await logHarnessChange({
        projectId: agent.project_id,
        targetKind: 'agent',
        targetId: agent.id,
        targetName: agent.name,
        action: 'create',
        summary: '에이전트 생성',
        snapshot: agent.body
      })
      return agent
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harness_agents', projectId] })
      qc.invalidateQueries({ queryKey: ['harness_history'] })
    },
    onError: (e) => console.error('[harness] 에이전트 추가 실패:', e)
  })
}

export function useUpdateHarnessAgent(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<HarnessAgent> }) => {
      const { error } = await supabase.from('harness_agents').update(patch).eq('id', id)
      if (error) throw error
      const { data: row } = await supabase
        .from('harness_agents')
        .select('project_id,name,body')
        .eq('id', id)
        .single()
      const r = row as { project_id: string | null; name: string; body: string } | null
      await logHarnessChange({
        projectId: r?.project_id ?? null,
        targetKind: 'agent',
        targetId: id,
        targetName: r?.name ?? '',
        action: 'update',
        summary: summarizePatch(patch),
        snapshot: patch.body !== undefined ? (r?.body ?? null) : null
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harness_agents', projectId] })
      qc.invalidateQueries({ queryKey: ['harness_history'] })
    },
    onError: (e) => console.error('[harness] 에이전트 수정 실패:', e)
  })
}

export function useDeleteHarnessAgent(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: row } = await supabase
        .from('harness_agents')
        .select('project_id,name')
        .eq('id', id)
        .single()
      const { error } = await supabase.from('harness_agents').delete().eq('id', id)
      if (error) throw error
      const r = row as { project_id: string | null; name: string } | null
      await logHarnessChange({
        projectId: r?.project_id ?? null,
        targetKind: 'agent',
        targetId: id,
        targetName: r?.name ?? '',
        action: 'delete',
        summary: '에이전트 삭제'
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harness_agents', projectId] })
      qc.invalidateQueries({ queryKey: ['harness_history'] })
    },
    onError: (e) => console.error('[harness] 에이전트 삭제 실패:', e)
  })
}

// ── 스킬 CRUD ──────────────────────────────────────────────────────────
export function useAddHarnessSkill(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      scope: Scope
      name: string
      description?: string
      body?: string
    }): Promise<HarnessSkill> => {
      const { data, error } = await supabase
        .from('harness_skills')
        .insert({
          project_id: projectIdFor(input.scope, projectId),
          name: input.name,
          description: input.description ?? '',
          body: input.body ?? ''
        })
        .select('*')
        .single()
      if (error) throw error
      const skill = data as HarnessSkill
      await logHarnessChange({
        projectId: skill.project_id,
        targetKind: 'skill',
        targetId: skill.id,
        targetName: skill.name,
        action: 'create',
        summary: '스킬 생성',
        snapshot: skill.body
      })
      return skill
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harness_skills', projectId] })
      qc.invalidateQueries({ queryKey: ['harness_history'] })
    },
    onError: (e) => console.error('[harness] 스킬 추가 실패:', e)
  })
}

export function useUpdateHarnessSkill(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<HarnessSkill> }) => {
      const { error } = await supabase.from('harness_skills').update(patch).eq('id', id)
      if (error) throw error
      const { data: row } = await supabase
        .from('harness_skills')
        .select('project_id,name,body')
        .eq('id', id)
        .single()
      const r = row as { project_id: string | null; name: string; body: string } | null
      await logHarnessChange({
        projectId: r?.project_id ?? null,
        targetKind: 'skill',
        targetId: id,
        targetName: r?.name ?? '',
        action: 'update',
        summary: summarizePatch(patch),
        snapshot: patch.body !== undefined ? (r?.body ?? null) : null
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harness_skills', projectId] })
      qc.invalidateQueries({ queryKey: ['harness_history'] })
    },
    onError: (e) => console.error('[harness] 스킬 수정 실패:', e)
  })
}

export function useDeleteHarnessSkill(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: row } = await supabase
        .from('harness_skills')
        .select('project_id,name')
        .eq('id', id)
        .single()
      const { error } = await supabase.from('harness_skills').delete().eq('id', id)
      if (error) throw error
      const r = row as { project_id: string | null; name: string } | null
      await logHarnessChange({
        projectId: r?.project_id ?? null,
        targetKind: 'skill',
        targetId: id,
        targetName: r?.name ?? '',
        action: 'delete',
        summary: '스킬 삭제'
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harness_skills', projectId] })
      qc.invalidateQueries({ queryKey: ['harness_history'] })
    },
    onError: (e) => console.error('[harness] 스킬 삭제 실패:', e)
  })
}

/**
 * 로컬 .claude 폴더에서 하네스를 읽어 Supabase 로 가져온다(시드/동기화).
 * 같은 (owner, scope, name) 이 있으면 덮어쓴다(upsert).
 */
export function useImportHarness(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      scope: Scope
      bundle: HarnessBundle
    }): Promise<{ agents: number; skills: number }> => {
      const { data: u } = await supabase.auth.getUser()
      const owner = u.user?.id
      if (!owner) throw new Error('로그인이 필요합니다.')
      const pid = projectIdFor(input.scope, projectId)

      if (input.bundle.agents.length) {
        const { error } = await supabase.from('harness_agents').upsert(
          input.bundle.agents.map((a) => ({
            owner,
            project_id: pid,
            name: a.name,
            description: a.description,
            model: a.model,
            body: a.body
          })),
          { onConflict: 'owner,project_id,name' }
        )
        if (error) throw error
      }
      if (input.bundle.skills.length) {
        const { error } = await supabase.from('harness_skills').upsert(
          input.bundle.skills.map((s) => ({
            owner,
            project_id: pid,
            name: s.name,
            description: s.description,
            body: s.body
          })),
          { onConflict: 'owner,project_id,name' }
        )
        if (error) throw error
      }
      if (input.bundle.claudeMd != null && input.bundle.claudeMd.trim()) {
        const { error } = await supabase
          .from('harness_docs')
          .upsert(
            { owner, project_id: pid, body: input.bundle.claudeMd },
            { onConflict: 'owner,project_id' }
          )
        if (error) throw error
      }
      await logHarnessChange({
        projectId: pid,
        targetKind: 'bundle',
        targetId: null,
        targetName: '(가져오기)',
        action: 'import',
        summary: `가져오기 — 에이전트 ${input.bundle.agents.length} · 스킬 ${input.bundle.skills.length}${input.bundle.claudeMd ? ' · CLAUDE.md' : ''}`
      })
      return { agents: input.bundle.agents.length, skills: input.bundle.skills.length }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harness_agents', projectId] })
      qc.invalidateQueries({ queryKey: ['harness_skills', projectId] })
      qc.invalidateQueries({ queryKey: ['harness_docs', projectId] })
      qc.invalidateQueries({ queryKey: ['harness_history'] })
    },
    onError: (e) => console.error('[harness] 가져오기 실패:', e)
  })
}
