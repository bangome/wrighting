import { useEffect, useRef, useState } from 'react'
import {
  Circle,
  Diamond,
  FilePlus2,
  Search,
  Shapes,
  Square,
  SquareDashedBottom,
  StickyNote
} from 'lucide-react'
import type { Item } from '@shared/types'
import { iconFor } from '../workspace/itemIcons'

const SHAPES = [
  { shape: 'rectangle', label: '사각형', Icon: Square },
  { shape: 'roundRect', label: '둥근 사각형', Icon: SquareDashedBottom },
  { shape: 'ellipse', label: '타원', Icon: Circle },
  { shape: 'diamond', label: '마름모', Icon: Diamond }
] as const

/** 캔버스 상단 도구막대: 빈 카드 / 기존 파일 추가 / 도형 그리기 */
export function CanvasToolbar({
  items,
  usedRefIds,
  onAddCard,
  onAddShape,
  onAddRef
}: {
  items: Item[]
  usedRefIds: Set<string>
  onAddCard: () => void
  onAddShape: (shape: string) => void
  onAddRef: (itemId: string) => void
}): JSX.Element {
  const [open, setOpen] = useState<null | 'file' | 'shape'>(null)
  const [q, setQ] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent): void {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pickable = items.filter(
    (i) => (i.type === 'document' || i.type === 'sheet') && !usedRefIds.has(i.id)
  )
  const filtered = q
    ? pickable.filter((i) => i.title.toLowerCase().includes(q.toLowerCase()))
    : pickable

  const btn =
    'flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-text-muted hover:bg-bg-hover hover:text-text'

  return (
    <div
      ref={wrapRef}
      className="absolute left-4 top-4 z-10 flex items-center gap-0.5 rounded-app border border-border bg-bg-elev p-1 shadow-[var(--shadow)]"
    >
      <button onClick={onAddCard} className={btn}>
        <StickyNote size={15} /> 카드
      </button>

      <div className="relative">
        <button
          onClick={() => setOpen(open === 'file' ? null : 'file')}
          className={btn}
          aria-expanded={open === 'file'}
        >
          <FilePlus2 size={15} /> 파일 추가
        </button>
        {open === 'file' && (
          <div className="absolute left-0 top-[calc(100%+6px)] w-64 rounded-app border border-border bg-bg-elev p-1.5 shadow-[var(--shadow-lg,var(--shadow))]">
            <div className="mb-1 flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-bg-active px-2">
              <Search size={13} className="text-text-faint" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="문서·시트 검색"
                className="w-full bg-transparent py-1.5 text-sm outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-2 py-3 text-center text-xs text-text-faint">
                  추가할 문서·시트가 없습니다
                </div>
              ) : (
                filtered.map((i) => {
                  const Icon = iconFor(i)
                  return (
                    <button
                      key={i.id}
                      onClick={() => {
                        onAddRef(i.id)
                        setOpen(null)
                        setQ('')
                      }}
                      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm hover:bg-bg-hover"
                    >
                      <Icon size={14} className="shrink-0 text-text-muted" />
                      <span className="truncate">{i.title}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen(open === 'shape' ? null : 'shape')}
          className={btn}
          aria-expanded={open === 'shape'}
        >
          <Shapes size={15} /> 도형
        </button>
        {open === 'shape' && (
          <div className="absolute left-0 top-[calc(100%+6px)] w-40 rounded-app border border-border bg-bg-elev p-1.5 shadow-[var(--shadow-lg,var(--shadow))]">
            {SHAPES.map(({ shape, label, Icon }) => (
              <button
                key={shape}
                onClick={() => {
                  onAddShape(shape)
                  setOpen(null)
                }}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm hover:bg-bg-hover"
              >
                <Icon size={15} className="text-text-muted" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
