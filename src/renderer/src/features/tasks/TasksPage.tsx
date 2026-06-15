import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, Plus, X } from 'lucide-react'
import type { Project, Task, TaskBucket } from '@shared/types'
import { useItems } from '../../lib/items'
import { useAddTask, useDeleteTask, useTasks, useUpdateTask } from '../../lib/tasks'

type Filter = 'inbox' | 'today' | 'upcoming' | 'all'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'inbox', label: '보관함' },
  { value: 'today', label: '오늘' },
  { value: 'upcoming', label: '예정' },
  { value: 'all', label: '모든 작업' }
]

function isToday(d: string | null): boolean {
  if (!d) return false
  return new Date(d).toDateString() === new Date().toDateString()
}
function isUpcoming(d: string | null): boolean {
  if (!d) return false
  return new Date(d).getTime() > Date.now()
}

export function TasksPage({ project }: { project: Project }): JSX.Element {
  const nav = useNavigate()
  const { data: tasks } = useTasks(project.id)
  const { data: items } = useItems(project.id)
  const add = useAddTask(project.id)
  const update = useUpdateTask(project.id)
  const del = useDeleteTask(project.id)
  const [filter, setFilter] = useState<Filter>('all')
  const [draft, setDraft] = useState('')

  const titleOf = (id: string | null): string | null =>
    id ? (items?.find((i) => i.id === id)?.title ?? null) : null

  const filtered = (tasks ?? []).filter((t) => {
    if (filter === 'all') return true
    if (filter === 'inbox') return t.bucket === 'inbox' && !t.item_id
    if (filter === 'today') return isToday(t.due_date)
    if (filter === 'upcoming') return isUpcoming(t.due_date)
    return true
  })

  function Row({ t }: { t: Task }): JSX.Element {
    const item = titleOf(t.item_id)
    return (
      <li className="group flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 hover:bg-bg-hover">
        <button
          onClick={() => update.mutate({ id: t.id, patch: { done: !t.done } })}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            t.done ? 'border-ok bg-ok text-white' : 'border-border-strong'
          }`}
        >
          {t.done && '✓'}
        </button>
        <span className={`flex-1 text-sm ${t.done ? 'text-text-faint line-through' : ''}`}>
          {t.title}
        </span>
        {item && (
          <button
            className="text-xs text-text-faint hover:text-text"
            onClick={() => nav(`/p/${project.id}/i/${t.item_id}`)}
          >
            {item}
          </button>
        )}
        {t.due_date && (
          <span className="flex items-center gap-1 text-xs text-text-faint">
            <Flag size={11} /> {new Date(t.due_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <button
          className="opacity-0 group-hover:opacity-100 text-text-faint hover:text-danger"
          onClick={() => del.mutate(t.id)}
        >
          <X size={13} />
        </button>
      </li>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-5 flex items-center gap-2">
        <h1 className="text-lg font-semibold">작업</h1>
      </div>

      <div className="mb-4 flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === f.value ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <form
        className="mb-4 flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (draft.trim()) {
            add.mutate({ title: draft.trim(), bucket: filter === 'all' ? 'inbox' : (filter as TaskBucket) })
            setDraft('')
          }
        }}
      >
        <Plus size={15} className="text-text-faint" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="새 작업 추가…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-faint"
        />
      </form>

      {filtered.length === 0 ? (
        <p className="mt-12 text-center text-sm text-text-faint">아직 작업이 없습니다.</p>
      ) : (
        <ul className="flex flex-col">
          {filtered.map((t) => (
            <Row key={t.id} t={t} />
          ))}
        </ul>
      )}
    </div>
  )
}
