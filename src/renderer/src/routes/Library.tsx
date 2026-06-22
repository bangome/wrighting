import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Project } from '@shared/types'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useCreateProject, useDeleteProject, useProjects, useRenameProject } from '../lib/queries'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return sameDay
    ? `오늘 ${time}에 수정됨`
    : `${d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}에 수정됨`
}

/** 작품 표지 (책등 느낌의 그라데이션) */
function Cover({ project }: { project: Project }): JSX.Element {
  // 제목 해시로 안정적인 색조 생성
  const hue = useMemo(() => {
    let h = 0
    for (const ch of project.title) h = (h * 31 + ch.charCodeAt(0)) % 360
    return h
  }, [project.title])
  return (
    <div
      className="relative aspect-[3/4] w-full overflow-hidden rounded-app border border-border shadow-[var(--shadow)]"
      style={{
        background: `linear-gradient(155deg, hsl(${hue} 35% 22%), hsl(${(hue + 40) % 360} 30% 12%))`
      }}
    >
      <div className="absolute inset-0 flex items-end p-4">
        <span className="text-lg font-semibold text-white/90 drop-shadow">{project.title}</span>
      </div>
      <div className="absolute left-3 top-0 h-full w-[3px] bg-white/10" />
    </div>
  )
}

export function Library(): JSX.Element {
  const nav = useNavigate()
  const { session } = useAuth()
  const { data: projects, isLoading } = useProjects()
  const createProject = useCreateProject()
  const renameProject = useRenameProject()
  const deleteProject = useDeleteProject()
  const [search, setSearch] = useState('')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  // 인라인 이름 변경 (Electron 렌더러는 window.prompt 미지원)
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null)

  function commitRename(): void {
    if (!renaming) return
    const title = renaming.value.trim()
    const orig = (projects ?? []).find((p) => p.id === renaming.id)
    if (title && title !== orig?.title) renameProject.mutate({ id: renaming.id, title })
    setRenaming(null)
  }

  const filtered = (projects ?? []).filter((p) =>
    p.title.toLowerCase().includes(search.trim().toLowerCase())
  )

  async function handleCreate(): Promise<void> {
    try {
      const p = await createProject.mutateAsync('제목 없는 작품')
      nav(`/p/${p.id}`)
    } catch (err) {
      console.error('새 작품 생성 실패:', err)
      // Supabase(PostgREST) 에러는 message 외에 code/hint/details 에 핵심 단서가 있다.
      const e = err as { message?: string; code?: string; hint?: string; details?: string }
      const lines = [
        e.message ?? String(err),
        e.code ? `code: ${e.code}` : '',
        e.details ? `details: ${e.details}` : '',
        e.hint ? `hint: ${e.hint}` : ''
      ].filter(Boolean)
      alert(`새 작품을 만들지 못했습니다:\n${lines.join('\n')}`)
    }
  }

  return (
    <div
      className="grid h-full grid-cols-[220px_1fr] bg-bg"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.04), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.03), transparent 35%)'
      }}
      onClick={() => setMenuFor(null)}
    >
      {/* 좌측 미니 사이드바 */}
      <aside className="flex flex-col border-r border-border/60 px-3 py-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-bg-active text-xs font-bold">
            M
          </div>
          <span className="text-sm font-medium">My Workspace</span>
        </div>
        <div className="px-2 text-xs uppercase tracking-wide text-text-faint">작품</div>
        <button className="mt-2 rounded-[var(--radius-sm)] bg-bg-active px-2 py-1.5 text-left text-sm">
          모든 작품
        </button>
        <div className="mt-auto flex flex-col gap-1 text-sm text-text-muted">
          <button className="icon-btn justify-start px-2">업데이트 내용</button>
          <button className="icon-btn justify-start px-2">피드백 보내기</button>
          <button
            className="icon-btn justify-start px-2"
            onClick={() => void supabase.auth.signOut()}
          >
            로그아웃 ({session?.user.email})
          </button>
        </div>
      </aside>

      {/* 본문 */}
      <main className="overflow-y-auto px-10 py-8">
        <div className="mb-8 flex items-center gap-4">
          <h1 className="text-xl font-semibold">모든 작품</h1>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색"
            className="ml-2 w-72 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={createProject.isPending}
            className="ml-auto rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black disabled:opacity-50"
          >
            + 새 작품
          </button>
        </div>

        {isLoading ? (
          <p className="text-text-faint">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-24 text-center text-text-muted">
            아직 작품이 없습니다. <span className="text-text">+ 새 작품</span>으로 시작하세요.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-7 gap-y-8">
            {filtered.map((p) => (
              <div key={p.id} className="group relative">
                <button
                  className="block w-full text-left"
                  onClick={() => nav(`/p/${p.id}`)}
                  onDoubleClick={() => nav(`/p/${p.id}`)}
                >
                  <Cover project={p} />
                </button>
                {renaming?.id === p.id ? (
                  <input
                    autoFocus
                    value={renaming.value}
                    onChange={(e) => setRenaming({ id: p.id, value: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setRenaming(null)
                    }}
                    className="mt-2 w-full rounded-[var(--radius-sm)] border border-accent bg-bg-elev px-1.5 py-0.5 text-sm font-medium outline-none"
                  />
                ) : (
                  <button
                    className="mt-2 block w-full truncate text-left text-sm font-medium"
                    onClick={() => nav(`/p/${p.id}`)}
                  >
                    {p.title}
                  </button>
                )}
                <div className="text-xs text-text-faint">{formatDate(p.updated_at)}</div>
                <button
                  className="absolute right-1 top-1 rounded bg-black/40 px-2 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuFor(menuFor === p.id ? null : p.id)
                  }}
                >
                  ⋯
                </button>
                {menuFor === p.id && (
                  <div
                    className="absolute right-1 top-7 z-10 w-32 rounded-[var(--radius-sm)] border border-border bg-bg-elev py-1 text-sm shadow-[var(--shadow)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="block w-full px-3 py-1.5 text-left hover:bg-bg-hover"
                      onClick={() => {
                        setRenaming({ id: p.id, value: p.title })
                        setMenuFor(null)
                      }}
                    >
                      이름 변경
                    </button>
                    <button
                      className="block w-full px-3 py-1.5 text-left text-danger hover:bg-bg-hover"
                      onClick={() => {
                        if (confirm(`'${p.title}'을(를) 삭제할까요?`)) deleteProject.mutate(p.id)
                        setMenuFor(null)
                      }}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
