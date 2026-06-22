import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Columns2, PanelRight, PanelBottom, ExternalLink } from 'lucide-react'
import type { Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { useCurrentItemId } from '../../lib/route'
import { useUi } from '../../store/ui'
import { iconFor } from './itemIcons'
import { getTabDragData, hasTabDrag, setTabDragData } from './tabDnd'

/** 열린 문서 탭 바 — 클릭 전환, X 닫기, 우측 끝 분할 메뉴 */
export function TabBar({ project }: { project: Project }): JSX.Element | null {
  const nav = useNavigate()
  const itemId = useCurrentItemId()
  const { data: items } = useItems(project.id)
  const { tabs, closeTab, openSplit, moveTab } = useUi()
  const [splitMenu, setSplitMenu] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // 세로 휠을 가로 스크롤로 변환 (가로 휠 입력은 기본 동작 유지)
  function handleWheel(e: React.WheelEvent<HTMLDivElement>): void {
    const el = scrollRef.current
    if (!el || e.deltaY === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    el.scrollLeft += e.deltaY
  }

  const byId = new Map((items ?? []).map((i) => [i.id, i]))
  // 트리에서 사라진(삭제된) 탭은 표시하지 않음
  const openTabs = tabs.filter((id) => byId.has(id))
  if (openTabs.length === 0) return null

  // 드롭 처리 — beforeId 앞에 삽입(null이면 맨 끝). 다른 창에서 온 탭이면 메인에서 활성화.
  function handleDrop(e: React.DragEvent, beforeId: string | null): void {
    e.preventDefault()
    setDragOverId(null)
    const data = getTabDragData(e)
    if (!data) return
    moveTab(data.id, data.pane, 'main', beforeId)
    if (data.pane !== 'main') nav(`/p/${project.id}/i/${data.id}`)
  }

  function handleClose(id: string): void {
    const idx = openTabs.indexOf(id)
    closeTab(id)
    if (id !== itemId) return
    const next = openTabs[idx + 1] ?? openTabs[idx - 1]
    nav(next ? `/p/${project.id}/i/${next}` : `/p/${project.id}`)
  }

  function split(dir: 'right' | 'bottom'): void {
    setSplitMenu(false)
    if (itemId) openSplit(itemId, dir)
  }
  function openNewWindow(): void {
    setSplitMenu(false)
    if (!itemId) return
    const { origin, pathname } = window.location
    window.open(`${origin}${pathname}#/p/${project.id}/i/${itemId}`, '_blank')
  }

  return (
    <div className="flex h-9 items-stretch gap-0.5 border-b border-border bg-bg-sidebar/40 px-1.5">
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        onDragOver={(e) => {
          if (hasTabDrag(e)) e.preventDefault()
        }}
        onDrop={(e) => handleDrop(e, null)}
        className="no-scrollbar flex flex-1 items-stretch gap-0.5 overflow-x-auto"
      >
        {openTabs.map((id) => {
          const it = byId.get(id)!
          const Icon = iconFor(it)
          const active = id === itemId
          return (
            <div
              key={id}
              draggable
              onDragStart={(e) => setTabDragData(e, { id, pane: 'main' })}
              onDragEnd={() => setDragOverId(null)}
              onDragOver={(e) => {
                if (!hasTabDrag(e)) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverId(id)
              }}
              onDrop={(e) => {
                e.stopPropagation()
                handleDrop(e, id)
              }}
              className={`group flex max-w-[180px] shrink-0 items-center gap-1.5 self-center rounded-[var(--radius-sm)] px-2.5 py-1 text-sm ${
                active ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover hover:text-text'
              } ${dragOverId === id ? 'shadow-[inset_2px_0_0_0_var(--accent)]' : ''}`}
            >
              <button
                className="flex min-w-0 items-center gap-1.5"
                onClick={() => nav(`/p/${project.id}/i/${id}`)}
              >
                <Icon size={13} className="shrink-0 opacity-80" />
                <span className="truncate">{it.title}</span>
              </button>
              <button
                className="shrink-0 rounded text-text-faint opacity-0 hover:text-text group-hover:opacity-100"
                title="탭 닫기"
                onClick={() => handleClose(id)}
              >
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>

      {/* 우측 끝 — 분할 메뉴 */}
      <div className="relative flex shrink-0 items-center self-center">
        <button
          className="icon-btn p-1"
          title="창 분할"
          onClick={() => setSplitMenu((o) => !o)}
          disabled={!itemId}
        >
          <Columns2 size={16} />
        </button>
        {splitMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setSplitMenu(false)} />
            <div className="absolute right-0 top-8 z-40 w-44 rounded-app border border-border bg-bg-elev py-1.5 shadow-[var(--shadow)]">
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-bg-hover"
                onClick={() => split('right')}
              >
                <PanelRight size={15} className="text-text-muted" /> 우측 분할
              </button>
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-bg-hover"
                onClick={() => split('bottom')}
              >
                <PanelBottom size={15} className="text-text-muted" /> 하단 분할
              </button>
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-bg-hover"
                onClick={openNewWindow}
              >
                <ExternalLink size={15} className="text-text-muted" /> 새 창에서 열기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
