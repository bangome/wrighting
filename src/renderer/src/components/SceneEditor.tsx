import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useState } from 'react'
import { countText, formatCount, type TextCount } from '../lib/count'

type SaveStatus = 'loading' | 'saved' | 'saving' | 'dirty'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 저장된 평문(빈 줄로 문단 구분)을 Tiptap 초기 HTML 로 변환 */
function textToHtml(text: string): string {
  if (!text.trim()) return '<p></p>'
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

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
  /** 마운트 시 이 씬에 텍스트를 삽입하는 함수를 부모에 등록(언마운트 시 null) */
  onProvideInsert?: (insert: ((text: string) => void) | null) => void
}

export function SceneEditor({ dir, file, title, onProvideInsert }: Props): JSX.Element {
  const [status, setStatus] = useState<SaveStatus>('loading')
  const [count, setCount] = useState<TextCount>({ chars: 0, charsNoSpace: 0, words: 0 })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dirtyRef = useRef(false)

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p></p>',
    onUpdate: ({ editor }) => {
      dirtyRef.current = true
      setStatus('dirty')
      setCount(countText(editor.getText({ blockSeparator: '\n\n' })))
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => void save(), 800)
    }
  })

  const editorRef = useRef(editor)
  editorRef.current = editor

  async function save(): Promise<void> {
    const ed = editorRef.current
    if (!ed) return
    setStatus('saving')
    await window.api.writeScene(dir, file, ed.getText({ blockSeparator: '\n\n' }))
    dirtyRef.current = false
    setStatus('saved')
  }

  // 씬 로드
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    void window.api.readScene(dir, file).then((text) => {
      const ed = editorRef.current
      if (cancelled || !ed) return
      ed.commands.setContent(textToHtml(text))
      dirtyRef.current = false
      setStatus('saved')
      setCount(countText(text))
    })
    return () => {
      cancelled = true
    }
  }, [dir, file])

  // 언마운트(씬 전환) 시 미저장분 flush
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      const ed = editorRef.current
      if (ed && dirtyRef.current) {
        void window.api.writeScene(dir, file, ed.getText({ blockSeparator: '\n\n' }))
      }
    }
  }, [dir, file])

  // AI 결과를 이 씬 끝에 삽입하는 함수를 부모에 등록
  useEffect(() => {
    if (!editor || !onProvideInsert) return
    onProvideInsert((text: string) => {
      editor
        .chain()
        .focus('end')
        .insertContentAt(editor.state.doc.content.size, textToHtml(text))
        .run()
    })
    return () => onProvideInsert(null)
  }, [editor, onProvideInsert])

  return (
    <div className="scene-editor">
      <header className="scene-editor-header">
        <span className="scene-title">{title}</span>
        <span className="word-count">{formatCount(count)}</span>
        <span className={`save-status ${status}`}>{statusLabel(status)}</span>
      </header>
      <EditorContent editor={editor} className="prose" />
    </div>
  )
}
