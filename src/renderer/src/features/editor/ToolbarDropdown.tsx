import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronsUpDown } from 'lucide-react'

interface Opt {
  value: string
  label: string
}

interface Props {
  value: string
  display?: string
  options: Opt[]
  onChange: (v: string) => void
  title: string
  minWidth: number
}

export function ToolbarDropdown({
  value,
  display,
  options,
  onChange,
  title,
  minWidth
}: Props): JSX.Element {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const cur = options.find((o) => o.value === value)

  function toggle(): void {
    if (pos) return setPos(null)
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, left: r.left, width: r.width })
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
        style={{ minWidth }}
        className="flex h-7 items-center gap-1 rounded-[6px] bg-transparent px-1.5 text-sm text-text-muted hover:bg-bg-hover hover:text-text"
      >
        <span className="flex-1 truncate text-left text-text">{display ?? cur?.label ?? ''}</span>
        <ChevronsUpDown size={13} className="shrink-0 text-text-faint" />
      </button>
      {pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setPos(null)} />
            <div
              style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width }}
              className="z-[61] max-h-64 overflow-y-auto rounded-app border border-border bg-bg-elev py-1 shadow-[var(--shadow)]"
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(o.value)
                    setPos(null)
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-bg-hover ${
                    o.value === value ? 'text-text' : 'text-text-muted'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  )
}
