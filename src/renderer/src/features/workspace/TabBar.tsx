import { useNavigate, useParams } from 'react-router-dom'
import { X } from 'lucide-react'
import type { Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { useUi } from '../../store/ui'
import { iconFor } from './itemIcons'

/** 열린 문서 탭 바 — 클릭 전환, X 닫기 */
export function TabBar({ project }: { project: Project }): JSX.Element | null {
  const nav = useNavigate()
  const { itemId } = useParams()
  const { data: items } = useItems(project.id)
  const { tabs, closeTab } = useUi()

  const byId = new Map((items ?? []).map((i) => [i.id, i]))
  // 트리에서 사라진(삭제된) 탭은 표시하지 않음
  const openTabs = tabs.filter((id) => byId.has(id))
  if (openTabs.length === 0) return null

  function handleClose(id: string): void {
    const idx = openTabs.indexOf(id)
    closeTab(id)
    if (id !== itemId) return
    const next = openTabs[idx + 1] ?? openTabs[idx - 1]
    nav(next ? `/p/${project.id}/i/${next}` : `/p/${project.id}`)
  }

  return (
    <div className="flex h-9 items-stretch gap-0.5 overflow-x-auto border-b border-border bg-bg-sidebar/40 px-1.5">
      {openTabs.map((id) => {
        const it = byId.get(id)!
        const Icon = iconFor(it)
        const active = id === itemId
        return (
          <div
            key={id}
            className={`group flex max-w-[180px] shrink-0 items-center gap-1.5 self-center rounded-[var(--radius-sm)] px-2.5 py-1 text-sm ${
              active ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover hover:text-text'
            }`}
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
  )
}
