import { describe, expect, it } from 'vitest'
import type { Item } from '@shared/types'
import { subtreeIds } from './tree'

function item(id: string, parent_id: string | null): Item {
  return {
    id,
    project_id: 'project',
    parent_id,
    type: 'document',
    sheet_subtype: null,
    linked_item_id: null,
    title: id,
    icon: null,
    synopsis: null,
    label_id: null,
    status_id: null,
    folder_view: null,
    sort_order: 0,
    deleted_at: null,
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z'
  }
}

describe('subtreeIds', () => {
  it('returns the selected item and all descendants when the item has nested children', () => {
    const items = [item('root', null), item('child-a', 'root'), item('child-b', 'root'), item('leaf', 'child-a'), item('other', null)]

    expect(subtreeIds(items, 'root')).toEqual(['root', 'child-a', 'leaf', 'child-b'])
  })

  it('returns only the selected id when the selected item is missing from the list', () => {
    expect(subtreeIds([], 'missing')).toEqual(['missing'])
  })
})
