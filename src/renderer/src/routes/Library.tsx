import { useRef, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, LogOut, X } from 'lucide-react'
import type { Project } from '@shared/types'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useRemoveProjectCover,
  useRenameProject,
  useUpdateProjectCover
} from '../lib/queries'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return sameDay
    ? `오늘 ${time}에 수정됨`
    : `${d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}에 수정됨`
}

/** 작품 표지 — 이미지가 있으면 표시, 없으면 책등 그라데이션 */
function Cover({ project }: { project: Project }): JSX.Element {
  const hue = useMemo(() => {
    let h = 0
    for (const ch of project.title) h = (h * 31 + ch.charCodeAt(0)) % 360
    return h
  }, [project.title])

  if (project.cover_path) {
    const { data } = supabase.storage.from('covers').getPublicUrl(project.cover_path)
    // updated_at으로 캐시 무효화
    const src = `${data.publicUrl}?t=${encodeURIComponent(project.updated_at)}`
    return (
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-app border border-border shadow-[var(--shadow)]">
        <img src={src} alt={project.title} className="h-full w-full object-cover" />
      </div>
    )
  }

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
  const updateCover = useUpdateProjectCover()
  const removeCover = useRemoveProjectCover()
  const [search, setSearch] = useState('')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null)

  // 표지 업로드용 숨김 파일 입력 (프로젝트 공유)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUploadId = useRef<string | null>(null)

  function openCoverPicker(projectId: string): void {
    pendingUploadId.current = projectId
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    const id = pendingUploadId.current
    if (!file || !id) return
    updateCover.mutate(
      { id, file },
      {
        onError: (err) => {
          const m = (err as { message?: string }).message ?? String(err)
          alert(`표지 업로드 실패: ${m}\n\nSupabase에 'covers' 스토리지 버킷/정책이 필요합니다(마이그레이션 0016).`)
        }
      }
    )
    e.target.value = ''
    pendingUploadId.current = null
  }

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
      className="grid h-full grid-cols-1 bg-bg md:grid-cols-[220px_1fr]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.04), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.03), transparent 35%)'
      }}
      onClick={() => setMenuFor(null)}
    >
      {/* 숨김 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 좌측 미니 사이드바 (모바일에선 숨김 — 로그아웃은 헤더로 이동) */}
      <aside className="hidden flex-col border-r border-border/60 px-3 py-4 md:flex">
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
      <main className="overflow-y-auto px-4 py-6 sm:px-6 md:px-10 md:py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3 sm:mb-8">
          <h1 className="text-xl font-semibold">모든 작품</h1>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색"
            className="order-last w-full rounded-[var(--radius-sm)] border border-border bg-bg-elev px-3 py-1.5 text-sm outline-none focus:border-accent sm:order-none sm:ml-2 sm:w-72"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={createProject.isPending}
            className="ml-auto rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black disabled:opacity-50"
          >
            + 새 작품
          </button>
          {/* 모바일: 로그아웃(데스크톱은 좌측 사이드바에 있음) */}
          <button
            className="icon-btn md:hidden"
            title={`로그아웃 (${session?.user.email ?? ''})`}
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut size={18} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-text-faint">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-24 text-center text-text-muted">
            아직 작품이 없습니다. <span className="text-text">+ 새 작품</span>으로 시작하세요.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] sm:gap-x-7 sm:gap-y-8">
            {filtered.map((p) => (
              <div key={p.id} className="group relative">
                {/* 표지 클릭 → 작품 열기 */}
                <button className="block w-full text-left" onClick={() => nav(`/p/${p.id}`)}>
                  <Cover project={p} />
                </button>

                {/* 표지 변경 버튼 (호버 시) */}
                <button
                  className="absolute bottom-[calc(25%+0.5rem)] left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                  title="표지 변경"
                  onClick={(e) => {
                    e.stopPropagation()
                    openCoverPicker(p.id)
                  }}
                >
                  <ImagePlus size={11} />
                  표지 변경
                </button>

                {/* 이름 */}
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

                {/* ⋯ 메뉴 */}
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
                    className="absolute right-1 top-7 z-10 w-36 rounded-[var(--radius-sm)] border border-border bg-bg-elev py-1 text-sm shadow-[var(--shadow)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-bg-hover"
                      onClick={() => {
                        openCoverPicker(p.id)
                        setMenuFor(null)
                      }}
                    >
                      <ImagePlus size={13} /> 표지 변경
                    </button>
                    {p.cover_path && (
                      <button
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-bg-hover"
                        onClick={() => {
                          removeCover.mutate(p.id, {
                            onError: (err) =>
                              alert(`표지 제거 실패: ${(err as { message?: string }).message ?? String(err)}`)
                          })
                          setMenuFor(null)
                        }}
                      >
                        <X size={13} /> 표지 제거
                      </button>
                    )}
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
