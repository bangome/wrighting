import { useEffect, useRef, useState } from 'react'

const PRESETS = [5, 30, 50]

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 글쓰기 타이머(뽀모도로) — 스크린샷 efd8eb */
export function Timer(): JSX.Element {
  const [open, setOpen] = useState(false)
  const [total, setTotal] = useState(30 * 60)
  const [remaining, setRemaining] = useState(30 * 60)
  const [running, setRunning] = useState(false)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    ref.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (ref.current) window.clearInterval(ref.current)
    }
  }, [running])

  function pick(min: number): void {
    setTotal(min * 60)
    setRemaining(min * 60)
    setRunning(false)
  }

  return (
    <div className="relative">
      <button
        className="rounded-[var(--radius-sm)] border border-border bg-bg-elev px-3 py-1 font-mono text-sm tabular-nums hover:border-border-strong"
        onClick={() => setOpen(!open)}
      >
        {fmt(remaining)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-30 w-72 rounded-app border border-border bg-bg-elev p-4 shadow-[var(--shadow)]">
            <div className="mb-3 flex items-center justify-between">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  className={`rounded px-3 py-1 text-sm ${
                    total === m * 60 ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover'
                  }`}
                  onClick={() => pick(m)}
                >
                  {m}분
                </button>
              ))}
            </div>
            <div className="mb-3 text-right font-mono text-4xl tabular-nums">{fmt(remaining)}</div>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-[var(--radius-sm)] bg-accent py-1.5 text-sm font-medium text-white"
                onClick={() => setRunning(!running)}
              >
                {running ? '일시정지' : '시작'}
              </button>
              <button
                className="rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-sm text-text-muted hover:text-text"
                onClick={() => {
                  setRemaining(total)
                  setRunning(false)
                }}
              >
                초기화
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
