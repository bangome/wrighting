import { useRef, type ReactNode } from 'react'
import type { SplitDir } from '../../store/ui'

/**
 * 두 창을 비율(ratio)대로 나누고 경계선 드래그로 크기를 조절한다.
 * ratio = 첫 번째(주) 창이 차지하는 비율(0.2~0.8).
 */
export function ResizableSplit({
  dir,
  ratio,
  onChange,
  first,
  second
}: {
  dir: SplitDir
  ratio: number
  onChange: (r: number) => void
  first: ReactNode
  second: ReactNode
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const horizontal = dir === 'right' // 좌우 분할

  function onMouseDown(e: React.MouseEvent): void {
    e.preventDefault()
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const move = (ev: MouseEvent): void => {
      const r = horizontal
        ? (ev.clientX - rect.left) / rect.width
        : (ev.clientY - rect.top) / rect.height
      onChange(r)
    }
    const up = (): void => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    document.body.style.cursor = horizontal ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div
      ref={ref}
      className={`flex h-full w-full min-h-0 min-w-0 overflow-hidden ${
        horizontal ? 'flex-row' : 'flex-col'
      }`}
    >
      <div
        className="min-h-0 min-w-0 overflow-hidden"
        style={{ flexGrow: 0, flexShrink: 0, flexBasis: `${ratio * 100}%` }}
      >
        {first}
      </div>
      <div
        onMouseDown={onMouseDown}
        className={`shrink-0 bg-border transition-colors hover:bg-border-strong ${
          horizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'
        }`}
      />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{second}</div>
    </div>
  )
}
