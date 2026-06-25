import { useQuery } from '@tanstack/react-query'
import type { RichDoc } from '@shared/types'
import { supabase } from './supabase'

export interface SharedDocument {
  title: string
  content: RichDoc
}

function parseSharedDocumentRow(value: unknown): SharedDocument | null {
  if (!value || typeof value !== 'object') return null
  const row = value as { title?: unknown; content?: unknown }
  if (typeof row.title !== 'string') return null
  return {
    title: row.title,
    content: row.content === null || typeof row.content === 'object' ? (row.content as RichDoc) : null
  }
}

export function useSharedDocument(token: string | undefined) {
  return useQuery({
    queryKey: ['shared-document', token],
    enabled: !!token,
    queryFn: async (): Promise<SharedDocument | null> => {
      const { data, error } = await supabase.rpc('get_shared_document', { p_token: token })
      if (error) throw error
      if (!Array.isArray(data)) return null
      return parseSharedDocumentRow(data[0])
    },
    retry: false
  })
}
