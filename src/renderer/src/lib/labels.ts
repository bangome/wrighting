import { useQuery } from '@tanstack/react-query'
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
