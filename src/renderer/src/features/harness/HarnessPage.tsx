import { useMemo, useState } from 'react'
import {
  Bot,
  Download,
  FileText,
  Globe,
  History,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload
} from 'lucide-react'
import type {
  HarnessAgent,
  HarnessBundle,
  HarnessDoc,
  HarnessHistory,
  HarnessSkill,
  Project
} from '@shared/types'
import { HARNESS_MODELS } from '@shared/types'
import {
  harnessFs,
  resolveEffective,
  resolveEffectiveDoc,
  useAddHarnessAgent,
  useAddHarnessSkill,
  useDeleteHarnessAgent,
  useDeleteHarnessDoc,
  useDeleteHarnessSkill,
  useHarnessAgents,
  useHarnessDocs,
  useHarnessHistory,
  useHarnessSkills,
  useImportHarness,
  useUpdateHarnessAgent,
  useUpdateHarnessSkill,
  useUpsertHarnessDoc,
  type Scope
} from '../../lib/harness'

type Sel = { kind: 'agent' | 'skill' | 'doc'; id: string } | null

/** 슬러그 정리: 파일명/디렉터리명으로 안전하게 */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\-_ ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function HarnessPage({ project }: { project: Project }): JSX.Element {
  const pid = project.id
  const { data: agents } = useHarnessAgents(pid)
  const { data: skills } = useHarnessSkills(pid)
  const { data: docs } = useHarnessDocs(pid)

  const addAgent = useAddHarnessAgent(pid)
  const updateAgent = useUpdateHarnessAgent(pid)
  const deleteAgent = useDeleteHarnessAgent(pid)
  const addSkill = useAddHarnessSkill(pid)
  const updateSkill = useUpdateHarnessSkill(pid)
  const deleteSkill = useDeleteHarnessSkill(pid)
  const upsertDoc = useUpsertHarnessDoc(pid)
  const deleteDoc = useDeleteHarnessDoc(pid)
  const importHarness = useImportHarness(pid)

  const [scope, setScope] = useState<Scope>('project')
  const [sel, setSel] = useState<Sel>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const selected =
    sel?.kind === 'agent'
      ? agents?.find((a) => a.id === sel.id)
      : sel?.kind === 'skill'
        ? skills?.find((s) => s.id === sel.id)
        : sel?.kind === 'doc'
          ? docs?.find((d) => d.id === sel.id)
          : undefined

  function uniqueName(base: string, existing: { name: string }[]): string {
    let n = base
    let i = 2
    const names = new Set(existing.map((x) => x.name))
    while (names.has(n)) n = `${base}-${i++}`
    return n
  }

  async function createAgent(): Promise<void> {
    const name = uniqueName('new-agent', agents ?? [])
    const a = await addAgent.mutateAsync({ scope, name, description: '', model: 'sonnet' })
    setSel({ kind: 'agent', id: a.id })
  }
  async function createSkill(): Promise<void> {
    const name = uniqueName('new-skill', skills ?? [])
    const s = await addSkill.mutateAsync({ scope, name, description: '' })
    setSel({ kind: 'skill', id: s.id })
  }
  async function createDoc(): Promise<void> {
    // 현재 범위의 CLAUDE.md 가 이미 있으면 그걸 선택, 없으면 빈 본문으로 생성.
    const wantPid = scope === 'project' ? pid : null
    const existing = docs?.find((d) => d.project_id === wantPid)
    if (existing) {
      setSel({ kind: 'doc', id: existing.id })
      return
    }
    const d = await upsertDoc.mutateAsync({ scope, body: '' })
    setSel({ kind: 'doc', id: d.id })
  }

  async function doImport(): Promise<void> {
    if (!harnessFs) return
    const dir = await harnessFs.pickDir()
    if (!dir) return
    setBusy('가져오는 중…')
    try {
      const bundle = await harnessFs.read(dir)
      const r = await importHarness.mutateAsync({ scope, bundle })
      setBusy(`가져옴 — 에이전트 ${r.agents} · 스킬 ${r.skills}`)
    } catch (e) {
      setBusy('가져오기 실패: ' + (e as Error).message)
    }
  }

  // 실효 세트(공용 + 작품 전용 병합)를 .claude 로 내보낸다.
  const effectiveAgents = useMemo(() => resolveEffective(agents ?? []), [agents])
  const effectiveSkills = useMemo(() => resolveEffective(skills ?? []), [skills])
  const effectiveDoc = useMemo(() => resolveEffectiveDoc(docs, pid), [docs, pid])

  async function doExport(): Promise<void> {
    if (!harnessFs) return
    const dir = await harnessFs.pickDir()
    if (!dir) return
    setBusy('내보내는 중…')
    try {
      const bundle: HarnessBundle = {
        agents: effectiveAgents.map((a) => ({
          name: a.name,
          description: a.description,
          model: a.model,
          body: a.body
        })),
        skills: effectiveSkills.map((s) => ({
          name: s.name,
          description: s.description,
          body: s.body
        })),
        claudeMd: effectiveDoc?.body ? effectiveDoc.body : null
      }
      const r = await harnessFs.write(dir, bundle)
      const md = bundle.claudeMd ? ' · CLAUDE.md' : ''
      setBusy(`내보냄 — 에이전트 ${r.agents} · 스킬 ${r.skills}${md} (.claude/)`)
    } catch (e) {
      setBusy('내보내기 실패: ' + (e as Error).message)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 헤더 */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <h2 className="text-lg font-semibold">하네스</h2>
        <span className="text-xs text-text-faint">Claude Code 에이전트·스킬 지침</span>

        <div className="ml-auto flex items-center gap-2">
          {/* 새 항목·가져오기 범위 */}
          <div className="flex overflow-hidden rounded-[var(--radius-sm)] border border-border text-xs">
            <button
              className={`px-2.5 py-1 ${scope === 'global' ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover'}`}
              onClick={() => setScope('global')}
              title="모든 작품의 기본"
            >
              공용
            </button>
            <button
              className={`px-2.5 py-1 ${scope === 'project' ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover'}`}
              onClick={() => setScope('project')}
              title="이 작품 전용"
            >
              이 작품
            </button>
          </div>

          {harnessFs ? (
            <>
              <button
                className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border px-2.5 py-1 text-sm text-text-muted hover:text-text"
                onClick={() => void doImport()}
                title=".claude 폴더에서 가져오기"
              >
                <Download size={14} /> 가져오기
              </button>
              <button
                className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border px-2.5 py-1 text-sm text-text-muted hover:text-text"
                onClick={() => void doExport()}
                title=".claude 폴더로 내보내기"
              >
                <Upload size={14} /> 내보내기
              </button>
            </>
          ) : (
            <span className="text-xs text-text-faint">데스크톱 앱에서 .claude 가져오기·내보내기 가능</span>
          )}
        </div>
      </div>

      {busy && (
        <div className="border-b border-border bg-bg-elev px-6 py-1.5 text-xs text-text-muted">
          {busy}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr]">
        {/* 목록 */}
        <div className="overflow-y-auto border-r border-border py-2">
          <ListGroup
            icon={<FileText size={14} />}
            title="메인 지침"
            count={docs?.length ?? 0}
            onAdd={() => void createDoc()}
          >
            {(docs ?? []).map((d) => (
              <Row
                key={d.id}
                name="CLAUDE.md"
                global={d.project_id === null}
                active={sel?.kind === 'doc' && sel.id === d.id}
                onClick={() => setSel({ kind: 'doc', id: d.id })}
              />
            ))}
          </ListGroup>

          <ListGroup
            icon={<Bot size={14} />}
            title="에이전트"
            count={agents?.length ?? 0}
            onAdd={() => void createAgent()}
          >
            {(agents ?? []).map((a) => (
              <Row
                key={a.id}
                name={a.name}
                meta={a.model ?? undefined}
                global={a.project_id === null}
                active={sel?.kind === 'agent' && sel.id === a.id}
                onClick={() => setSel({ kind: 'agent', id: a.id })}
              />
            ))}
          </ListGroup>

          <ListGroup
            icon={<Sparkles size={14} />}
            title="스킬"
            count={skills?.length ?? 0}
            onAdd={() => void createSkill()}
          >
            {(skills ?? []).map((s) => (
              <Row
                key={s.id}
                name={s.name}
                global={s.project_id === null}
                active={sel?.kind === 'skill' && sel.id === s.id}
                onClick={() => setSel({ kind: 'skill', id: s.id })}
              />
            ))}
          </ListGroup>
        </div>

        {/* 편집기 */}
        <div className="min-h-0 overflow-y-auto">
          {!selected ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-faint">
              왼쪽에서 에이전트·스킬을 선택하거나 <Plus size={14} className="mx-1 inline" /> 로 추가하세요.
            </div>
          ) : sel?.kind === 'doc' ? (
            <MainDocEditor
              key={`${selected.id}:${(selected as HarnessDoc).updated_at}`}
              doc={selected as HarnessDoc}
              onChange={(body) =>
                upsertDoc.mutate({
                  scope: (selected as HarnessDoc).project_id === null ? 'global' : 'project',
                  body
                })
              }
              onDelete={() => {
                deleteDoc.mutate(selected.id)
                setSel(null)
              }}
            />
          ) : sel?.kind === 'agent' ? (
            <AgentEditor
              key={`${selected.id}:${(selected as HarnessAgent).updated_at}`}
              agent={selected as HarnessAgent}
              onChange={(patch) => updateAgent.mutate({ id: selected.id, patch })}
              onDelete={() => {
                deleteAgent.mutate(selected.id)
                setSel(null)
              }}
            />
          ) : (
            <SkillEditor
              key={`${selected.id}:${(selected as HarnessSkill).updated_at}`}
              skill={selected as HarnessSkill}
              onChange={(patch) => updateSkill.mutate({ id: selected.id, patch })}
              onDelete={() => {
                deleteSkill.mutate(selected.id)
                setSel(null)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ListGroup({
  icon,
  title,
  count,
  onAdd,
  children
}: {
  icon: JSX.Element
  title: string
  count: number
  onAdd: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-text-muted">
        {icon}
        {title}
        <span className="text-text-faint">{count}</span>
        <button className="ml-auto icon-btn p-0.5" title={`${title} 추가`} onClick={onAdd}>
          <Plus size={14} />
        </button>
      </div>
      {children}
    </div>
  )
}

function Row({
  name,
  meta,
  global,
  active,
  onClick
}: {
  name: string
  meta?: string
  global: boolean
  active: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
        active ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover hover:text-text'
      }`}
    >
      <span className="truncate font-mono text-[13px]">{name}</span>
      {meta && <span className="text-xs text-text-faint">{meta}</span>}
      <span className="ml-auto shrink-0">
        {global ? (
          <Globe size={12} className="text-text-faint" aria-label="공용" />
        ) : (
          <span className="rounded bg-accent-soft px-1 text-[10px] text-accent">작품</span>
        )}
      </span>
    </button>
  )
}

const fieldCls =
  'w-full rounded-[var(--radius-sm)] border border-border bg-bg-elev px-2.5 py-1.5 text-sm outline-none focus:border-accent'

function MainDocEditor({
  doc,
  onChange,
  onDelete
}: {
  doc: HarnessDoc
  onChange: (body: string) => void
  onDelete: () => void
}): JSX.Element {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
      <EditorHeader scopeGlobal={doc.project_id === null} kind="CLAUDE.md" onDelete={onDelete} />
      <p className="text-xs text-text-faint">
        프로젝트 루트의 <span className="font-mono">CLAUDE.md</span> — Claude Code가 매 세션 읽는
        메인 지침입니다. 작품 전용이 있으면 공용을 덮어씁니다.
      </p>
      <Field label="지침 본문 (Markdown)">
        <textarea
          defaultValue={doc.body}
          onBlur={(e) => onChange(e.target.value)}
          rows={28}
          spellCheck={false}
          placeholder="# 작품명&#10;&#10;## 하네스: …&#10;**목표:** …&#10;**트리거:** …"
          className={`${fieldCls} resize-y font-mono text-[13px] leading-relaxed`}
        />
      </Field>
      <HistoryPanel targetId={doc.id} onRestore={(body) => onChange(body)} />
    </div>
  )
}

function AgentEditor({
  agent,
  onChange,
  onDelete
}: {
  agent: HarnessAgent
  onChange: (patch: Partial<HarnessAgent>) => void
  onDelete: () => void
}): JSX.Element {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
      <EditorHeader
        scopeGlobal={agent.project_id === null}
        kind="에이전트"
        onDelete={onDelete}
      />
      <Field label="이름 (파일명)">
        <input
          defaultValue={agent.name}
          onBlur={(e) => {
            const v = slugify(e.target.value)
            if (v && v !== agent.name) onChange({ name: v })
            e.target.value = v || agent.name
          }}
          className={`${fieldCls} font-mono`}
        />
      </Field>
      <Field label="설명 (description)">
        <textarea
          defaultValue={agent.description}
          onBlur={(e) => onChange({ description: e.target.value })}
          rows={2}
          className={`${fieldCls} resize-y`}
        />
      </Field>
      <Field label="모델 (model)">
        <select
          defaultValue={agent.model ?? ''}
          onChange={(e) => onChange({ model: e.target.value || null })}
          className={`${fieldCls} h-9`}
        >
          <option value="">상속(미지정)</option>
          {HARNESS_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>
      <Field label="지침 본문 (Markdown)">
        <textarea
          defaultValue={agent.body}
          onBlur={(e) => onChange({ body: e.target.value })}
          rows={22}
          spellCheck={false}
          placeholder="# 에이전트 역할&#10;## 핵심 역할&#10;…"
          className={`${fieldCls} resize-y font-mono text-[13px] leading-relaxed`}
        />
      </Field>
      <HistoryPanel targetId={agent.id} onRestore={(body) => onChange({ body })} />
    </div>
  )
}

function SkillEditor({
  skill,
  onChange,
  onDelete
}: {
  skill: HarnessSkill
  onChange: (patch: Partial<HarnessSkill>) => void
  onDelete: () => void
}): JSX.Element {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
      <EditorHeader scopeGlobal={skill.project_id === null} kind="스킬" onDelete={onDelete} />
      <Field label="이름 (디렉터리명)">
        <input
          defaultValue={skill.name}
          onBlur={(e) => {
            const v = slugify(e.target.value)
            if (v && v !== skill.name) onChange({ name: v })
            e.target.value = v || skill.name
          }}
          className={`${fieldCls} font-mono`}
        />
      </Field>
      <Field label="설명 (description · 트리거 키워드 포함)">
        <textarea
          defaultValue={skill.description}
          onBlur={(e) => onChange({ description: e.target.value })}
          rows={3}
          className={`${fieldCls} resize-y`}
        />
      </Field>
      <Field label="SKILL.md 본문 (Markdown)">
        <textarea
          defaultValue={skill.body}
          onBlur={(e) => onChange({ body: e.target.value })}
          rows={24}
          spellCheck={false}
          className={`${fieldCls} resize-y font-mono text-[13px] leading-relaxed`}
        />
      </Field>
      <HistoryPanel targetId={skill.id} onRestore={(body) => onChange({ body })} />
    </div>
  )
}

const ACTION_META: Record<HarnessHistory['action'], { label: string; cls: string }> = {
  create: { label: '생성', cls: 'bg-accent-soft text-accent' },
  update: { label: '수정', cls: 'bg-bg-active text-text-muted' },
  delete: { label: '삭제', cls: 'bg-bg-active text-danger' },
  import: { label: '가져옴', cls: 'bg-bg-active text-text-muted' }
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** 선택 항목의 변경 이력 — 본문과 분리된 별도 공간. 스냅샷 보기·되돌리기 지원. */
function HistoryPanel({
  targetId,
  onRestore
}: {
  targetId: string
  onRestore?: (body: string) => void
}): JSX.Element {
  const { data: history } = useHarnessHistory(targetId)
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="mt-2 border-t border-border pt-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-muted">
        <History size={14} /> 변경 이력
        <span className="text-text-faint">{history?.length ?? 0}</span>
      </div>
      {!history?.length ? (
        <p className="text-xs text-text-faint">아직 변경 이력이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {history.map((h) => (
            <li key={h.id} className="rounded-[var(--radius-sm)] border border-border bg-bg-elev">
              <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${ACTION_META[h.action].cls}`}
                >
                  {ACTION_META[h.action].label}
                </span>
                <span className="truncate text-text">{h.summary}</span>
                <span className="ml-auto shrink-0 text-text-faint">{fmtTime(h.created_at)}</span>
                {h.snapshot != null && (
                  <button
                    onClick={() => setOpenId(openId === h.id ? null : h.id)}
                    className="shrink-0 text-text-faint hover:text-text"
                  >
                    {openId === h.id ? '닫기' : '보기'}
                  </button>
                )}
              </div>
              {openId === h.id && h.snapshot != null && (
                <div className="border-t border-border p-2">
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-bg-active p-2 text-[11px] leading-relaxed text-text-muted">
                    {h.snapshot}
                  </pre>
                  {onRestore && (
                    <div className="mt-1.5 flex justify-end">
                      <button
                        onClick={() => onRestore(h.snapshot as string)}
                        className="flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <RotateCcw size={12} /> 이 버전으로 되돌리기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EditorHeader({
  scopeGlobal,
  kind,
  onDelete
}: {
  scopeGlobal: boolean
  kind: string
  onDelete: () => void
}): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-faint">{kind}</span>
      {scopeGlobal ? (
        <span className="flex items-center gap-1 rounded bg-bg-active px-1.5 py-0.5 text-[11px] text-text-muted">
          <Globe size={11} /> 공용
        </span>
      ) : (
        <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">이 작품 전용</span>
      )}
      <button
        className="ml-auto flex items-center gap-1 text-xs text-text-faint hover:text-danger"
        onClick={onDelete}
      >
        <Trash2 size={13} /> 삭제
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
    </label>
  )
}
