import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Plus,
  Tag,
  Trash2,
  X
} from 'lucide-react'
import type { BoardNode, Item, Project } from '@shared/types'
import {
  useAddBoardNode,
  useBoardNodes,
  useDeleteBoardNode,
  useUpdateBoardNode
} from '../../lib/boards'
import { useItems, useUpdateItem } from '../../lib/items'
import { useSyncMentionLinks } from '../../lib/links'

/** 컬럼/카드 강조 색 후보 (null = 색 없음) */
const PALETTE = [null, '#cf6a6a', '#d6924a', '#d7b36a', '#5fae7a', '#5b8fd6', '#b07cc0']

/** 새 보드 기본 3막 구조 시드 */
const DEFAULT_ACTS = [
  { title: '1막: 설정', body: '소개, 세계관 구축, 사건의 발단', color: '#b07cc0' },
  { title: '2막: 대립', body: '상승 액션, 캐릭터 발전, 장애물', color: '#5b8fd6' },
  { title: '3막: 해결', body: '클라이맥스, 하강 액션, 해결', color: '#5fae7a' }
]

/**
 * 플롯보드 — 데이터형 컬럼(막) + 리치 파트 카드 보드.
 * 컬럼은 board_nodes(kind='group'), 카드는 kind='card'(col_id 로 컬럼 소속).
 * 보드 제목/설명은 보드 아이템(item.title / item.synopsis)을 직접 편집한다.
 */
