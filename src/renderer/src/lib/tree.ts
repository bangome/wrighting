import type { Item } from '@shared/types'

export interface TreeNode {
  item: Item
  children: TreeNode[]
}

/** 플랫 아이템 목록을 부모-자식 트리로 구성 (각 레벨 sort_order 정렬) */
export function buildTree(items: Item[], rootId: string | null = null): TreeNode[] {
  const byParent = new Map<string | null, Item[]>()
  for (const it of items) {
    const key = it.parent_id
    const arr = byParent.get(key) ?? []
    arr.push(it)
    byParent.set(key, arr)
  }
  const build = (parentId: string | null): TreeNode[] =>
    (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({ item, children: build(item.id) }))
  return build(rootId)
}

/** 아이템 id로 루트까지의 경로(브레드크럼) */
export function pathToItem(items: Item[], itemId: string): Item[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  const path: Item[] = []
  let cur = byId.get(itemId)
  while (cur) {
    path.unshift(cur)
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  return path
}

/** 한 폴더의 직속 자식 (정렬됨) */
export function childrenOf(items: Item[], parentId: string | null): Item[] {
  return items
    .filter((i) => i.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function subtreeIds(items: Item[], rootId: string): string[] {
  const byParent = new Map<string | null, Item[]>()
  for (const item of items) {
    const siblings = byParent.get(item.parent_id) ?? []
    siblings.push(item)
    byParent.set(item.parent_id, siblings)
  }

  const ids: string[] = []
  const visit = (id: string): void => {
    ids.push(id)
    for (const child of byParent.get(id) ?? []) visit(child.id)
  }
  visit(rootId)
  return ids
}
