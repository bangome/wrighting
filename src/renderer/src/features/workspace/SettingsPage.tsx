import { useUi, type Theme } from '../../store/ui'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark', label: '다크' },
  { value: 'light', label: '라이트' },
  { value: 'system', label: '시스템' }
]

export function SettingsPage(): JSX.Element {
  const { theme, setTheme } = useUi()
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
    </div>
  )
}
