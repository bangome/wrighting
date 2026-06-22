import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ExternalLink, FileWarning } from 'lucide-react'
import type { Item } from '@shared/types'
import { iconFor } from '../workspace/itemIcons'

export interface RefData {
  item: Pick<Item, 'type' | 'sheet_subtype' | 'icon' | 'title' | 'synopsis'> | null
  onOpen: () => void
  onSave: (patch: { title?: string; synopsis?: string | null }) => void
  onDelete: () => void
  [key: string]: unknown
}

/** 캔버스에 올린 기존 문서/시트 참조 카드. 제목·설명을 보여주고 편집하면 원본 항목에 반영. */
function RefNodeImpl({ data, selected }: NodeProps): JSX.Element {
  const d = data as RefData
  const item = d.item
  const Icon = item ? iconFor(item) : FileWarning
  const [editing, setEditing] = useState(false)

  return (
    <div
      className="group w-[240px] rounded-app border bg-bg-elev shadow-[var(--shadow)]"
      style={{ borderColor: selected ? 'var(--accent)' : 'var(--border)' }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-text-faint" />
      <div className="p-3">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-app bg-bg-active">
            <Icon size={14} className="text-text-muted" />
          </span>
          {item ? (
            <button
              onClick={d.onOpen}
              className="flex items-center gap-1 text-xs text-text-faint hover:text-accent"
              title={`열기: ${item.title}`}
            >
              <ExternalLink size={11} /> 열기
            </button>
          ) : (
            <span className="text-xs text-text-faint">참조 끊김</span>
          )}
        </div>

        {!item ? (
          <div className="text-sm font-semibold text-text-muted">삭제된 항목</div>
        ) : editing ? (
          <>
            <input
              autoFocus
              defaultValue={item.title}
              onBlur={(e) => d.onSave({ title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="mb-1 w-full bg-transparent text-sm font-semibold outline-none"
              placeholder="제목"
            />
            <textarea
              defaultValue={item.synopsis ?? ''}
              onBlur={(e) => d.onSave({ synopsis: e.target.value || null })}
              rows={3}
              className="w-full resize-none bg-transparent text-xs leading-relaxed text-text-muted outline-none"
              placeholder="설명을 입력하세요"
            />
            <div className="mt-2 flex items-center justify-end gap-3">
              <button onClick={d.onDelete} className="text-xs text-danger hover:underline">
                삭제
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-text-muted hover:text-text"
              >
                완료
              </button>
            </div>
          </>
        ) : (
          <div onDoubleClick={() => setEditing(true)}>
            {/* 제목: 최대 2줄(1회 줄바꿈)까지 표시 후 말줄임 */}
            <div className="line-clamp-2 text-sm font-semibold">{item.title || '제목 없음'}</div>
            {item.synopsis && (
              <div className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-text-muted">
                {item.synopsis}
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-text-faint" />
    </div>
  )
}

export const RefNode = memo(RefNodeImpl)
