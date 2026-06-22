import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, PanelRight, PanelBottom } from 'lucide-react'
import type { Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { useCurrentItemId } from '../../lib/route'
import { pathToItem } from '../../lib/tree'
import { useUi } from '../../store/ui'
import { iconFor } from './itemIcons'
import { ItemPane } from './ItemView'
import { getTabDragData, hasTabDrag, setTabDragData } from './tabDnd'

/**
 * 분할 편집 창 — 메인과 독립된 자체 탭 + 본문.
 * 탭 클릭으로 전환, X로 탭 닫기, 우측/하단 방향 토글, 패널 닫기.
 */
export function SplitPane({ project }: { project: Project }): JSX.Element {
  const { data: items } = useItems(project.id)
  const nav = useNavigate()
  const mainItemId = useCurrentItemId()
  const {
    splitTabs,
    splitActive,
    splitDir,
    setSplitActive,
    openSplitTab,
    closeSplitTab,
    setSplitDir,
    closeSplit,
    moveTab
  } = useUi()
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // 드롭 처리 — beforeId 앞에 삽입(null이면 맨 끝).
  // 메인의 활성 탭을 분할로 끌어오면, 메인 라우트를 남은 탭으로 옮긴다.
  function handleDrop(e: React.DragEvent, beforeId: string | null): void {
    e.preventDefault()
    setDragOverId(null)
    const data = getTabDragData(e)
    if (!data) return
    const wasMainActive = data.pane === 'main' && data.id === mainItemId
    moveTab(data.id, data.pane, 'split', beforeId)
    if (wasMainActive) {
      const remaining = useUi.getState().tabs
      nav(remaining.length ? `/p/${project.id}/i/${remaining[0]}` : `/p/${project.id}`)
    }
  }

  const byId = new Map((items ?? []).map((i) => [i.id, i]))
  const openTabs = splitTabs.filter((id) => byId.has(id))
  const active = splitActive && byId.has(splitActive) ? byId.get(splitActive)! : undefined
  const crumbs = active ? pathToItem(items ?? [], active.id) : []

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
      {/* 분할 창 탭바 */}
      <div className="flex h-9 shrink-0 items-stretch gap-0.5 border-b border-border bg-bg-sidebar/40 px-1.5">
        <div
          onDragOver={(e) => {
            if (hasTabDrag(e)) e.preventDefault()
          }}
          onDrop={(e) => handleDrop(e, null)}
          className="flex flex-1 items-stretch gap-0.5 overflow-x-auto"
        >
          {openTabs.map((id) => {
            const it = byId.get(id)!
            const Icon = iconFor(it)
            const isActive = id === splitActive
            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => setTabDragData(e, { id, pane: 'split' })}
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
                  isActive ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover hover:text-text'
                } ${dragOverId === id ? 'shadow-[inset_2px_0_0_0_var(--accent)]' : ''}`}
              >
                <button
                  className="flex min-w-0 items-center gap-1.5"
                  onClick={() => setSplitActive(id)}
                >
                  <Icon size={13} className="shrink-0 opacity-80" />
                  <span className="truncate">{it.title}</span>
                </button>
                <button
                  className="shrink-0 rounded text-text-faint opacity-0 hover:text-text group-hover:opacity-100"
                  title="탭 닫기"
                  onClick={() => closeSplitTab(id)}
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 self-center">
          <button
            className={`icon-btn p-1 ${splitDir === 'right' ? 'text-accent' : ''}`}
            title="우측 분할"
            onClick={() => setSplitDir('right')}
          >
            <PanelRight size={15} />
          </button>
          <button
            className={`icon-btn p-1 ${splitDir === 'bottom' ? 'text-accent' : ''}`}
            title="하단 분할"
            onClick={() => setSplitDir('bottom')}
          >
            <PanelBottom size={15} />
          </button>
          <button className="icon-btn p-1" title="분할 닫기" onClick={closeSplit}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 분할 창 브레드크럼 */}
      {crumbs.length > 0 && (
        <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border px-3 text-sm text-text-muted">
          {crumbs.map((c, i) => (
            <span key={c.id} className="flex min-w-0 items-center gap-1">
              {i > 0 && <span className="text-text-faint">/</span>}
              <button
                className={`truncate hover:text-text ${i === crumbs.length - 1 ? 'text-text' : ''}`}
                onClick={() => openSplitTab(c.id)}
              >
                {c.title}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 분할 창 본문 */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {active ? (
          <ItemPane project={project} item={active} />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-text-faint">
            표시할 항목이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
