import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, Plus, X } from 'lucide-react'
import type { Project, Task } from '@shared/types'
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
  return !isToday(d) && new Date(d).getTime() > Date.now()
}

/** 로컬 기준 YYYY-MM-DD (date 컬럼 저장용) */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function todayStr(): string {
  return ymd(new Date())
}
function tomorrowStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return ymd(d)
}

type Placement = 'inbox' | 'today' | 'upcoming'

/** 필터/배치값 → 저장할 마감일·버킷 */
function placementPatch(p: Placement): { due_date: string | null; bucket: Placement } {
  if (p === 'today') return { due_date: todayStr(), bucket: 'today' }
  if (p === 'upcoming') return { due_date: tomorrowStr(), bucket: 'upcoming' }
  return { due_date: null, bucket: 'inbox' }
}

/** 작업의 현재 배치 추정 */
function placementOf(t: { due_date: string | null }): Placement {
  if (isToday(t.due_date)) return 'today'
  if (isUpcoming(t.due_date)) return 'upcoming'
  return 'inbox'
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
        {placementOf(t) === 'upcoming' ? (
          <input
            type="date"
            value={t.due_date ?? ''}
            min={todayStr()}
            onChange={(e) => {
              const v = e.target.value
              if (v) update.mutate({ id: t.id, patch: { due_date: v, bucket: 'upcoming' } })
            }}
            title="예정 날짜"
            className="rounded-[var(--radius-sm)] border border-border bg-bg-elev px-1.5 py-0.5 text-xs text-text-muted outline-none"
          />
        ) : (
          t.due_date && (
            <span className="flex items-center gap-1 text-xs text-text-faint">
              <Flag size={11} />{' '}
              {new Date(t.due_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
          )
        )}
        <select
          value={placementOf(t)}
          onChange={(e) => update.mutate({ id: t.id, patch: placementPatch(e.target.value as Placement) })}
          title="작업 이동"
          className="rounded-[var(--radius-sm)] border border-border bg-bg-elev px-1.5 py-0.5 text-xs text-text-muted outline-none"
        >
          <option value="inbox">보관함</option>
          <option value="today">오늘</option>
          <option value="upcoming">예정</option>
        </select>
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
            // 현재 필터에 맞는 배치(마감일)로 추가 → 같은 필터 목록에 바로 보이도록
            const place: Placement = filter === 'all' ? 'inbox' : (filter as Placement)
            const { due_date, bucket } = placementPatch(place)
            add.mutate({ title: draft.trim(), bucket, due: due_date })
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
