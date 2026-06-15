import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface CardData {
  title: string
  body: string
  color: string | null
  onSave: (patch: { title?: string; body?: string; color?: string | null }) => void
  onDelete: () => void
  [key: string]: unknown
}

const PALETTE = [null, '#cf6a6a', '#d6924a', '#d7b36a', '#5fae7a', '#5b8fd6', '#b07cc0']

/** 플롯보드 색상 카드 (스크린샷 01ecd9) */
function CardNodeImpl({ data, selected }: NodeProps): JSX.Element {
  const d = data as CardData
  const [editing, setEditing] = useState(false)

  return (
    <div
      className="w-[220px] rounded-app border bg-bg-elev shadow-[var(--shadow)]"
      style={{
        borderColor: selected ? 'var(--accent)' : d.color ?? 'var(--border)',
        borderTopWidth: d.color ? 3 : 1,
        borderTopColor: d.color ?? 'var(--border)'
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-text-faint" />
      <div className="p-3">
        {editing ? (
          <>
            <input
              autoFocus
              defaultValue={d.title}
              onBlur={(e) => d.onSave({ title: e.target.value })}
              className="mb-1.5 w-full bg-transparent text-sm font-semibold outline-none"
              placeholder="제목"
            />
            <textarea
              defaultValue={d.body}
              onBlur={(e) => d.onSave({ body: e.target.value })}
              rows={3}
              className="w-full resize-none bg-transparent text-xs leading-relaxed text-text-muted outline-none"
              placeholder="설명을 입력하세요"
            />
            <div className="mt-2 flex items-center gap-1.5">
              {PALETTE.map((c, i) => (
                <button
                  key={i}
                  onClick={() => d.onSave({ color: c })}
                  className="h-3.5 w-3.5 rounded-full border border-border"
                  style={{ background: c ?? 'transparent' }}
                  title={c ?? '없음'}
                />
              ))}
              <button
                onClick={d.onDelete}
                className="ml-auto text-xs text-danger hover:underline"
              >
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
            <div className="mb-1 text-sm font-semibold">{d.title || '제목 없음'}</div>
            <div className="line-clamp-4 text-xs leading-relaxed text-text-muted">
              {d.body || '더블클릭하여 편집'}
            </div>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-text-faint" />
    </div>
  )
}

export const CardNode = memo(CardNodeImpl)
