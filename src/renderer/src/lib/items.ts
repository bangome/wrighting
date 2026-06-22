import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Item, ItemType, SheetSubtype } from '@shared/types'
import { supabase } from './supabase'

/** 작품의 살아있는(휴지통 제외) 아이템 전체 */
export function useItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['items', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('project_id', projectId!)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Item[]
    }
  })
}

/** 휴지통(삭제된) 아이템 */
export function useTrashedItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['items-trash', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('project_id', projectId!)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
      if (error) throw error
      return data as Item[]
    }
  })
}

export interface NewItemInput {
  projectId: string
  parentId: string | null
  type: ItemType
  sheetSubtype?: SheetSubtype
  title?: string
}

/** 트리에서 같은 부모의 마지막 정렬값 다음을 계산 */
function nextSortOrder(items: Item[], parentId: string | null): number {
  const sibs = items.filter((i) => i.parent_id === parentId)
  return sibs.length ? Math.max(...sibs.map((s) => s.sort_order)) + 1 : 0
}

export function useCreateItem(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewItemInput): Promise<Item> => {
      const cache = qc.getQueryData<Item[]>(['items', projectId]) ?? []
      const sort = nextSortOrder(cache, input.parentId)
      const { data, error } = await supabase
        .from('items')
        .insert({
          project_id: input.projectId,
          parent_id: input.parentId,
          type: input.type,
          sheet_subtype: input.type === 'sheet' ? (input.sheetSubtype ?? 'character') : null,
          title: input.title ?? defaultTitle(input.type, input.sheetSubtype),
          folder_view: input.type === 'folder' ? 'grid' : null,
          sort_order: sort
        })
        .select('*')
        .single()
      if (error) throw error

      const item = data as Item
      // 본문 테이블 1:1 행 생성 (노트도 documents 테이블 재사용)
      if (item.type === 'document' || item.type === 'notes') {
        await supabase
          .from('documents')
          .insert({ item_id: item.id, project_id: item.project_id, content: null })
      } else if (item.type === 'sheet') {
        await supabase
          .from('sheets')
          .insert({ item_id: item.id, project_id: item.project_id })
      }
      return item
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', projectId] })
  })
}

function defaultTitle(type: ItemType, subtype?: SheetSubtype): string {
  if (type === 'folder') return '새 폴더'
  if (type === 'document') return '제목 없는 문서'
  if (type === 'notes') return '새 노트'
  if (type === 'plotboard') return '새 플롯보드'
  if (type === 'canvas') return '새 캔버스'
  if (type === 'sheet') {
    const labels: Record<SheetSubtype, string> = {
      character: '새 캐릭터',
      place: '새 장소',
      item: '새 아이템',
      organization: '새 조직',
      concept: '새 개념'
    }
    return labels[subtype ?? 'character']
  }
  return '제목 없음'
}

export function useUpdateItem(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Item> }) => {
      const { error } = await supabase.from('items').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['items', projectId] })
      const prev = qc.getQueryData<Item[]>(['items', projectId])
      qc.setQueryData<Item[]>(['items', projectId], (old) =>
        (old ?? []).map((i) => (i.id === id ? { ...i, ...patch } : i))
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['items', projectId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', projectId] })
  })
}

/** soft-delete (휴지통으로) */
export function useTrashItem(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', projectId] })
      qc.invalidateQueries({ queryKey: ['items-trash', projectId] })
    }
  })
}

/** 휴지통에서 복원 */
export function useRestoreItem(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('items').update({ deleted_at: null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', projectId] })
      qc.invalidateQueries({ queryKey: ['items-trash', projectId] })
    }
  })
}

/** 영구 삭제 */
export function usePurgeItem(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items-trash', projectId] })
  })
}
