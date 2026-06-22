import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Flag } from 'lucide-react'
import type { Project, Task } from '@shared/types'
import { useTasks, useUpdateTask } from '../../lib/tasks'

/** 상단 우측 작업 버튼 + 팝오버 — 현재 파일/보관함 작업을 빠르게 확인·체크 */
export function TasksPopover({ project }: { project: Project }): JSX.Element {
  const nav = useNavigate()
  const { itemId } = useParams()
  const { data: tasks } = useTasks(project.id)
  const update = useUpdateTask(project.id)
  const [open, setOpen] = useState(false)

  const all = tasks ?? []
  const current = itemId ? all.filter((t) => t.item_id === itemId) : []
  const inbox = all.filter((t) => !t.item_id)
  // 배지: 현재 파일 + 보관함의 미완료 수
  const openCount = [...current, ...inbox].filter((t) => !t.done).length

  function Row({ t }: { t: Task }): JSX.Element {
    return (
      <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-bg-hover">
        <button
          onClick={() => update.mutate({ id: t.id, patch: { done: !t.done } })}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
            t.done ? 'border-ok bg-ok text-white' : 'border-border-strong'
          }`}
        >
          {t.done && '✓'}
        </button>
        <span className={`flex-1 truncate text-sm ${t.done ? 'text-text-faint line-through' : 'font-medium'}`}>
          {t.title}
        </span>
        {t.due_date && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-text-faint">
            <Flag size={11} />
            {new Date(t.due_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    )
  }

  function Section({ title, items }: { title: string; items: Task[] }): JSX.Element | null {
    if (items.length === 0) return null
    return (
      <div className="mb-1">
        <div className="px-2 py-1 text-xs text-text-faint">{title}</div>
        {items.map((t) => (
          <Row key={t.id} t={t} />
        ))}
      </div>
    )
  }

  const empty = current.length === 0 && inbox.length === 0

  return (
    <div className="relative">
      <button className="icon-btn" title="작업" onClick={() => setOpen((v) => !v)}>
        <CheckCircle2 size={16} />
        {openCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {openCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-30 w-80 rounded-app border border-border bg-bg-elev p-2 shadow-[var(--shadow)]">
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <span className="text-sm font-semibold">작업</span>
              <button
                className="text-xs text-text-muted hover:text-text"
                onClick={() => {
                  setOpen(false)
                  nav(`/p/${project.id}/tasks`)
                }}
              >
                전체 보기
              </button>
            </div>
            {empty ? (
              <p className="px-2 py-6 text-center text-sm text-text-faint">작업이 없습니다.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <Section title="현재 파일" items={current} />
                <Section title="보관함" items={inbox} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
