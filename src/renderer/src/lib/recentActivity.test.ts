import { describe, expect, it } from 'vitest'
import type { Item } from '@shared/types'
import { recentDocumentActivities } from './recentActivity'

describe('recentDocumentActivities', () => {
  it('shows body edits ahead of stale item timestamps when MCP edits a document', () => {
    const document = item({
      id: 'doc-1',
      type: 'document',
      created_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z'
    })
    const sheet = item({
      id: 'sheet-1',
      type: 'sheet',
      created_at: '2026-06-25T01:00:00.000Z',
      updated_at: '2026-06-25T01:00:00.000Z'
    })

    const recent = recentDocumentActivities(
      [sheet, document],
      [{ item_id: 'doc-1', updated_at: '2026-06-25T02:00:00.000Z' }],
      12
    )

    expect(recent.map((activity) => activity.item.id)).toEqual(['doc-1', 'sheet-1'])
    expect(recent[0]).toMatchObject({
      kind: 'edited',
      source: 'body',
      timestamp: '2026-06-25T02:00:00.000Z'
    })
  })

  it('keeps only live documents and sheets and labels untouched rows as created', () => {
    const recent = recentDocumentActivities(
      [
        item({ id: 'folder-1', type: 'folder' }),
        item({ id: 'deleted-doc', type: 'document', deleted_at: '2026-06-25T02:00:00.000Z' }),
        item({ id: 'sheet-1', type: 'sheet' })
      ],
      [],
      12
    )

    expect(recent).toHaveLength(1)
    expect(recent[0]).toMatchObject({
      kind: 'created',
      source: 'item',
      timestamp: '2026-06-25T00:00:00.000Z'
    })
  })
})

function item(patch: Partial<Item>): Item {
  return {
    id: 'item-1',
    project_id: 'project-1',
    parent_id: null,
    type: 'document',
    sheet_subtype: null,
    linked_item_id: null,
    title: '테스트 항목',
    icon: null,
    synopsis: null,
    label_id: null,
    status_id: null,
    folder_view: null,
    sort_order: 0,
    deleted_at: null,
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
    ...patch
  }
}
