import { useNavigate } from 'react-router-dom'
import type { Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { iconFor } from './itemIcons'

/** 작품 홈 — 최근 항목 + 빠른 진입 */
export function ProjectHome({ project }: { project: Project }): JSX.Element {
  const nav = useNavigate()
  const { data: items } = useItems(project.id)

  const recent = (items ?? [])
    .filter((i) => i.type !== 'folder')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 12)

  return (
    <div className="mx-auto max-w-4xl px-10 py-10">
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
    </div>
  )
}
