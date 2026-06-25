import { useQuery } from '@tanstack/react-query'
import type { Item } from '@shared/types'
import { supabase } from './supabase'

export type ActivityKind = 'created' | 'edited'
export type ActivitySource = 'item' | 'body'

export interface BodyUpdate {
  readonly item_id: string
  readonly updated_at: string
}

export interface RecentActivity {
  readonly item: Item
  readonly kind: ActivityKind
  readonly source: ActivitySource
  readonly timestamp: string
}

export function recentDocumentActivities(
  items: readonly Item[],
  bodyUpdates: readonly BodyUpdate[],
  limit: number
): RecentActivity[] {
  const bodyUpdatedAt = newestBodyUpdateByItem(bodyUpdates)

  return items
    .filter((item) => (item.type === 'document' || item.type === 'sheet') && item.deleted_at === null)
    .map((item) => {
      const bodyTimestamp = bodyUpdatedAt.get(item.id)
      const bodyIsNewer = bodyTimestamp ? isMateriallyAfter(bodyTimestamp, item.updated_at) : false
      const timestamp = bodyIsNewer && bodyTimestamp ? bodyTimestamp : item.updated_at
      const kind: ActivityKind = isAfter(timestamp, item.created_at) ? 'edited' : 'created'
      const source: ActivitySource = bodyIsNewer ? 'body' : 'item'
      return {
        item,
        kind,
        source,
        timestamp
      }
    })
    .sort((left, right) => compareDesc(left.timestamp, right.timestamp))
    .slice(0, limit)
}

export function useBodyUpdates(projectId: string | undefined) {
  return useQuery({
    queryKey: ['body-updates', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<BodyUpdate[]> => {
      if (!projectId) return []
      const [documents, sheets] = await Promise.all([
        supabase.from('documents').select('item_id,updated_at').eq('project_id', projectId),
        supabase.from('sheets').select('item_id,updated_at').eq('project_id', projectId)
      ])
      if (documents.error) throw documents.error
      if (sheets.error) throw sheets.error
      return [...parseBodyUpdates(documents.data), ...parseBodyUpdates(sheets.data)]
    }
  })
}

function parseBodyUpdates(value: unknown): BodyUpdate[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((row) => {
    if (!isBodyUpdate(row)) return []
    return [row]
  })
}

function isBodyUpdate(value: unknown): value is BodyUpdate {
  if (typeof value !== 'object' || value === null) return false
  if (!('item_id' in value) || !('updated_at' in value)) return false
  return typeof value.item_id === 'string' && typeof value.updated_at === 'string'
}

function newestBodyUpdateByItem(bodyUpdates: readonly BodyUpdate[]): Map<string, string> {
  const byItem = new Map<string, string>()
  for (const update of bodyUpdates) {
    const current = byItem.get(update.item_id)
    if (!current || isAfter(update.updated_at, current)) byItem.set(update.item_id, update.updated_at)
  }
  return byItem
}

function compareDesc(left: string, right: string): number {
  return Date.parse(right) - Date.parse(left)
}

function isAfter(left: string, right: string): boolean {
  return Date.parse(left) > Date.parse(right)
}

function isMateriallyAfter(left: string, right: string): boolean {
  return Date.parse(left) - Date.parse(right) > 1000
}
