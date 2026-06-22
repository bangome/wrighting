import { X } from 'lucide-react'
import type { Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { useUi, type RightPane as RightPaneState } from '../../store/ui'
import { GraphPanel } from '../graph/GraphPanel'
import { ItemPane } from './ItemView'

/** 우측 분할 패널 — 그래프 또는 열린 항목 하나를 메인과 나란히 표시 */
export function RightPane({ project }: { project: Project }): JSX.Element {
  const { data: items } = useItems(project.id)
  const { rightPane, tabs, setRightPane } = useUi()

  const byId = new Map((items ?? []).map((i) => [i.id, i]))
  const openTabs = tabs.filter((id) => byId.has(id))

  const value = rightPane.type === 'item' ? `item:${rightPane.itemId}` : rightPane.type
  function onSelect(v: string): void {
    if (v === 'graph') setRightPane({ type: 'graph' })
    else if (v.startsWith('item:')) setRightPane({ type: 'item', itemId: v.slice(5) })
  }

  const paneItem =
    rightPane.type === 'item' ? byId.get(rightPane.itemId) : undefined

  return (
    <div className="flex h-full flex-col border-l border-border">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2">
        <select
          value={value}
          onChange={(e) => onSelect(e.target.value)}
          className="h-7 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-2 text-xs outline-none"
        >
          <option value="graph">관계 그래프</option>
          {openTabs.map((id) => (
            <option key={id} value={`item:${id}`}>
              {byId.get(id)!.title}
            </option>
          ))}
        </select>
        <button
          className="icon-btn p-1"
          title="분할 닫기"
          onClick={() => setRightPane({ type: 'none' } as RightPaneState)}
        >
          <X size={15} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {rightPane.type === 'graph' ? (
          <GraphPanel project={project} />
        ) : paneItem ? (
          <ItemPane project={project} item={paneItem} />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-text-faint">
            표시할 항목을 선택하세요.
          </div>
        )}
      </div>
    </div>
  )
}
