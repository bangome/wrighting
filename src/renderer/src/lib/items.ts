import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Item, ItemType, SheetSubtype } from '@shared/types'
import { supabase } from './supabase'
import { subtreeIds } from './tree'

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
  linkedItemId?: string | null
}

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
          linked_item_id: input.type === 'notes' ? (input.linkedItemId ?? null) : null,
          sort_order: sort
        })
        .select('*')
        .single()
      if (error) throw error

      const item = data as Item
      if (item.type === 'document' || item.type === 'notes') {
        const { error: docError } = await supabase
          .from('documents')
          .insert({ item_id: item.id, project_id: item.project_id, content: null })
        if (docError) throw docError
      } else if (item.type === 'sheet') {
        const { error: sheetError } = await supabase
          .from('sheets')
          .insert({ item_id: item.id, project_id: item.project_id })
        if (sheetError) throw sheetError
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
      event: '새 이벤트',
      organization: '새 조직',
      item: '새 아이템',
      place: '새 장소',
      worldview: '새 세계관',
      other: '새 시트',
      concept: '새 세계관'
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

export interface MoveInput {
  dragId: string
  newParentId: string | null
  beforeId?: string | null
}

function computeMove(
  items: Item[],
  { dragId, newParentId, beforeId }: MoveInput
): { next: Item[]; updates: { id: string; sort_order: number; parent_id: string | null }[] } {
  const dragItem = items.find((i) => i.id === dragId)
  if (!dragItem) return { next: items, updates: [] }

  const siblings = items
    .filter((i) => i.parent_id === newParentId && i.id !== dragId)
    .sort((a, b) => a.sort_order - b.sort_order)

  let insertAt = beforeId ? siblings.findIndex((s) => s.id === beforeId) : siblings.length
  if (insertAt < 0) insertAt = siblings.length

  const ordered = [...siblings]
  ordered.splice(insertAt, 0, dragItem)

  const byId = new Map(items.map((i) => [i.id, { ...i }]))
  const updates: { id: string; sort_order: number; parent_id: string | null }[] = []
  ordered.forEach((it, idx) => {
    const changedParent = it.id === dragId && it.parent_id !== newParentId
    if (it.sort_order !== idx || changedParent) {
      updates.push({ id: it.id, sort_order: idx, parent_id: newParentId })
      const c = byId.get(it.id)!
      c.sort_order = idx
      c.parent_id = newParentId
    }
  })
  return { next: Array.from(byId.values()), updates }
}

export function useMoveItem(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: MoveInput) => {
      const prev = qc.getQueryData<Item[]>(['items', projectId]) ?? []
      const { next, updates } = computeMove(prev, input)
      if (!updates.length) return
      qc.setQueryData<Item[]>(['items', projectId], next)
      try {
        for (const u of updates) {
          const { error } = await supabase
            .from('items')
            .update({ sort_order: u.sort_order, parent_id: u.parent_id })
            .eq('id', u.id)
          if (error) throw error
        }
      } catch (e) {
        qc.setQueryData(['items', projectId], prev)
        throw e
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', projectId] })
  })
}

export function isAncestor(items: Item[], ancestorId: string, nodeId: string): boolean {
  const byId = new Map(items.map((i) => [i.id, i]))
  let cur: Item | undefined = byId.get(nodeId)
  while (cur) {
    if (cur.id === ancestorId) return true
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  return false
}

export function useTrashItem(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const items = qc.getQueryData<Item[]>(['items', projectId]) ?? []
      const ids = subtreeIds(items, id)
      const { error } = await supabase
        .from('items')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', projectId] })
      qc.invalidateQueries({ queryKey: ['items-trash', projectId] })
    }
  })
}

export function useRestoreItem(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const items = qc.getQueryData<Item[]>(['items-trash', projectId]) ?? []
      const ids = subtreeIds(items, id)
      const { error } = await supabase.from('items').update({ deleted_at: null }).in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', projectId] })
      qc.invalidateQueries({ queryKey: ['items-trash', projectId] })
    }
  })
}

export function usePurgeItem(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const items = qc.getQueryData<Item[]>(['items-trash', projectId]) ?? []
      const ids = subtreeIds(items, id)
      const { error } = await supabase.from('items').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', projectId] })
      qc.invalidateQueries({ queryKey: ['items-trash', projectId] })
    }
  })
}
