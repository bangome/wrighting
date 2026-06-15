import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Moon, Search, Settings, Sun } from 'lucide-react'
import type { Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { useUi } from '../../store/ui'
import { iconFor } from '../workspace/itemIcons'

interface Command {
  id: string
  label: string
  Icon: typeof FileText
  run: () => void
}

/** 커맨드 팔레트 ⌘K — 검색·테마·설정 + 아이템 점프 (스크린샷 67e276) */
export function CommandPalette({ project }: { project: Project }): JSX.Element | null {
  const nav = useNavigate()
  const { paletteOpen, setPaletteOpen, setTheme } = useUi()
  const { data: items } = useItems(project.id)
  const [q, setQ] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPaletteOpen])

  useEffect(() => {
    if (paletteOpen) setQ('')
  }, [paletteOpen])

  const commands: Command[] = useMemo(
    () => [
      { id: 'theme-dark', label: '다크 모드', Icon: Moon, run: () => setTheme('dark') },
      { id: 'theme-light', label: '라이트 모드', Icon: Sun, run: () => setTheme('light') },
      {
        id: 'settings',
        label: '설정',
        Icon: Settings,
        run: () => nav(`/p/${project.id}/settings`)
      }
    ],
    [nav, project.id, setTheme]
  )

  if (!paletteOpen) return null

  const query = q.trim().toLowerCase()
  const itemMatches = (items ?? [])
    .filter((i) => i.title.toLowerCase().includes(query))
    .slice(0, 8)
  const cmdMatches = commands.filter((c) => c.label.toLowerCase().includes(query))

  function close(): void {
    setPaletteOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]" onClick={close}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-[560px] overflow-hidden rounded-app border border-border bg-bg-elev shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search size={16} className="text-text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="명령어를 입력하거나 검색하세요…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
          <span className="text-xs text-text-faint">Esc</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1.5">
          {itemMatches.length > 0 && (
            <div className="px-3 py-1 text-xs text-text-faint">문서</div>
          )}
          {itemMatches.map((it) => {
            const Icon = iconFor(it)
            return (
              <button
                key={it.id}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-bg-hover"
                onClick={() => {
                  nav(`/p/${project.id}/i/${it.id}`)
                  close()
                }}
              >
                <Icon size={15} className="text-text-muted" />
                {it.title}
              </button>
            )
          })}
          {cmdMatches.length > 0 && <div className="px-3 py-1 text-xs text-text-faint">명령</div>}
          {cmdMatches.map((c) => (
            <button
              key={c.id}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-bg-hover"
              onClick={() => {
                c.run()
                close()
              }}
            >
              <c.Icon size={15} className="text-text-muted" />
              {c.label}
            </button>
          ))}
          {itemMatches.length === 0 && cmdMatches.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-text-faint">결과 없음</div>
          )}
        </div>
      </div>
    </div>
  )
}
