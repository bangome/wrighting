import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DocumentRow, Item, SheetRow } from '@shared/types'
import { supabase } from './supabase'

type DocumentCopy = Pick<DocumentRow, 'content' | 'text_plain' | 'word_count' | 'char_count'>
type SheetCopy = Pick<SheetRow, 'attributes' | 'tags' | 'body'>

export function duplicateItemTitle(title: string): string {
  const copySuffix = ' 사본'
  if (!title.endsWith(copySuffix)) return `${title}${copySuffix}`
  return `${title} 2`
}

function nextSortOrder(items: readonly Item[], parentId: string | null): number {
  const siblings = items.filter((item) => item.parent_id === parentId)
  return siblings.length ? Math.max(...siblings.map((item) => item.sort_order)) + 1 : 0
}

export function useDuplicateItem(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: Item): Promise<Item> => {
      const items = queryClient.getQueryData<readonly Item[]>(['items', projectId]) ?? []
      const { data: duplicated, error } = await supabase
        .from('items')
        .insert({
          project_id: item.project_id,
          parent_id: item.parent_id,
          type: item.type,
          sheet_subtype: item.sheet_subtype,
          linked_item_id: null,
          title: duplicateItemTitle(item.title),
          icon: item.icon,
          synopsis: item.synopsis,
          label_id: item.label_id,
          status_id: item.status_id,
          folder_view: item.folder_view,
          sort_order: nextSortOrder(items, item.parent_id)
        })
        .select('*')
        .single<Item>()

      if (error) throw error

      if (item.type === 'document') {
        const { data: doc, error: readError } = await supabase
          .from('documents')
          .select('content,text_plain,word_count,char_count')
          .eq('item_id', item.id)
          .maybeSingle<DocumentCopy>()
        if (readError) throw readError

        const { error: writeError } = await supabase.from('documents').insert({
          item_id: duplicated.id,
          project_id: item.project_id,
          content: doc?.content ?? null,
          text_plain: doc?.text_plain ?? '',
          word_count: doc?.word_count ?? 0,
          char_count: doc?.char_count ?? 0
        })
        if (writeError) throw writeError
      }

      if (item.type === 'sheet') {
        const { data: sheet, error: readError } = await supabase
          .from('sheets')
          .select('attributes,tags,body')
          .eq('item_id', item.id)
          .maybeSingle<SheetCopy>()
        if (readError) throw readError

        const { error: writeError } = await supabase.from('sheets').insert({
          item_id: duplicated.id,
          project_id: item.project_id,
          attributes: sheet?.attributes ?? {},
          tags: sheet?.tags ?? [],
          body: sheet?.body ?? null
        })
        if (writeError) throw writeError
      }

      return duplicated
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['items', projectId] })
      queryClient.invalidateQueries({ queryKey: ['document', item.id] })
      queryClient.invalidateQueries({ queryKey: ['body-updates', projectId] })
    }
  })
}
