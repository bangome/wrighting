import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Share } from '@shared/types'
import { supabase } from './supabase'

/** 공개 뷰어 기준 URL (.env: VITE_SHARE_BASE_URL). 공개 페이지는 후속 단계. */
const SHARE_BASE = (import.meta.env.VITE_SHARE_BASE_URL as string | undefined) ?? 'https://wrighting.vercel.app'

export function shareUrl(token: string): string {
  return `${SHARE_BASE.replace(/\/$/, '')}/#/s/${token}`
}

export function useShare(itemId: string | undefined) {
  return useQuery({
    queryKey: ['share', itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<Share | null> => {
      const { data, error } = await supabase
        .from('shares')
        .select('*')
        .eq('item_id', itemId!)
        .maybeSingle()
      if (error) throw error
      return data as Share | null
    }
  })
}

export function useCreateShare(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: string): Promise<Share> => {
      const token = crypto.randomUUID().replace(/-/g, '')
      const { data, error } = await supabase
        .from('shares')
        .insert({ project_id: projectId, item_id: itemId, token })
        .select('*')
        .single()
      if (error) throw error
      return data as Share
    },
    onSuccess: (share) => qc.invalidateQueries({ queryKey: ['share', share.item_id] })
  })
}

export function useRevokeShare(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; itemId: string }) => {
      const { error } = await supabase.from('shares').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['share', vars.itemId] })
  })
}
