import { useNavigate } from 'react-router-dom'
import type { Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { recentDocumentActivities, useBodyUpdates } from '../../lib/recentActivity'
import { iconFor } from './itemIcons'

/** 작품 홈 — 최근 항목 + 빠른 진입 */
export function ProjectHome({ project }: { project: Project }): JSX.Element {
  const nav = useNavigate()
  const { data: items } = useItems(project.id)
  const { data: bodyUpdates } = useBodyUpdates(project.id)

  const recent = (items ?? [])
    .filter((i) => i.type !== 'folder')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 12)
  const activities = recentDocumentActivities(items ?? [], bodyUpdates ?? [], 10)

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 sm:px-10 sm:py-10">
      <h1 className="mb-1 text-2xl font-semibold">{project.title}</h1>
      <p className="mb-8 text-sm text-text-muted">최근 작업한 문서로 이어서 시작하세요.</p>

      <h2 className="mb-3 text-sm font-medium text-text-muted">최근 항목</h2>
      {recent.length === 0 ? (
        <p className="text-text-faint">
          왼쪽 트리에서 <span className="text-text">+</span> 로 문서·캐릭터를 만들어 시작하세요.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {recent.map((it) => {
            const Icon = iconFor(it)
            return (
              <button
                key={it.id}
                className="flex flex-col gap-2 rounded-app border border-border bg-bg-elev p-3 text-left hover:border-border-strong"
                onClick={() => nav(`/p/${project.id}/i/${it.id}`)}
              >
                <Icon size={18} className="text-text-muted" />
                <span className="truncate text-sm font-medium">{it.title}</span>
                {it.synopsis && (
                  <span className="line-clamp-2 text-xs text-text-faint">{it.synopsis}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-10 border-t border-border pt-6">
        <h2 className="mb-3 text-sm font-medium text-text-muted">최근 문서 내역</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-text-faint">최근 생성되거나 편집된 문서·시트가 없습니다.</p>
        ) : (
          <div className="divide-y divide-border rounded-app border border-border bg-bg-elev">
            {activities.map((activity) => {
              const Icon = iconFor(activity.item)
              return (
                <button
                  key={`${activity.item.id}-${activity.timestamp}`}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bg-hover"
                  onClick={() => nav(`/p/${project.id}/i/${activity.item.id}`)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-app bg-bg-active text-text-muted">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{activity.item.title}</span>
                    <span className="block truncate text-xs text-text-faint">
                      {activity.item.type === 'sheet' ? '시트' : '문서'} ·{' '}
                      {activity.source === 'body' ? '본문' : '항목'} 변경
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-text-muted">
                    <span className="block">{activity.kind === 'created' ? '생성' : '편집'}</span>
                    <span className="block text-text-faint">{formatActivityTime(activity.timestamp)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function formatActivityTime(timestamp: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp))
}
