import { useMemo } from 'react'
import type { Editor } from '@tiptap/react'
import { analyzeRepetition } from '../../lib/repetition'

/** 반복 표현 목록 — 클릭 시 해당 단어를 본문에서 찾기로 강조 */
export function RepetitionPanel({
  editor,
  onPick
}: {
  editor: Editor
  onPick: (word: string) => void
}): JSX.Element {
  const entries = useMemo(() => analyzeRepetition(editor.getText()), [editor])

  if (entries.length === 0) {
    return <p className="px-1 py-2 text-xs text-text-faint">반복이 잦은 표현이 없습니다.</p>
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      <div className="mb-1 px-1 text-xs text-text-faint">3회 이상 반복된 표현</div>
      <div className="flex flex-col">
        {entries.map((e) => (
          <button
            key={e.word}
            onClick={() => onPick(e.word)}
            className="flex items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-bg-hover"
          >
            <span className="truncate">{e.word}</span>
            <span className="ml-2 shrink-0 rounded-full bg-bg-active px-1.5 text-xs text-text-muted">
              {e.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
