import { useNavigate } from 'react-router-dom'
import { StickyNote, Network } from 'lucide-react'
import type { Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { pathToItem } from '../../lib/tree'
import { useCurrentItemId } from '../../lib/route'
import { useUi } from '../../store/ui'
import { TasksPopover } from '../tasks/TasksPopover'
import { BacklinksButton } from '../links/BacklinksButton'
import { StatusPicker } from './StatusPicker'

/**
 * 브레드크럼 행 + 항목 컨텍스트 아이콘.
 * 우측 아이콘은 실제 동작하는 것만 노출한다(메모·백링크·작업·그래프·분할).
 */
export function ContextBar({ project }: { project: Project }): JSX.Element | null {
  const nav = useNavigate()
  const itemId = useCurrentItemId()
  const { data: items } = useItems(project.id)
  const { rightPane, setRightPane } = useUi()

  // 항목을 연 화면에서만 표시 (작품 홈·그래프·작업·노트 등에선 숨김)
  if (!itemId) return null

  const crumbs = itemId && items ? pathToItem(items, itemId) : []
  const memoCount = (items ?? []).filter(
    (i) => i.type === 'notes' && i.linked_item_id === itemId
  ).length

  function toggle(pane: 'memo' | 'graph'): void {
    setRightPane(rightPane.type === pane ? { type: 'none' } : { type: pane })
  }

  const iconBtn = (active: boolean): string =>
    `icon-btn relative ${active ? 'text-accent' : ''}`

  return (
    <div className="flex h-9 items-center gap-2 border-b border-border px-3">
      {/* 브레드크럼 */}
      <div className="flex min-w-0 flex-1 items-center gap-1 text-sm text-text-muted">
        {crumbs.length === 0 ? (
          <span className="truncate">{project.title}</span>
        ) : (
          crumbs.map((c, i) => (
            <span key={c.id} className="flex min-w-0 items-center gap-1">
              {i > 0 && <span className="text-text-faint">/</span>}
              <button
                className={`truncate hover:text-text ${i === crumbs.length - 1 ? 'text-text' : ''}`}
                onClick={() => nav(`/p/${project.id}/i/${c.id}`)}
              >
                {c.title}
              </button>
            </span>
          ))
        )}
      </div>

      {/* 컨텍스트 아이콘 */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          className={iconBtn(rightPane.type === 'memo')}
          onClick={() => toggle('memo')}
          title="메모"
        >
          <StickyNote size={16} />
          {memoCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-none text-white">
              {memoCount}
            </span>
          )}
        </button>
        <BacklinksButton project={project} itemId={itemId} />
        <TasksPopover project={project} />
        <StatusPicker project={project} itemId={itemId} />
        <button
          className={iconBtn(rightPane.type === 'graph')}
          onClick={() => toggle('graph')}
          title="관계 그래프"
        >
          <Network size={16} />
        </button>
      </div>
    </div>
  )
}
