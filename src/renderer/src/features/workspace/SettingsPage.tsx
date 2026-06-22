import { useEffect, useState } from 'react'
import { del } from 'idb-keyval'
import { useUi, type Theme } from '../../store/ui'
import { queryClient } from '../../lib/query'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark', label: '다크' },
  { value: 'light', label: '라이트' },
  { value: 'system', label: '시스템' }
]

export function SettingsPage(): JSX.Element {
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
  )
}
