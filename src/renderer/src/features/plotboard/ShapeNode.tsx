import { memo, useState } from 'react'
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'

export interface ShapeData {
  shape: string
  title: string
  color: string | null
  onSave: (patch: { title?: string; color?: string | null }) => void
  onResize: (size: { w: number; h: number }) => void
  onDelete: () => void
  [key: string]: unknown
}

const PALETTE = ['#cf6a6a', '#d6924a', '#d7b36a', '#5fae7a', '#5b8fd6', '#b07cc0', '#8b8b94']

/** 캔버스 자유 도형 (사각형/둥근 사각형/타원/마름모). NodeResizer로 크기 조절. */
function ShapeNodeImpl({ data, selected }: NodeProps): JSX.Element {
  const d = data as ShapeData
  const [editing, setEditing] = useState(false)
  const stroke = d.color ?? 'var(--border-strong)'
  const fill = d.color ? `${d.color}1f` : 'var(--bg-elev)'

  const radius =
    d.shape === 'ellipse' ? '50%' : d.shape === 'roundRect' ? 16 : d.shape === 'diamond' ? 6 : 4
  const isDiamond = d.shape === 'diamond'

  return (
    <div className="relative h-full w-full">
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={60}
        onResizeEnd={(_e, p) => d.onResize({ w: Math.round(p.width), h: Math.round(p.height) })}
        lineClassName="!border-[var(--accent)]"
        handleClassName="!h-2.5 !w-2.5 !rounded-[2px] !border-[var(--accent)] !bg-bg-elev"
      />
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-text-faint" />
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden"
        style={{
          background: fill,
          border: `2px solid ${stroke}`,
          borderRadius: radius,
          transform: isDiamond ? 'rotate(45deg)' : undefined,
          boxShadow: selected ? '0 0 0 1px var(--accent)' : 'var(--shadow)'
        }}
        onDoubleClick={() => setEditing(true)}
      >
        <div style={{ transform: isDiamond ? 'rotate(-45deg)' : undefined }} className="w-full px-3">
          {editing ? (
            <>
              <input
                autoFocus
                defaultValue={d.title}
                onBlur={(e) => {
                  d.onSave({ title: e.target.value })
                  setEditing(false)
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full bg-transparent text-center text-sm font-medium outline-none"
                placeholder="텍스트"
              />
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => d.onSave({ color: c })}
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-border"
                    style={{ background: c }}
                  />
                ))}
                <button
                  onClick={d.onDelete}
                  className="ml-1 text-xs text-danger hover:underline"
                >
                  삭제
                </button>
              </div>
            </>
          ) : (
            <div className="select-none text-center text-sm font-medium text-text">
              {d.title || ''}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-text-faint" />
    </div>
  )
}

export const ShapeNode = memo(ShapeNodeImpl)
