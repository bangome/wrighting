import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Link, LinkRel } from '@shared/types'
import { supabase } from './supabase'

export function useLinks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['links', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Link[]> => {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('project_id', projectId!)
      if (error) throw error
      return data as Link[]
    }
  })
}

export function useAddLink(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      from_item: string
      to_item: string
      rel?: LinkRel
      label?: string
      auto?: boolean
    }) => {
      const { error } = await supabase.from('links').insert({
        project_id: projectId,
        from_item: input.from_item,
        to_item: input.to_item,
        rel: input.rel ?? 'relation',
        label: input.label ?? null,
        auto: input.auto ?? false
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', projectId] }),
    onError: (e) => console.error('[links] 링크 추가 실패:', e)
  })
}

/**
 * 문서 본문 멘션과 자동 링크(auto=true)를 일치시킨다.
 * 본문에서 멘션된 to_item 집합을 기준으로 누락분은 추가, 사라진 것은 삭제.
 * 사용자가 수동으로 만든 관계(auto=false)는 건드리지 않는다.
 */
export function useSyncMentionLinks(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ fromItem, toItemIds }: { fromItem: string; toItemIds: string[] }) => {
      const wanted = new Set(toItemIds)
      const { data: existing, error: selErr } = await supabase
        .from('links')
        .select('id,to_item')
        .eq('project_id', projectId!)
        .eq('from_item', fromItem)
        .eq('rel', 'ref')
        .eq('auto', true)
      if (selErr) throw selErr

      const have = new Set((existing ?? []).map((l) => l.to_item))
      const toRemove = (existing ?? []).filter((l) => !wanted.has(l.to_item)).map((l) => l.id)
      const toAdd = [...wanted].filter((id) => !have.has(id))

      if (toRemove.length) {
        const { error } = await supabase.from('links').delete().in('id', toRemove)
        if (error) throw error
      }
      if (toAdd.length) {
        const { error } = await supabase.from('links').insert(
          toAdd.map((to) => ({
            project_id: projectId,
            from_item: fromItem,
            to_item: to,
            rel: 'ref' as LinkRel,
            auto: true
          }))
        )
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', projectId] }),
    onError: (e) => console.error('[links] 멘션 링크 동기화 실패:', e)
  })
}

/**
 * 트리 상하관계 링크 동기화 — 항목(childId)이 다른 항목(parentId) 하위로 이동하면
 * 두 항목을 'parent' 링크(상위→하위, auto=true)로 연결한다.
 * parentId가 null이면(루트/폴더 하위) 기존 상하관계 링크를 제거한다.
 * 부모는 유일하므로 childId당 자동 'parent' 링크는 최대 1개만 유지한다.
 */
export function useSyncHierarchyLink(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ childId, parentId }: { childId: string; parentId: string | null }) => {
      const { data: existing, error: selErr } = await supabase
        .from('links')
        .select('id,from_item')
        .eq('project_id', projectId!)
        .eq('to_item', childId)
        .eq('rel', 'parent')
        .eq('auto', true)
      if (selErr) throw selErr

      // 이미 올바른 부모와 연결돼 있으면 유지, 나머지는 제거
      const keep = parentId ? (existing ?? []).find((l) => l.from_item === parentId) : undefined
      const toRemove = (existing ?? []).filter((l) => l.id !== keep?.id).map((l) => l.id)
      if (toRemove.length) {
        const { error } = await supabase.from('links').delete().in('id', toRemove)
        if (error) throw error
      }
      if (parentId && !keep) {
        const { error } = await supabase.from('links').insert({
          project_id: projectId,
          from_item: parentId,
          to_item: childId,
          rel: 'parent' as LinkRel,
          auto: true
        })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', projectId] }),
    onError: (e) => console.error('[links] 상하관계 링크 동기화 실패:', e)
  })
}

export function useRemoveLink(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('links').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', projectId] })
  })
}
