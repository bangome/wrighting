import { useEffect, useRef, useState } from 'react'
import { countText, formatCount } from '../lib/count'

type SaveStatus = 'loading' | 'saved' | 'saving' | 'dirty'

function statusLabel(status: SaveStatus): string {
  switch (status) {
    case 'loading':
      return '불러오는 중…'
    case 'saving':
      return '저장 중…'
    case 'dirty':
      return '편집 중…'
    case 'saved':
    default:
      return '저장됨'
  }
}

interface Props {
  dir: string
  file: string
  title: string
}

/** 스토리 바이블 / 작품 메모리 등 마크다운 문서용 소스 에디터 */
export function DocEditor({ dir, file, title }: Props): JSX.Element {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<SaveStatus>('loading')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dirtyRef = useRef(false)
  const latest = useRef({ dir, file, text: '' })
  latest.current.dir = dir
  latest.current.file = file

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    void window.api.readScene(dir, file).then((content) => {
      if (cancelled) return
      setText(content)
      latest.current.text = content
      dirtyRef.current = false
      setStatus('saved')
    })
    return () => {
      cancelled = true
    }
  }, [dir, file])

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    const value = e.target.value
    setText(value)
    latest.current.text = value
    dirtyRef.current = true
    setStatus('dirty')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void save(), 800)
  }

  async function save(): Promise<void> {
    setStatus('saving')
    await window.api.writeScene(latest.current.dir, latest.current.file, latest.current.text)
    dirtyRef.current = false
    setStatus('saved')
  }

  // 문서 전환/언마운트 시 미저장분 flush
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (dirtyRef.current) {
        void window.api.writeScene(latest.current.dir, latest.current.file, latest.current.text)
      }
    }
  }, [dir, file])

  return (
    <div className="scene-editor">
      <header className="scene-editor-header">
        <span className="scene-title">{title}</span>
        <span className="word-count">{formatCount(countText(text))}</span>
        <span className={`save-status ${status}`}>{statusLabel(status)}</span>
      </header>
      <textarea className="doc-source" value={text} onChange={onChange} spellCheck={false} />
    </div>
  )
}
