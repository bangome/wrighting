import { useNavigate } from 'react-router-dom'
import { LayoutGrid, List as ListIcon, StickyNote, GanttChartSquare } from 'lucide-react'
import type { FolderView as FolderViewType, Item, Project } from '@shared/types'
import { useItems, useUpdateItem } from '../../lib/items'
import { useLabels, useStatuses } from '../../lib/labels'
import { childrenOf } from '../../lib/tree'
import { iconFor } from '../workspace/itemIcons'

const TABS: { value: FolderViewType; label: string; Icon: typeof LayoutGrid }[] = [
  { value: 'grid', label: '그리드', Icon: LayoutGrid },
  { value: 'list', label: '리스트', Icon: ListIcon },
  { value: 'corkboard', label: '프리보드', Icon: StickyNote },
  { value: 'timeline', label: '타임라인', Icon: GanttChartSquare }
]

export function FolderView({ project, folder }: { project: Project; folder: Item }): JSX.Element {
  const nav = useNavigate()
  const { data: items } = useItems(project.id)
  const { data: labels } = useLabels(project.id)
  const { data: statuses } = useStatuses(project.id)
  const update = useUpdateItem(project.id)
  const children = childrenOf(items ?? [], folder.id)
  const view: FolderViewType = folder.folder_view ?? 'grid'

  const open = (id: string): void => nav(`/p/${project.id}/i/${id}`)
  const statusOf = (it: Item) => statuses?.find((s) => s.id === it.status_id)

  return (
    <div className="flex h-full flex-col">
      <div className="px-8 pt-8">
        <h1 className="text-xl font-semibold">{folder.title}</h1>
        <p className="mt-1 text-sm text-text-muted">문서 정리 및 관리를 위한 폴더</p>
      </div>

      {/* 뷰 탭 */}
      <div className="mt-4 flex gap-1 border-b border-border px-8">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => update.mutate({ id: folder.id, patch: { folder_view: t.value } })}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${
              view === t.value
                ? 'border-text text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <t.Icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-8 py-6">
        {children.length === 0 ? (
          <p className="text-text-faint">비어 있는 폴더입니다.</p>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {children.map((c) => {
              const Icon = iconFor(c)
              const st = statusOf(c)
              return (
                <button
                  key={c.id}
                  onClick={() => open(c.id)}
                  className="flex h-36 flex-col gap-2 rounded-app border border-border bg-bg-elev p-3 text-left hover:border-border-strong"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon size={14} className="text-text-muted" />
                    <span className="truncate">{c.title}</span>
                    {st && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-text-faint">
                        <i className="h-2 w-2 rounded-full" style={{ background: st.color }} />
                        {st.name}
                      </span>
                    )}
                  </div>
                  <span className="line-clamp-4 text-xs leading-relaxed text-text-faint">
                    {c.synopsis || '설명 없음'}
                  </span>
                </button>
              )
            })}
          </div>
        ) : view === 'list' ? (
          <ul className="flex flex-col">
            {children.map((c) => {
              const Icon = iconFor(c)
              return (
                <li key={c.id}>
                  <button
                    onClick={() => open(c.id)}
                    className="flex w-full items-baseline gap-2 border-b border-border/60 py-2.5 text-left hover:bg-bg-hover"
                  >
                    <Icon size={14} className="shrink-0 translate-y-0.5 text-text-muted" />
                    <span className="text-sm font-medium">{c.title}</span>
                    <span className="truncate text-xs text-text-faint">{c.synopsis}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : view === 'corkboard' ? (
          <div className="flex flex-wrap gap-5">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => open(c.id)}
                className="flex h-44 w-60 flex-col rounded-[4px] border border-border bg-bg-elev p-4 text-left shadow-[var(--shadow)] hover:border-border-strong"
              >
                <div className="mb-2 border-b border-border pb-2 text-sm font-semibold">
                  {c.title}
                </div>
                <span className="line-clamp-5 text-xs leading-relaxed text-text-muted">
                  {c.synopsis || '설명을 입력하세요'}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <TimelineView children={children} labels={labels ?? []} onOpen={open} />
        )}
      </div>
    </div>
  )
}

/** 라벨 색상 레인 기준 타임라인 (스크린샷 326483) */
function TimelineView({
  children,
  labels,
  onOpen
}: {
  children: Item[]
  labels: { id: string; name: string; color: string }[]
  onOpen: (id: string) => void
}): JSX.Element {
  const lanes = [{ id: null as string | null, name: '라벨 없음', color: '#6b6b74' }, ...labels]
  return (
    <div className="flex flex-col gap-8">
      {lanes.map((lane) => {
        const inLane = children.filter((c) => (c.label_id ?? null) === lane.id)
        return (
          <div key={lane.id ?? 'none'} className="relative">
            <div className="mb-3 flex items-center gap-2 text-xs text-text-muted">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: lane.color }} />
              {lane.name}
            </div>
            <div
              className="absolute left-0 right-0 top-9 h-px"
              style={{ background: lane.color, opacity: 0.4 }}
            />
            <div className="flex flex-wrap gap-4 pt-2">
              {inLane.length === 0 ? (
                <span className="text-xs text-text-faint">—</span>
              ) : (
                inLane.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onOpen(c.id)}
                    className="w-56 rounded-app border border-border bg-bg-elev p-3 text-left hover:border-border-strong"
                  >
                    <div className="mb-1 truncate text-sm font-medium">{c.title}</div>
                    <span className="line-clamp-3 text-xs text-text-faint">{c.synopsis}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
