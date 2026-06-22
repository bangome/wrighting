import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Label, Status } from '@shared/types'
import { supabase } from './supabase'

export function useLabels(projectId: string | undefined) {
  return useQuery({
    queryKey: ['labels', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Label[]> => {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order')
      if (error) throw error
      return data as Label[]
    }
  })
}

export function useStatuses(projectId: string | undefined) {
  return useQuery({
    queryKey: ['statuses', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Status[]> => {
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order')
      if (error) throw error
      return data as Status[]
    }
  })
}

/** 기본 상태 색상 후보 */
export const STATUS_COLORS = [
  '#9aa0aa',
  '#d7b36a',
  '#e0883a',
  '#5b8fd6',
  '#5fae7a',
  '#b07cc0',
  '#cf6a6a'
]

export function useAddStatus(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; color?: string }): Promise<Status> => {
      const cache = qc.getQueryData<Status[]>(['statuses', projectId]) ?? []
      const sort = cache.length ? Math.max(...cache.map((s) => s.sort_order)) + 1 : 0
      const { data, error } = await supabase
        .from('statuses')
        .insert({
          project_id: projectId,
          name: input.name,
          color: input.color ?? STATUS_COLORS[0],
          sort_order: sort
        })
        .select('*')
        .single()
      if (error) throw error
      return data as Status
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['statuses', projectId] }),
    onError: (e) => console.error('[statuses] 상태 추가 실패:', e)
  })
}

export function useUpdateStatus(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Status> }) => {
      const { error } = await supabase.from('statuses').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['statuses', projectId] }),
    onError: (e) => console.error('[statuses] 상태 수정 실패:', e)
  })
}

export function useDeleteStatus(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('statuses').delete().eq('id', id)
      if (error) throw error
    },
    // 항목의 status_id는 FK on delete set null 로 자동 정리됨
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['statuses', projectId] })
      qc.invalidateQueries({ queryKey: ['items', projectId] })
    },
    onError: (e) => console.error('[statuses] 상태 삭제 실패:', e)
  })
}
