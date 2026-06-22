import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ChevronDown, ChevronUp, Replace, X } from 'lucide-react'
import { searchPluginKey } from './searchExtension'

/** ⌘F 찾기/바꾸기 바 */
export function SearchPanel({ editor, onClose }: { editor: Editor; onClose: () => void }): JSX.Element {
  const [term, setTerm] = useState('')
  const [replacement, setReplacement] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [, force] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // 매치 개수/현재 위치는 plugin 상태에서 읽는다 → 트랜잭션마다 리렌더
  useEffect(() => {
    const onTx = (): void => force((n) => n + 1)
    editor.on('transaction', onTx)
    return () => {
      editor.off('transaction', onTx)
    }
  }, [editor])

  useEffect(() => {
    inputRef.current?.focus()
    return () => {
      editor.chain().clearSearch().run()
    }
  }, [editor])

  useEffect(() => {
    editor.chain().setSearchTerm(term).run()
  }, [term, editor])

  const s = searchPluginKey.getState(editor.state)
  const total = s?.matches.length ?? 0
  const current = total > 0 ? (s?.active ?? 0) + 1 : 0

  return (
    <div className="absolute right-4 top-2 z-30 flex flex-col gap-1.5 rounded-app border border-border bg-bg-elev p-2 shadow-[var(--shadow)]">
      <div className="flex items-center gap-1.5">
        <button
          className="icon-btn p-1"
          title={showReplace ? '바꾸기 닫기' : '바꾸기 열기'}
          onClick={() => setShowReplace((v) => !v)}
        >
          <Replace size={15} />
        </button>
        <input
          ref={inputRef}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              editor.chain()[e.shiftKey ? 'prevMatch' : 'nextMatch']().run()
            }
            if (e.key === 'Escape') onClose()
          }}
          placeholder="찾기"
          className="h-7 w-44 rounded-[var(--radius-sm)] border border-border bg-bg px-2 text-sm outline-none"
        />
        <span className="w-14 text-center text-xs tabular-nums text-text-faint">
          {current}/{total}
        </span>
        <button className="icon-btn p-1" title="이전" onClick={() => editor.chain().prevMatch().run()}>
          <ChevronUp size={15} />
        </button>
        <button className="icon-btn p-1" title="다음" onClick={() => editor.chain().nextMatch().run()}>
          <ChevronDown size={15} />
        </button>
        <button className="icon-btn p-1" title="닫기" onClick={onClose}>
          <X size={15} />
        </button>
      </div>

      {showReplace && (
        <div className="flex items-center gap-1.5">
          <span className="w-7" />
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="바꿀 내용"
            className="h-7 w-44 rounded-[var(--radius-sm)] border border-border bg-bg px-2 text-sm outline-none"
          />
          <button
            className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs hover:bg-bg-hover"
            disabled={total === 0}
            onClick={() => editor.chain().replaceCurrent(replacement).run()}
          >
            바꾸기
          </button>
          <button
            className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs hover:bg-bg-hover"
            disabled={total === 0}
            onClick={() => editor.chain().replaceAll(replacement).run()}
          >
            전체
          </button>
        </div>
      )}
    </div>
  )
}
