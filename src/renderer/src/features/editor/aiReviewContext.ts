import type { AiReviewPartCard } from '@shared/aiReview'
import type { BoardNode, Item } from '@shared/types'

export function linkedPartCards(
  nodes: readonly BoardNode[],
  items: readonly Item[],
  documentId: string
): AiReviewPartCard[] {
  const itemById = new Map(items.map((entry) => [entry.id, entry]))
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  return nodes
    .filter((node) => node.kind === 'card' && node.doc_ids.includes(documentId))
    .map((card) => {
      const column = card.col_id ? nodeById.get(card.col_id) : undefined
      return {
        boardTitle: itemById.get(card.board_item_id)?.title ?? '제목 없는 플롯보드',
        columnTitle: column?.title ?? null,
        title: card.title ?? '제목 없는 파트 카드',
        body: card.body,
        tags: card.tags,
        mentionedTitles: card.mention_ids.map((id) => itemById.get(id)?.title ?? id)
      }
    })
}
