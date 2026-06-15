import { useEffect, useRef, useState } from 'react'
import { type SheetProfile, SHEET_TYPES } from '@shared/types'
import { countText, formatCount } from '../lib/count'

type SaveStatus = 'loading' | 'saved' | 'saving' | 'dirty'
interface Attr {
  key: string
  value: string
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function statusLabel(s: SaveStatus): string {
  return s === 'loading' ? '불러오는 중…' : s === 'saving' ? '저장 중…' : s === 'dirty' ? '편집 중…' : '저장됨'
}

interface Props {
  dir: string
  file: string
  title: string
}

/** 구조화 엔티티(인물·장소 등) 시트 편집기 — 프로필(타입/속성/태그) + 본문 */
export function SheetEditor({ dir, file, title }: Props): JSX.Element {
  const [type, setType] = useState('character')
  const [attrs, setAttrs] = useState<Attr[]>([])
  const [tags, setTags] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<SaveStatus>('loading')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dirtyRef = useRef(false)
  const latest = useRef({ dir, file, type, attrs, tags, body })
  latest.current = { dir, file, type, attrs, tags, body }

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    void window.api.readSheet(dir, file).then((d) => {
      if (cancelled) return
      setType(d.profile.type || 'character')
      setAttrs(Object.entries(d.profile.attributes).map(([key, value]) => ({ key, value })))
      setTags(d.profile.tags.join(', '))
      setBody(d.body)
      dirtyRef.current = false
      setStatus('saved')
    })
    return () => {
      cancelled = true
    }
  }, [dir, file])

  function buildProfile(): SheetProfile {
    const c = latest.current
    const attributes: Record<string, string> = {}
    for (const a of c.attrs) {
      const k = a.key.trim()
      if (k) attributes[k] = a.value
    }
    return { type: c.type, attributes, tags: parseList(c.tags) }
  }

  function persist(): Promise<void> {
    const c = latest.current
    return window.api.writeSheet(c.dir, c.file, buildProfile(), c.body)
  }

  async function save(): Promise<void> {
    setStatus('saving')
    await persist()
    dirtyRef.current = false
    setStatus('saved')
  }

  function scheduleSave(): void {
    dirtyRef.current = true
    setStatus('dirty')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void save(), 700)
  }

  // 시트 전환/언마운트 시 미저장분 flush
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (dirtyRef.current) void persist()
    }
  }, [dir, file])

  function setAttr(i: number, patch: Partial<Attr>): void {
    setAttrs((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))
    scheduleSave()
  }
  function addAttr(): void {
    setAttrs((prev) => [...prev, { key: '', value: '' }])
    scheduleSave()
  }
  function removeAttr(i: number): void {
    setAttrs((prev) => prev.filter((_, idx) => idx !== i))
    scheduleSave()
  }

  return (
    <div className="scene-editor">
      <header className="scene-editor-header">
        <span className="scene-title">{title}</span>
        <span className="word-count">{formatCount(countText(body))}</span>
        <span className={`save-status ${status}`}>{statusLabel(status)}</span>
      </header>

      <div className="sheet-scroll">
        <div className="sheet-profile">
          <label className="sheet-field">
            <span>타입</span>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                scheduleSave()
              }}
            >
              {SHEET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <div className="sheet-attrs">
            <span className="sheet-attrs-label">속성</span>
            {attrs.map((a, i) => (
              <div key={i} className="attr-row">
                <input
                  className="attr-key"
                  value={a.key}
                  placeholder="속성명"
                  onChange={(e) => setAttr(i, { key: e.target.value })}
                />
                <input
                  className="attr-val"
                  value={a.value}
                  placeholder="값"
                  onChange={(e) => setAttr(i, { value: e.target.value })}
                />
                <button className="conn-x" title="삭제" onClick={() => removeAttr(i)}>
                  ×
                </button>
              </div>
            ))}
            <button className="icon-btn" onClick={addAttr}>
              + 속성
            </button>
          </div>

          <label className="sheet-field">
            <span>태그 (쉼표)</span>
            <input
              value={tags}
              placeholder="주연, 회귀"
              onChange={(e) => {
                setTags(e.target.value)
                scheduleSave()
              }}
            />
          </label>
        </div>

        <textarea
          className="sheet-body"
          value={body}
          spellCheck={false}
          placeholder="자유 서술(배경, 서사적 메모 등)"
          onChange={(e) => {
            setBody(e.target.value)
            scheduleSave()
          }}
        />
      </div>
    </div>
  )
}
