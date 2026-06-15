import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Task, TaskBucket } from '@shared/types'
import { supabase } from './supabase'

export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Task[]
    }
  })
}

export function useAddTask(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { title: string; bucket?: TaskBucket; itemId?: string | null; due?: string | null }) => {
      const { error } = await supabase.from('tasks').insert({
        project_id: projectId,
        title: input.title,
        bucket: input.bucket ?? 'inbox',
        item_id: input.itemId ?? null,
        due_date: input.due ?? null
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] })
  })
}

export function useUpdateTask(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const { error } = await supabase.from('tasks').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['tasks', projectId] })
      const prev = qc.getQueryData<Task[]>(['tasks', projectId])
      qc.setQueryData<Task[]>(['tasks', projectId], (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t))
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['tasks', projectId], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] })
  })
}

export function useDeleteTask(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] })
  })
}
