import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RichDoc, SheetRow } from '@shared/types'
import { supabase } from './supabase'

export function useSheet(itemId: string | undefined) {
  return useQuery({
    queryKey: ['sheet', itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<SheetRow | null> => {
      const { data, error } = await supabase
        .from('sheets')
        .select('*')
        .eq('item_id', itemId!)
        .maybeSingle()
      if (error) throw error
      return data as SheetRow | null
    }
  })
}

export interface SaveSheetInput {
  itemId: string
  projectId: string
  attributes: Record<string, string>
  tags: string[]
  body: RichDoc
}

export function useSaveSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveSheetInput) => {
      const { error } = await supabase.from('sheets').upsert(
        {
          item_id: input.itemId,
          project_id: input.projectId,
          attributes: input.attributes,
          tags: input.tags,
          body: input.body,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'item_id' }
      )
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['sheet', vars.itemId] })
      qc.invalidateQueries({ queryKey: ['body-updates', vars.projectId] })
      qc.invalidateQueries({ queryKey: ['items', vars.projectId] })
    }
  })
}
