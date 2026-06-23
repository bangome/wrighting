import { useEffect, useState } from 'react'
import { del } from 'idb-keyval'
import { Trash2, Plus } from 'lucide-react'
import type { Project } from '@shared/types'
import { useUi, type Theme } from '../../store/ui'
import { queryClient } from '../../lib/query'
import {
  useStatuses,
  useAddStatus,
  useUpdateStatus,
  useDeleteStatus,
  STATUS_COLORS
} from '../../lib/labels'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark', label: '다크' },
  { value: 'light', label: '라이트' },
  { value: 'system', label: '시스템' }
]

/** 작품별 상태(초안·완료 등) 관리 */
function StatusSettings({ project }: { project: Project }): JSX.Element {
  const { data: statuses } = useStatuses(project.id)
  const add = useAddStatus(project.id)
  const update = useUpdateStatus(project.id)
  const remove = useDeleteStatus(project.id)
  const [newName, setNewName] = useState('')

  function addStatus(): void {
    const name = newName.trim()
    if (!name) return
    const color = STATUS_COLORS[(statuses?.length ?? 0) % STATUS_COLORS.length]
    add.mutate({ name, color })
    setNewName('')
  }

  return (
    <section className="mb-6">
      <h3 className="mb-1 text-sm font-medium text-text-muted">상태</h3>
      <p className="mb-3 text-xs text-text-faint">
        이 작품의 상태 목록입니다. 항목 상단 상태 아이콘에서 지정할 수 있습니다.
      </p>

      <div className="flex flex-col gap-1.5">
        {(statuses ?? []).map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <input
              type="color"
              value={s.color}
              onChange={(e) => update.mutate({ id: s.id, patch: { color: e.target.value } })}
              className="h-6 w-6 shrink-0 cursor-pointer rounded border border-border bg-transparent"
              title="색상"
            />
            <input
              defaultValue={s.name}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== s.name) update.mutate({ id: s.id, patch: { name: v } })
              }}
              className="flex-1 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-2 py-1 text-sm outline-none"
            />
            <button
              className="icon-btn p-1 text-text-faint hover:text-danger"
              title="상태 삭제"
              onClick={() => remove.mutate(s.id)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {(statuses ?? []).length === 0 && (
          <p className="text-xs text-text-faint">아직 상태가 없습니다. 아래에서 추가하세요.</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addStatus()}
          placeholder="새 상태 이름 (예: 초안, 완료됨)"
          className="flex-1 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-2 py-1 text-sm outline-none"
        />
        <button
          onClick={addStatus}
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border px-3 py-1 text-sm text-text-muted hover:text-text"
        >
          <Plus size={14} /> 추가
        </button>
      </div>
    </section>
  )
}

export function SettingsPage({ project }: { project?: Project }): JSX.Element {
  const { theme, setTheme } = useUi()
  const [online, setOnline] = useState(navigator.onLine)
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    const on = (): void => setOnline(true)
    const off = (): void => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  async function clearCache(): Promise<void> {
    queryClient.clear()
    await del('wrighting-query-cache')
    setCleared(true)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-8">
      <h2 className="mb-6 text-lg font-semibold">설정</h2>

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-text-muted">테마</h3>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`rounded-[var(--radius-sm)] border px-4 py-1.5 text-sm ${
                theme === t.value
                  ? 'border-accent bg-accent-soft text-text'
                  : 'border-border text-text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {project && <StatusSettings project={project} />}

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-text-muted">오프라인</h3>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2 w-2 rounded-full ${online ? 'bg-ok' : 'bg-text-faint'}`}
            aria-hidden
          />
          <span>{online ? '온라인 — 변경 사항이 클라우드와 동기화됩니다.' : '오프라인 — 저장된 캐시로 읽기만 가능합니다.'}</span>
        </div>
        <p className="mt-2 text-xs text-text-faint">
          최근 열어본 작품은 기기에 캐시되어 오프라인에서도 읽을 수 있습니다(최대 7일).
        </p>
        <button
          onClick={() => void clearCache()}
          className="mt-3 rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-sm text-text-muted hover:text-text"
        >
          {cleared ? '캐시를 비웠습니다' : '로컬 캐시 비우기'}
        </button>
      </section>
      </div>
    </div>
  )
}
