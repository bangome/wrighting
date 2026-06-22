import type { Item, RichDoc } from '@shared/types'
import { extractBlocks, type ExportPiece } from '../features/export/blocks'
import { supabase } from './supabase'

/** 폴더 하위의 document 아이템을 트리(sort_order) 순서로 평탄화 */
export function documentDescendants(items: Item[], folderId: string): Item[] {
  const out: Item[] = []
  const walk = (parentId: string): void => {
    items
      .filter((i) => i.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((child) => {
        if (child.type === 'document') out.push(child)
        // 폴더 안의 폴더도 재귀적으로 포함 (장→회차 구조 지원)
        if (child.type === 'folder') walk(child.id)
      })
  }
  walk(folderId)
  return out
}

/** 주어진 문서 아이템들의 본문을 한 번에 받아 회차 순서대로 ExportPiece로 변환 */
export async function fetchPieces(docItems: Item[]): Promise<ExportPiece[]> {
  if (docItems.length === 0) return []
  const ids = docItems.map((i) => i.id)
  const { data, error } = await supabase
    .from('documents')
    .select('item_id,content')
    .in('item_id', ids)
  if (error) throw error
  const byId = new Map((data ?? []).map((d) => [d.item_id as string, d.content as RichDoc]))
  return docItems.map((it) => ({
    title: it.title,
    blocks: extractBlocks(byId.get(it.id) ?? null)
  }))
}
