import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Circle, CheckCircle2, Plus, Check } from 'lucide-react'
import type { Project } from '@shared/types'
import { useItems, useUpdateItem } from '../../lib/items'
import { useStatuses } from '../../lib/labels'

/** 항목의 상태(초안·완료 등) 지정 드롭다운. 상태는 작품에 귀속(설정에서 관리). */
export function StatusPicker({
  project,
  itemId
}: {
  project: Project
  itemId: string | undefined
}): JSX.Element {
  const nav = useNavigate()
  const { data: items } = useItems(project.id)
  const { data: statuses } = useStatuses(project.id)
  const updateItem = useUpdateItem(project.id)
  const [open, setOpen] = useState(false)

  const item = (items ?? []).find((i) => i.id === itemId)
  const current = (statuses ?? []).find((s) => s.id === item?.status_id)

  function assign(statusId: string | null): void {
    setOpen(false)
    if (itemId) updateItem.mutate({ id: itemId, patch: { status_id: statusId } })
  }

  return (
    <div className="relative flex items-center">
      <button
        className={`icon-btn ${current ? '' : 'text-text-muted'}`}
        title={current ? `상태: ${current.name}` : '상태'}
        onClick={() => setOpen((o) => !o)}
        disabled={!itemId}
      >
        {current ? (
          <CheckCircle2 size={16} style={{ color: current.color }} />
        ) : (
          <Circle size={16} />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-40 w-48 rounded-app border border-border bg-bg-elev py-1.5 shadow-[var(--shadow)]">
            <button
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-bg-hover"
              onClick={() => assign(null)}
            >
              <Circle size={15} className="text-text-faint" />
              <span className="flex-1">상태 없음</span>
              {!current && <Check size={14} className="text-text-muted" />}
            </button>
            {(statuses ?? []).map((s) => (
              <button
                key={s.id}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-bg-hover"
                onClick={() => assign(s.id)}
              >
                <CheckCircle2 size={15} style={{ color: s.color }} />
                <span className="flex-1 truncate">{s.name}</span>
                {current?.id === s.id && <Check size={14} className="text-text-muted" />}
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-text-muted hover:bg-bg-hover hover:text-text"
              onClick={() => {
                setOpen(false)
                nav(`/p/${project.id}/settings`)
              }}
            >
              <Plus size={15} /> 상태 추가
            </button>
          </div>
        </>
      )}
    </div>
  )
}
