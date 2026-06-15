import { useEffect, useRef, useState } from 'react'
import type { AiRole, AiEvent, CorpusInfo } from '@shared/types'

const ROLE_LABELS: Record<AiRole, string> = {
  architect: '설계 · 기획',
  drafter: '집필',
  consistency: '일관성 검사',
  readerCritic: '독자 평가'
}

const ROLE_HINTS: Record<AiRole, string> = {
  architect: '예) 회귀물 주인공의 동기와 1~5화 플롯을 잡아줘',
  drafter: '예) 1장 1씬: 주인공이 회귀를 자각하는 장면을 써줘',
  consistency: '예) 지금까지의 설정과 본문에서 모순을 찾아줘',
  readerCritic: '예) 1장 도입부가 독자를 붙잡을 수 있을지 평가해줘'
}

interface Props {
  projectDir: string
  /** 현재 열린 씬 경로(없으면 null) — 맥락 조립용 */
  sceneFile: string | null
  /** 현재 씬 에디터에 텍스트 삽입(없으면 null) */
  onInsert: ((text: string) => void) | null
}

const CONTEXT_ROLES: AiRole[] = ['drafter', 'consistency', 'readerCritic']

export function AiPanel({ projectDir, sceneFile, onInsert }: Props): JSX.Element {
  const [role, setRole] = useState<AiRole>('architect')
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [corpus, setCorpus] = useState<CorpusInfo | null>(null)
  const [importing, setImporting] = useState(false)
  const [useCorpus, setUseCorpus] = useState(true)
  const activeId = useRef<string | null>(null)

  useEffect(() => {
    void window.api.corpusInfo(projectDir).then(setCorpus)
  }, [projectDir])

  async function importRefs(): Promise<void> {
    setImporting(true)
    try {
      setCorpus(await window.api.corpusImport(projectDir))
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    const off = window.api.onAiEvent((e: AiEvent) => {
      if (e.requestId !== activeId.current) return
      if (e.kind === 'chunk') setOutput((o) => o + e.text)
      else if (e.kind === 'done') setRunning(false)
      else if (e.kind === 'error') {
        setError(e.message)
        setRunning(false)
      }
    })
    return off
  }, [])

  async function run(): Promise<void> {
    if (!prompt.trim() || running) return
    setOutput('')
    setError(null)
    setRunning(true)
    try {
      activeId.current = await window.api.startAi({
        projectDir,
        role,
        prompt,
        sceneFile: sceneFile ?? undefined,
        useCorpus: role === 'drafter' ? useCorpus : undefined
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setRunning(false)
    }
  }

  return (
    <aside className="ai-panel">
      <header className="ai-header">AI 어시스턴트</header>

      <div className="ai-roles">
        {(Object.keys(ROLE_LABELS) as AiRole[]).map((r) => (
          <button
            key={r}
            className={`role-tab${r === role ? ' active' : ''}`}
            onClick={() => setRole(r)}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="ai-corpus">
        <div className="corpus-row">
          <span className="muted">
            레퍼런스 {corpus ? `${corpus.sources.length}편 · ${corpus.total}청크` : '…'}
          </span>
          <button className="icon-btn" disabled={importing} onClick={importRefs}>
            {importing ? '색인 중…' : '+ 파일'}
          </button>
        </div>
        {role === 'drafter' && (corpus?.total ?? 0) > 0 && (
          <label className="corpus-toggle">
            <input
              type="checkbox"
              checked={useCorpus}
              onChange={(e) => setUseCorpus(e.target.checked)}
            />
            집필 시 레퍼런스 활용
          </label>
        )}
      </div>

      <textarea
        className="ai-prompt"
        placeholder={ROLE_HINTS[role]}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      {CONTEXT_ROLES.includes(role) && (
        <div className="ai-context-note">
          {sceneFile ? '✓ 현재 씬 기준 맥락(바이블 + 본문) 포함' : '※ 씬을 선택하면 본문 맥락이 포함됩니다'}
        </div>
      )}

      <button className="ai-run" disabled={running || !prompt.trim()} onClick={run}>
        {running ? '생성 중…' : '실행'}
      </button>

      {error && <div className="ai-error">⚠ {error}</div>}

      {output && (
        <div className="ai-output-bar">
          <button className="icon-btn" onClick={() => void navigator.clipboard.writeText(output)}>
            복사
          </button>
          {onInsert && (
            <button className="icon-btn" onClick={() => onInsert(output)}>
              에디터에 삽입
            </button>
          )}
        </div>
      )}

      <div className="ai-output">
        {output ? output : <span className="muted">결과가 여기에 표시됩니다.</span>}
      </div>
    </aside>
  )
}
