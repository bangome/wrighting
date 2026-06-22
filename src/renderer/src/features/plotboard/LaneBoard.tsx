import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import type { BoardNode, Item, Project } from '@shared/types'
import {
  useAddBoardNode,
  useBoardNodes,
  useDeleteBoardNode,
  useUpdateBoardNode
} from '../../lib/boards'

/** 기본 5막 구조 (단계). lane 인덱스와 매핑. */
const ACTS = ['발단', '전개', '위기', '절정', '결말']

const PALETTE = [null, '#cf6a6a', '#d6924a', '#d7b36a', '#5fae7a', '#5b8fd6', '#b07cc0']

function laneOf(n: BoardNode): number {
  const l = n.lane ?? 0
  return Math.min(Math.max(l, 0), ACTS.length - 1)
}

/** 플롯보드 — 막/단계 레인에 카드를 배치하고 순서를 관리한다(카드 기반 구조). */
export function LaneBoard({ project, item }: { project: Project; item: Item }): JSX.Element {
  const { data: nodes } = useBoardNodes(item.id)
  const addNode = useAddBoardNode(item.id, project.id)
  const updateNode = useUpdateBoardNode(item.id)
  const deleteNode = useDeleteBoardNode(item.id)

  const cards = (nodes ?? []).filter((n) => n.kind === 'card')
  const byLane = (lane: number): BoardNode[] =>
    cards.filter((c) => laneOf(c) === lane).sort((a, b) => a.ord - b.ord || a.id.localeCompare(b.id))
  const maxOrd = (lane: number): number =>
    byLane(lane).reduce((m, c) => Math.max(m, c.ord), -1)

  function add(lane: number): void {
    addNode.mutate({ lane, ord: maxOrd(lane) + 1, title: '새 카드', body: '' })
  }
  function moveLane(card: BoardNode, dir: -1 | 1): void {
    const next = Math.min(Math.max(laneOf(card) + dir, 0), ACTS.length - 1)
    if (next === laneOf(card)) return
    updateNode.mutate({ id: card.id, patch: { lane: next, ord: maxOrd(next) + 1 } })
  }
  function moveOrder(card: BoardNode, dir: -1 | 1): void {
    const lane = byLane(laneOf(card))
    const idx = lane.findIndex((c) => c.id === card.id)
    const swap = lane[idx + dir]
    if (!swap) return
    // 두 카드의 ord 를 교환
    updateNode.mutate({ id: card.id, patch: { ord: swap.ord } })
    updateNode.mutate({ id: swap.id, patch: { ord: card.ord } })
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {ACTS.map((act, lane) => {
        const laneCards = byLane(lane)
        return (
          <div key={lane} className="flex w-72 shrink-0 flex-col rounded-app bg-bg-elev/40">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-semibold">
                {act}
                <span className="ml-1.5 text-xs text-text-faint">{laneCards.length}</span>
              </span>
              <button className="icon-btn p-1" title="카드 추가" onClick={() => add(lane)}>
                <Plus size={15} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
              {laneCards.length === 0 ? (
                <button
                  onClick={() => add(lane)}
                  className="rounded-app border border-dashed border-border py-6 text-xs text-text-faint hover:border-border-strong"
                >
                  + 카드 추가
                </button>
              ) : (
                laneCards.map((card, i) => (
                  <div
                    key={card.id}
                    className="rounded-app border bg-bg-elev p-2.5"
                    style={{
                      borderColor: card.color ?? 'var(--border)',
                      borderTopWidth: card.color ? 3 : 1,
                      borderTopColor: card.color ?? 'var(--border)'
                    }}
                  >
                    <input
                      defaultValue={card.title ?? ''}
                      onBlur={(e) => updateNode.mutate({ id: card.id, patch: { title: e.target.value } })}
                      placeholder="제목"
                      className="mb-1 w-full bg-transparent text-sm font-semibold outline-none"
                    />
                    <textarea
                      defaultValue={card.body ?? ''}
                      onBlur={(e) => updateNode.mutate({ id: card.id, patch: { body: e.target.value } })}
                      rows={2}
                      placeholder="설명"
                      className="w-full resize-none bg-transparent text-xs leading-relaxed text-text-muted outline-none"
                    />
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {PALETTE.map((c, ci) => (
                        <button
                          key={ci}
                          onClick={() => updateNode.mutate({ id: card.id, patch: { color: c } })}
                          className="h-3 w-3 shrink-0 rounded-full border border-border"
                          style={{ background: c ?? 'transparent' }}
                          title={c ?? '없음'}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex items-center gap-0.5 border-t border-border pt-1.5 text-text-faint">
                      <button
                        className="icon-btn p-1 disabled:opacity-30"
                        title="이전 단계로"
                        disabled={lane === 0}
                        onClick={() => moveLane(card, -1)}
                      >
                        <ArrowLeft size={13} />
                      </button>
                      <button
                        className="icon-btn p-1 disabled:opacity-30"
                        title="다음 단계로"
                        disabled={lane === ACTS.length - 1}
                        onClick={() => moveLane(card, 1)}
                      >
                        <ArrowRight size={13} />
                      </button>
                      <button
                        className="icon-btn p-1 disabled:opacity-30"
                        title="위로"
                        disabled={i === 0}
                        onClick={() => moveOrder(card, -1)}
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        className="icon-btn p-1 disabled:opacity-30"
                        title="아래로"
                        disabled={i === laneCards.length - 1}
                        onClick={() => moveOrder(card, 1)}
                      >
                        <ChevronDown size={13} />
                      </button>
                      <button
                        className="icon-btn ml-auto p-1 hover:text-danger"
                        title="삭제"
                        onClick={() => deleteNode.mutate(card.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
