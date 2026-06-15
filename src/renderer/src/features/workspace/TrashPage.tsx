import type { Project } from '@shared/types'
import { usePurgeItem, useRestoreItem, useTrashedItems } from '../../lib/items'
import { iconFor } from './itemIcons'

export function TrashPage({ project }: { project: Project }): JSX.Element {
  const { data: items } = useTrashedItems(project.id)
  const restore = useRestoreItem(project.id)
  const purge = usePurgeItem(project.id)

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h2 className="mb-1 text-lg font-semibold">휴지통</h2>
      <p className="mb-6 text-sm text-text-muted">삭제한 항목을 복원하거나 영구 삭제합니다.</p>
      {(items ?? []).length === 0 ? (
        <p className="text-text-faint">휴지통이 비어 있습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items!.map((it) => {
            const Icon = iconFor(it)
            return (
              <li
                key={it.id}
                className="group flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 hover:bg-bg-hover"
              >
                <Icon size={15} className="text-text-muted" />
                <span className="flex-1 truncate text-sm">{it.title}</span>
                <button
                  className="text-xs text-text-muted hover:text-text"
                  onClick={() => restore.mutate(it.id)}
                >
                  복원
                </button>
                <button
                  className="text-xs text-danger hover:underline"
                  onClick={() => {
                    if (confirm(`'${it.title}'을(를) 영구 삭제할까요?`)) purge.mutate(it.id)
                  }}
                >
                  영구 삭제
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
