import { useEffect, useMemo, useState } from 'react'
import type { Project, BibleEntry } from '@shared/types'
import type { Selection } from '../selection'

interface FileRef {
  file: string
  title: string
  kind: 'scene' | 'doc'
  id?: string
}

interface Props {
  dir: string
  file: string
  project: Project
  onChange: (project: Project) => void
  onOpen: (sel: Selection) => void
}

/** 현재 파일의 연결(나가는)·백링크(들어오는)를 보여주고 추가/삭제한다. */
export function Connections({ dir, file, project, onChange, onOpen }: Props): JSX.Element {
  const [bible, setBible] = useState<BibleEntry[]>([])
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState('')

  useEffect(() => {
    void window.api.listBible(dir).then(setBible)
  }, [dir])

  const files = useMemo<FileRef[]>(() => {
    const scenes: FileRef[] = project.chapters.flatMap((c) =>
      c.scenes.map((s) => ({
        file: s.file,
        title: `${c.title} / ${s.title}`,
        kind: 'scene' as const,
        id: s.id
      }))
    )
    const docs: FileRef[] = bible.map((b) => ({ file: b.file, title: b.title, kind: 'doc' as const }))
    return [...scenes, ...docs]
  }, [project, bible])

  const byFile = useMemo(() => new Map(files.map((f) => [f.file, f])), [files])
  const conns = project.connections ?? []
  const outgoing = conns.filter((c) => c.from === file)
  const incoming = conns.filter((c) => c.to === file)
  const total = outgoing.length + incoming.length

  function label(path: string): string {
    return byFile.get(path)?.title ?? path
  }

  function openFile(path: string): void {
    const f = byFile.get(path)
    if (!f) return
    onOpen(
      f.kind === 'scene'
        ? { kind: 'scene', id: f.id as string, file: f.file, title: f.title }
        : { kind: 'doc', file: f.file, title: f.title }
    )
  }

  async function add(): Promise<void> {
    if (!target || target === file) return
    onChange(await window.api.addConnection(dir, file, target))
    setTarget('')
  }

  async function remove(id: string): Promise<void> {
    onChange(await window.api.removeConnection(dir, id))
  }

  return (
    <section className="connections">
      <header className="conn-head" onClick={() => setOpen((v) => !v)}>
        <span>
          {open ? '▾' : '▸'} 연결 · 백링크{total ? ` (${total})` : ''}
        </span>
      </header>
      {open && (
        <div className="conn-body">
          <div className="conn-add">
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">+ 연결할 대상 선택…</option>
              {files
                .filter((f) => f.file !== file)
                .map((f) => (
                  <option key={f.file} value={f.file}>
                    {f.title}
                  </option>
                ))}
            </select>
            <button className="icon-btn" disabled={!target} onClick={add}>
              연결
            </button>
          </div>

          {outgoing.length > 0 && (
            <div className="conn-group">
              <span className="conn-label">나가는 연결</span>
              {outgoing.map((c) => (
                <div key={c.id} className="conn-row">
                  <span className="conn-link" onClick={() => openFile(c.to)}>
                    → {label(c.to)}
                  </span>
                  <button className="conn-x" title="삭제" onClick={() => remove(c.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {incoming.length > 0 && (
            <div className="conn-group">
              <span className="conn-label">백링크 (들어오는)</span>
              {incoming.map((c) => (
                <div key={c.id} className="conn-row">
                  <span className="conn-link" onClick={() => openFile(c.from)}>
                    ← {label(c.from)}
                  </span>
                  <button className="conn-x" title="삭제" onClick={() => remove(c.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {total === 0 && <p className="conn-empty">아직 연결이 없습니다.</p>}
        </div>
      )}
    </section>
  )
}
