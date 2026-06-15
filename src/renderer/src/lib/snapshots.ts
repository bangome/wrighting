import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RichDoc, Snapshot } from '@shared/types'
import { supabase } from './supabase'

export function useSnapshots(itemId: string | undefined) {
  return useQuery({
    queryKey: ['snapshots', itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from('snapshots')
        .select('*')
        .eq('item_id', itemId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Snapshot[]
    }
  })
}

export function useCreateSnapshot(itemId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { projectId: string; content: RichDoc; label?: string }) => {
      const { error } = await supabase.from('snapshots').insert({
        item_id: itemId,
        project_id: input.projectId,
        content: input.content,
        label: input.label ?? null
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snapshots', itemId] })
  })
}
