import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  Network,
  CheckCircle2,
  StickyNote,
  Bot,
  Trash2,
  Download,
  MessageCircle,
  Settings
} from 'lucide-react'
import type { Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { Binder } from './Binder'

interface Props {
  project: Project
}

function navClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm ${
    isActive ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover hover:text-text'
  }`
}

export function Sidebar({ project }: Props): JSX.Element {
  const nav = useNavigate()
  const base = `/p/${project.id}`
  const { data: items } = useItems(project.id)
  const noteCount = (items ?? []).filter((i) => i.type === 'notes').length

  return (
    <aside className="flex h-full flex-col border-r border-border bg-bg-sidebar">
      {/* 작품 헤더 */}
      <button
        className="flex shrink-0 items-center gap-2 px-3 py-3 text-left hover:bg-bg-hover"
        onClick={() => nav('/')}
        title="라이브러리로"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded bg-accent text-xs font-bold text-white">
          {project.title.slice(0, 1)}
        </div>
        <span className="truncate text-sm font-medium">{project.title}</span>
      </button>

      {/* 상단 네비 */}
      <div className="flex shrink-0 flex-col gap-0.5 px-1.5 pb-2">
        <NavLink to={base} end className={navClass}>
          <Home size={16} /> 작품 홈
        </NavLink>
        <NavLink to={`${base}/graph`} className={navClass}>
          <Network size={16} /> 그래프
        </NavLink>
        <NavLink to={`${base}/tasks`} className={navClass}>
          <CheckCircle2 size={16} /> 작업
        </NavLink>
        <NavLink to={`${base}/notes`} className={navClass}>
          <StickyNote size={16} /> 노트
          {noteCount > 0 && (
            <span className="ml-auto rounded-full bg-bg-active px-1.5 text-xs text-text-muted">
              {noteCount}
            </span>
          )}
        </NavLink>
        <NavLink to={`${base}/harness`} className={navClass}>
          <Bot size={16} /> 하네스
        </NavLink>
      </div>

      <div className="mx-3 border-t border-border" />

      {/* 바인더 트리 */}
      <Binder projectId={project.id} />

      {/* 하단 네비 (스크롤과 무관하게 푸터 고정) */}
      <div className="mt-auto flex shrink-0 flex-col gap-0.5 border-t border-border px-1.5 py-2">
        <NavLink to={`${base}/trash`} className={navClass}>
          <Trash2 size={16} /> 휴지통
        </NavLink>
        <NavLink to={`${base}/import`} className={navClass}>
          <Download size={16} /> 가져오기
        </NavLink>
        <NavLink to={`${base}/feedback`} className={navClass}>
          <MessageCircle size={16} /> 피드백 보내기
        </NavLink>
        <NavLink to={`${base}/settings`} className={navClass}>
          <Settings size={16} /> 설정
        </NavLink>
      </div>
    </aside>
  )
}