export function PlotBoard({ project, item }: { project: Project; item: Item }): JSX.Element {
  const { data: nodes } = useBoardNodes(item.id)
  const { data: items } = useItems(project.id)
  const addNode = useAddBoardNode(item.id, project.id)
  const updateNode = useUpdateBoardNode(item.id)
  const deleteNode = useDeleteBoardNode(item.id)
  const updateItem = useUpdateItem(project.id)
  const syncLinks = useSyncMentionLinks(project.id)

  const columns = useMemo(
    () =>
      (nodes ?? [])
        .filter((n) => n.kind === 'group')
        .sort((a, b) => a.ord - b.ord || a.id.localeCompare(b.id)),
    [nodes]
  )
  const cards = useMemo(() => (nodes ?? []).filter((n) => n.kind === 'card'), [nodes])

  // 카드의 문서·언급을 그래프(links)에 반영 — 보드 아이템 → 대상 항목 'ref' 자동 링크
  const mentionedIds = useMemo(() => {
    const set = new Set<string>()
    for (const c of cards) {
      ;(c.doc_ids ?? []).forEach((id) => set.add(id))
      ;(c.mention_ids ?? []).forEach((id) => set.add(id))
    }
    return [...set].sort()
  }, [cards])
  const syncKey = mentionedIds.join(',')
  const lastSynced = useRef<string | null>(null)
  useEffect(() => {
    if (!nodes) return // 아직 로드 전이면 동기화하지 않음(전체 삭제로 오인 방지)
    if (lastSynced.current === syncKey) return
    lastSynced.current = syncKey
    syncLinks.mutate({ fromItem: item.id, toItemIds: mentionedIds })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey, nodes, item.id])

  const cardsOf = (colId: string): BoardNode[] =>
    cards
      .filter((c) => c.col_id === colId)
      .sort((a, b) => a.ord - b.ord || a.id.localeCompare(b.id))

  const maxColOrd = (): number => columns.reduce((m, c) => Math.max(m, c.ord), -1)

  function addColumn(): void {
    addNode.mutate({ kind: 'group', title: '새 막', body: '', ord: maxColOrd() + 1 })
  }
  function seedDefaultActs(): void {
    DEFAULT_ACTS.forEach((a, i) =>
      addNode.mutate({ kind: 'group', title: a.title, body: a.body, color: a.color, ord: i })
    )
  }
  async function moveColumn(col: BoardNode, dir: -1 | 1): Promise<void> {
    const idx = columns.findIndex((c) => c.id === col.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= columns.length) return
    const swap = columns[swapIdx]
    // ord 중복 시 인덱스 기반 값으로 강제 구분
    const [newColOrd, newSwapOrd] =
      col.ord !== swap.ord ? [swap.ord, col.ord] : [swapIdx, idx]
    try {
      await updateNode.mutateAsync({ id: col.id, patch: { ord: newColOrd } })
      await updateNode.mutateAsync({ id: swap.id, patch: { ord: newSwapOrd } })
    } catch {
      // 실패 시 refetch로 자동 복구
    }
  }

  const docItems = (items ?? []).filter((i) => i.type === 'document')
  const mentionItems = (items ?? []).filter((i) => i.type === 'sheet')

  // 빈 배경을 잡고 드래그해 보드를 패닝(스크롤). 카드/입력/버튼 위에서는 시작하지 않는다.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const pan = useRef({ active: false, x: 0, y: 0, left: 0, top: 0 })
  function onPanStart(e: React.PointerEvent<HTMLDivElement>): void {
    if (e.button !== 0) return
    const t = e.target as HTMLElement
    if (t.closest('[data-card], input, textarea, button')) return
    const el = scrollRef.current
    if (!el) return
    pan.current = { active: true, x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
    el.setPointerCapture(e.pointerId)
  }
  function onPanMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!pan.current.active) return
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = pan.current.left - (e.clientX - pan.current.x)
    el.scrollTop = pan.current.top - (e.clientY - pan.current.y)
  }
  function onPanEnd(e: React.PointerEvent<HTMLDivElement>): void {
    if (!pan.current.active) return
    pan.current.active = false
    scrollRef.current?.releasePointerCapture(e.pointerId)
  }

  const hasColumns = columns.length > 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 보드 헤더 — 제목/설명 인라인 편집 */}
      <div className="shrink-0 px-6 pb-3 pt-5">
        <input
          defaultValue={item.title}
          key={`t-${item.id}-${item.title}`}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v && v !== item.title) updateItem.mutate({ id: item.id, patch: { title: v } })
          }}
          placeholder="제목 없음"
          className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-text-faint"
        />
        <input
          defaultValue={item.synopsis ?? ''}
          key={`s-${item.id}-${item.synopsis ?? ''}`}
          onBlur={(e) => {
            const v = e.target.value
            if (v !== (item.synopsis ?? ''))
              updateItem.mutate({ id: item.id, patch: { synopsis: v || null } })
          }}
          placeholder="설명을 입력하세요"
          className="mt-1 w-full bg-transparent text-sm text-text-muted outline-none placeholder:text-text-faint"
        />
      </div>

      {!hasColumns ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-text-muted">
          <p className="text-sm">아직 막(컬럼)이 없습니다.</p>
          <div className="flex gap-2">
            <button
              onClick={seedDefaultActs}
              className="rounded-app border border-border bg-bg-elev px-3 py-1.5 text-sm hover:border-border-strong"
            >
              3막 구조로 시작
            </button>
            <button
              onClick={addColumn}
              className="rounded-app border border-dashed border-border px-3 py-1.5 text-sm hover:border-border-strong"
            >
              빈 막 추가
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          onPointerDown={onPanStart}
          onPointerMove={onPanMove}
          onPointerUp={onPanEnd}
          onPointerCancel={onPanEnd}
          className="no-scrollbar flex flex-1 cursor-grab gap-4 overflow-x-auto px-6 pb-6 [&:active]:cursor-grabbing"
        >
          {columns.map((col, idx) => (
            <Column
              key={col.id}
              col={col}
              projectId={project.id}
              cards={cardsOf(col.id)}
              columns={columns}
              isFirst={idx === 0}
              isLast={idx === columns.length - 1}
              docItems={docItems}
              mentionItems={mentionItems}
              onUpdateCol={(patch) => updateNode.mutate({ id: col.id, patch })}
              onDeleteCol={() => deleteNode.mutate(col.id)}
              onMoveCol={(dir) => moveColumn(col, dir)}
              onAddCard={() =>
                addNode.mutate({
                  kind: 'card',
                  col_id: col.id,
                  title: '새 파트 카드',
                  body: '',
                  ord: cardsOf(col.id).reduce((m, c) => Math.max(m, c.ord), -1) + 1
                })
              }
              onUpdateCard={(id, patch) => updateNode.mutate({ id, patch })}
              onDeleteCard={(id) => deleteNode.mutate(id)}
            />
          ))}
          <button
            onClick={addColumn}
            title="막 추가"
            className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-app border border-dashed border-border text-text-faint hover:border-border-strong hover:text-text"
          >
            <Plus size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

/** 한 컬럼(막) + 그 안의 파트 카드들 */
function Column({
  col,
  projectId,
  cards,
  columns,
  isFirst,
  isLast,
  docItems,
  mentionItems,
  onUpdateCol,
  onDeleteCol,
  onMoveCol,
  onAddCard,
  onUpdateCard,
  onDeleteCard
}: {
  col: BoardNode
  projectId: string
  cards: BoardNode[]
  columns: BoardNode[]
  isFirst: boolean
  isLast: boolean
  docItems: Item[]
  mentionItems: Item[]
  onUpdateCol: (patch: Partial<BoardNode>) => void
  onDeleteCol: () => void
  onMoveCol: (dir: -1 | 1) => void
  onAddCard: () => void
  onUpdateCard: (id: string, patch: Partial<BoardNode>) => void
  onDeleteCard: (id: string) => void
}): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex w-80 shrink-0 flex-col rounded-app bg-bg-elev/40">
      {/* 컬럼 헤더 */}
      <div
        className="flex items-start gap-2 rounded-t-app border-t-[3px] px-3 pb-2 pt-2.5"
        style={{ borderTopColor: col.color ?? 'var(--border)' }}
      >
        <div className="min-w-0 flex-1">
          <input
            defaultValue={col.title ?? ''}
            key={`${col.id}-${col.title}`}
            onBlur={(e) => onUpdateCol({ title: e.target.value })}
            placeholder="막 제목"
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-text-faint"
          />
          <input
            defaultValue={col.body ?? ''}
            key={`${col.id}-body-${col.body}`}
            onBlur={(e) => onUpdateCol({ body: e.target.value })}
            placeholder="부제 (선택)"
            className="mt-0.5 w-full bg-transparent text-xs text-text-muted outline-none placeholder:text-text-faint"
          />
        </div>
        <span className="mt-0.5 shrink-0 text-xs text-text-faint">{cards.length}</span>
        <div className="relative shrink-0">
          <button className="icon-btn p-1" title="막 메뉴" onClick={() => setMenuOpen((v) => !v)}>
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-app border border-border bg-bg-elev py-1 text-sm shadow-[var(--shadow)]">
                <div className="flex items-center gap-1 px-2 py-1">
                  {PALETTE.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => onUpdateCol({ color: c })}
                      className="h-4 w-4 shrink-0 rounded-full border border-border"
                      style={{ background: c ?? 'transparent' }}
                      title={c ?? '색 없음'}
                    />
                  ))}
                </div>
                <button
                  disabled={isFirst}
                  onClick={() => {
                    onMoveCol(-1)
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-bg-hover disabled:opacity-30"
                >
                  <ChevronLeft size={14} /> 왼쪽으로
                </button>
                <button
                  disabled={isLast}
                  onClick={() => {
                    onMoveCol(1)
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-bg-hover disabled:opacity-30"
                >
                  <ChevronRight size={14} /> 오른쪽으로
                </button>
                <button
                  onClick={() => {
                    if (
                      cards.length === 0 ||
                      window.confirm(`'${col.title}' 막과 카드 ${cards.length}개를 삭제할까요?`)
                    )
                      onDeleteCol()
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-danger hover:bg-bg-hover"
                >
                  <Trash2 size={14} /> 막 삭제
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 카드 목록 */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {cards.map((card) => (
          <PartCard
            key={card.id}
            card={card}
            projectId={projectId}
            columns={columns}
            docItems={docItems}
            mentionItems={mentionItems}
            onUpdate={(patch) => onUpdateCard(card.id, patch)}
            onDelete={() => onDeleteCard(card.id)}
          />
        ))}
        <button
          onClick={onAddCard}
          className="flex items-center justify-center gap-1.5 rounded-app border border-dashed border-border py-2 text-xs text-text-faint hover:border-border-strong hover:text-text"
        >
          <Plus size={14} /> 새 파트 카드
        </button>
      </div>
    </div>
  )
}

/** 파트 카드 — 제목/설명/문서/태그/언급 */
function PartCard({
  card,
  projectId,
  columns,
  docItems,
  mentionItems,
  onUpdate,
  onDelete
}: {
  card: BoardNode
  projectId: string
  columns: BoardNode[]
  docItems: Item[]
  mentionItems: Item[]
  onUpdate: (patch: Partial<BoardNode>) => void
  onDelete: () => void
}): JSX.Element {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  return (
    <div
      data-card
      className="rounded-app border bg-bg-elev p-3"
      style={{
        borderColor: card.color ?? 'var(--border)',
        borderLeftWidth: card.color ? 3 : 1,
        borderLeftColor: card.color ?? 'var(--border)'
      }}
    >
      <div className="flex items-start gap-2">
        <input
          ref={titleRef}
          defaultValue={card.title ?? ''}
          key={`${card.id}-${card.title}`}
          onBlur={(e) => onUpdate({ title: e.target.value })}
          placeholder="제목"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-text-faint"
        />
        <div className="relative shrink-0">
          <button className="icon-btn p-0.5" title="카드 메뉴" onClick={() => setMenuOpen((v) => !v)}>
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-app border border-border bg-bg-elev py-1 text-sm shadow-[var(--shadow)]">
                <div className="flex items-center gap-1 px-2 py-1">
                  {PALETTE.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => onUpdate({ color: c })}
                      className="h-4 w-4 shrink-0 rounded-full border border-border"
                      style={{ background: c ?? 'transparent' }}
                      title={c ?? '색 없음'}
                    />
                  ))}
                </div>
                {columns.length > 1 && (
                  <div className="border-t border-border px-2 py-1">
                    <div className="mb-1 px-1 text-xs text-text-faint">막 이동</div>
                    {columns
                      .filter((c) => c.id !== card.col_id)
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            onUpdate({ col_id: c.id })
                            setMenuOpen(false)
                          }}
                          className="block w-full truncate rounded px-1 py-1 text-left text-xs hover:bg-bg-hover"
                        >
                          {c.title || '제목 없는 막'}
                        </button>
                      ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    onDelete()
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-danger hover:bg-bg-hover"
                >
                  <Trash2 size={14} /> 카드 삭제
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <textarea
        defaultValue={card.body ?? ''}
        key={`${card.id}-body-${card.body}`}
        onBlur={(e) => onUpdate({ body: e.target.value })}
        rows={2}
        placeholder="비어있음"
        className="mt-1 w-full resize-none bg-transparent text-xs leading-relaxed text-text-muted outline-none placeholder:text-text-faint"
      />

      {/* 문서 */}
      <RefSection
        label="문서"
        icon={<FileText size={11} />}
        candidates={docItems}
        selectedIds={card.doc_ids ?? []}
        onChange={(ids) => onUpdate({ doc_ids: ids })}
        onOpen={(id) => navigate(`/p/${projectId}/i/${id}`)}
        addLabel="문서 추가"
      />

      {/* 태그 */}
      <div className="mt-2">
        <div className="mb-1 flex items-center gap-1 text-xs text-text-faint">
          <Tag size={11} /> 태그
        </div>
        <input
          defaultValue={(card.tags ?? []).join(', ')}
          key={`${card.id}-tags-${(card.tags ?? []).join(',')}`}
          onBlur={(e) => {
            const tags = e.target.value
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
            onUpdate({ tags })
          }}
          placeholder="쉼표로 구분하여 태그를 입력하세요"
          className="w-full bg-transparent text-xs outline-none placeholder:text-text-faint"
        />
        {(card.tags ?? []).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {(card.tags ?? []).map((t) => (
              <span
                key={t}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 언급(멘션) */}
      <RefSection
        label="언급"
        candidates={mentionItems}
        selectedIds={card.mention_ids ?? []}
        onChange={(ids) => onUpdate({ mention_ids: ids })}
        onOpen={(id) => navigate(`/p/${projectId}/i/${id}`)}
        addLabel="언급 추가"
      />
    </div>
  )
}

/** 문서/언급 공통 — 선택된 항목 칩 + 추가 팝오버 */
function RefSection({
  label,
  icon,
  candidates,
  selectedIds,
  onChange,
  onOpen,
  addLabel
}: {
  label: string
  icon?: JSX.Element
  candidates: Item[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onOpen: (id: string) => void
  addLabel: string
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates])
  const selected = selectedIds.filter((id) => byId.has(id))

  function toggle(id: string): void {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center gap-1 text-xs text-text-faint">
        {icon}
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {selected.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded border border-border bg-bg/40 px-1.5 py-0.5 text-[11px]"
          >
            <button onClick={() => onOpen(id)} className="max-w-[120px] truncate hover:underline">
              {byId.get(id)?.title || '제목 없음'}
            </button>
            <button
              onClick={() => onChange(selectedIds.filter((x) => x !== id))}
              className="text-text-faint hover:text-danger"
              title="제거"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded border border-dashed border-border px-1.5 py-0.5 text-[11px] text-text-faint hover:border-border-strong hover:text-text"
          >
            + {addLabel}
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute left-0 z-20 mt-1 max-h-56 w-56 overflow-y-auto rounded-app border border-border bg-bg-elev py-1 text-sm shadow-[var(--shadow)]">
                {candidates.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-text-faint">선택할 항목이 없습니다.</div>
                ) : (
                  candidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-bg-hover"
                    >
                      <span
                        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-border text-[9px]"
                        style={{
                          background: selectedIds.includes(c.id) ? 'var(--accent)' : 'transparent'
                        }}
                      >
                        {selectedIds.includes(c.id) ? '✓' : ''}
                      </span>
                      <span className="truncate">{c.title || '제목 없음'}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
