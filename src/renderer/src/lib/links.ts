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
    }) => {
      const { error } = await supabase.from('links').insert({
        project_id: projectId,
        from_item: input.from_item,
        to_item: input.to_item,
        rel: input.rel ?? 'relation',
        label: input.label ?? null
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', projectId] })
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
