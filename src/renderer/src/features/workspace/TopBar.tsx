import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Search } from 'lucide-react'
import type { Project } from '@shared/types'
import { useUi } from '../../store/ui'
import { Timer } from './Timer'

export function TopBar({ project: _project }: { project: Project }): JSX.Element {
  const nav = useNavigate()
  const setPaletteOpen = useUi((s) => s.setPaletteOpen)

  return (
    <header className="flex h-12 items-center gap-2 border-b border-border px-3">
      <button className="icon-btn" onClick={() => nav(-1)} title="뒤로">
        <ArrowLeft size={16} />
      </button>
      <button className="icon-btn" onClick={() => nav(1)} title="앞으로">
        <ArrowRight size={16} />
      </button>

      {/* 가운데 검색 (커맨드 팔레트 트리거) */}
      <button
        className="mx-auto flex w-[420px] items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-3 py-1.5 text-sm text-text-faint hover:border-border-strong"
        onClick={() => setPaletteOpen(true)}
      >
        <Search size={14} />
        검색
        <span className="ml-auto text-xs">⌘K</span>
      </button>

      <Timer />
    </header>
  )
}
