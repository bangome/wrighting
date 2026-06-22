import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Columns2, Network, Search } from 'lucide-react'
import type { Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { pathToItem } from '../../lib/tree'
import { useUi } from '../../store/ui'
import { Timer } from './Timer'
import { TasksPopover } from '../tasks/TasksPopover'

export function TopBar({ project }: { project: Project }): JSX.Element {
  const nav = useNavigate()
  const { itemId } = useParams()
  const { data: items } = useItems(project.id)
  const { rightPane, setRightPane, tabs, setPaletteOpen } = useUi()

  // 분할: 현재 메인 항목 또는 가장 최근 다른 탭을 우측에 띄운다
  function toggleSplit(): void {
    if (rightPane.type === 'item') {
      setRightPane({ type: 'none' })
      return
    }
    const companion = tabs.find((t) => t !== itemId) ?? itemId ?? tabs[0]
    if (companion) setRightPane({ type: 'item', itemId: companion })
  }

  const crumbs = itemId && items ? pathToItem(items, itemId) : []

  return (
    <header className="flex h-12 items-center gap-2 border-b border-border px-3">
      <button className="icon-btn" onClick={() => nav(-1)} title="뒤로">
        <ArrowLeft size={16} />
      </button>
      <button className="icon-btn" onClick={() => nav(1)} title="앞으로">
        <ArrowRight size={16} />
      </button>

      {/* 브레드크럼 */}
      <div className="flex min-w-0 items-center gap-1 text-sm text-text-muted">
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

      {/* 가운데 검색 (커맨드 팔레트 트리거) */}
      <button
        className="mx-auto flex w-[420px] items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-3 py-1.5 text-sm text-text-faint hover:border-border-strong"
        onClick={() => setPaletteOpen(true)}
      >
        <Search size={14} />
        검색
        <span className="ml-auto text-xs">⌘K</span>
      </button>

      <Timer />

      <TasksPopover project={project} />

      <button
        className={`icon-btn ${rightPane.type === 'item' ? 'text-accent' : ''}`}
        onClick={toggleSplit}
        title="분할 보기 (다른 항목을 나란히)"
      >
        <Columns2 size={16} />
      </button>
      <button
        className={`icon-btn ${rightPane.type === 'graph' ? 'text-accent' : ''}`}
        onClick={() => setRightPane(rightPane.type === 'graph' ? { type: 'none' } : { type: 'graph' })}
        title="관계 그래프 패널"
      >
        <Network size={16} />
      </button>
    </header>
  )
}
