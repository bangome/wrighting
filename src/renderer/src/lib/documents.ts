import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DocumentRow, RichDoc } from '@shared/types'
import { supabase } from './supabase'

export function useDocument(itemId: string | undefined) {
  return useQuery({
    queryKey: ['document', itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<DocumentRow | null> => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('item_id', itemId!)
        .maybeSingle()
      if (error) throw error
      return data as DocumentRow | null
    }
  })
}

export interface SaveDocInput {
  itemId: string
  projectId: string
  content: RichDoc
  text_plain: string
  word_count: number
  char_count: number
}

/** 문서 본문 저장 (upsert). 컴포넌트에서 디바운스 호출. */
export function useSaveDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveDocInput) => {
      const { error } = await supabase.from('documents').upsert(
        {
          item_id: input.itemId,
          project_id: input.projectId,
          content: input.content,
          text_plain: input.text_plain,
          word_count: input.word_count,
          char_count: input.char_count,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'item_id' }
      )
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['document', vars.itemId] })
    }
  })
}
