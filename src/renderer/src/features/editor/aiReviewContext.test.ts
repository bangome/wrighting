import { describe, expect, it } from 'vitest'
import type { BoardNode, Item } from '@shared/types'
import { linkedPartCards } from './aiReviewContext'

describe('linkedPartCards', () => {
  it('returns only part cards connected to the current document with board and mention context', () => {
    const cards = linkedPartCards(
      [
        node({ id: 'col-1', kind: 'group', board_item_id: 'board-1', title: '1막' }),
        node({
          id: 'card-1',
          kind: 'card',
          board_item_id: 'board-1',
          col_id: 'col-1',
          title: '문서 연결 카드',
          body: '이 장면의 목적',
          tags: ['도입'],
          doc_ids: ['doc-1'],
          mention_ids: ['sheet-1']
        }),
        node({ id: 'card-2', kind: 'card', board_item_id: 'board-1', doc_ids: ['doc-2'] })
      ],
      [item({ id: 'board-1', type: 'plotboard', title: '메인 플롯' }), item({ id: 'sheet-1', title: '주인공' })],
      'doc-1'
    )

    expect(cards).toEqual([
      {
        boardTitle: '메인 플롯',
        columnTitle: '1막',
        title: '문서 연결 카드',
        body: '이 장면의 목적',
        tags: ['도입'],
        mentionedTitles: ['주인공']
      }
    ])
  })
})

function node(patch: Partial<BoardNode>): BoardNode {
  return {
    id: 'node-1',
    board_item_id: 'board-1',
    kind: 'card',
    x: 0,
    y: 0,
    w: 220,
    h: 120,
    title: '카드',
    body: null,
    color: null,
    ref_item_id: null,
    shape: null,
    lane: null,
    ord: 0,
    col_id: null,
    tags: [],
    doc_ids: [],
    mention_ids: [],
    ...patch
  }
}

function item(patch: Partial<Item>): Item {
  return {
    id: 'item-1',
    project_id: 'project-1',
    parent_id: null,
    type: 'document',
    sheet_subtype: null,
    linked_item_id: null,
    title: '항목',
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
