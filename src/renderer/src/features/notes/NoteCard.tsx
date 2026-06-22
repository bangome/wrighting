import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Item, Project, RichDoc } from '@shared/types'
import { useUpdateItem, useTrashItem } from '../../lib/items'
import { useDocument, useSaveDocument } from '../../lib/documents'
import { useDebouncedEffect } from '../editor/useDebounced'

/** 여러 줄 plain text → RichDoc(문단 배열). 전체 노트 뷰와 호환되도록 documents.content 도 함께 저장. */
export function textToDoc(text: string): RichDoc {
  const paras = text.split('\n').map((line) => ({
    type: 'paragraph',
    ...(line ? { content: [{ type: 'text', text: line }] } : {})
  }))
  return { type: 'doc', content: paras.length ? paras : [{ type: 'paragraph' }] } as unknown as RichDoc
}

/**
 * 노트 카드 — 본문 인라인 편집(디바운스 저장) + 연결 대상 선택 + 삭제.
 * targets 가 비면 연결 드롭다운을 숨긴다(메모 패널처럼 대상이 고정된 경우).
 */
export function NoteCard({
  project,
  note,
  targets = []
}: {
  project: Project
  note: Item
  targets?: Item[]
}): JSX.Element {
  const { data: doc, isLoading } = useDocument(note.id)
  const save = useSaveDocument()
  const updateItem = useUpdateItem(project.id)
  const trash = useTrashItem(project.id)
  const [text, setText] = useState('')
  const [dirty, setDirty] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (isLoading || loaded) return
    setText(doc?.text_plain ?? '')
    setLoaded(true)
  }, [isLoading, doc, loaded])

  useDebouncedEffect(
    () => {
      if (!dirty) return
      save.mutate({
        itemId: note.id,
        projectId: project.id,
        content: textToDoc(text),
        text_plain: text,
        word_count: text.trim() ? text.trim().split(/\s+/).length : 0,
        char_count: text.length
      })
      setDirty(false)
    },
    [dirty, text],
    700
  )

  return (
    <div className="group rounded-app border border-border bg-bg-elev p-3 transition-colors focus-within:border-text-faint">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setDirty(true)
        }}
        placeholder="메모를 입력하세요…"
        rows={3}
        className="min-h-[64px] w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-text-faint"
      />
      <div className="mt-2 flex items-center gap-2 border-t border-border pt-2 text-xs text-text-faint opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        {targets.length > 0 && (
          <select
            value={note.linked_item_id ?? ''}
            onChange={(e) =>
              updateItem.mutate({ id: note.id, patch: { linked_item_id: e.target.value || null } })
            }
            className="rounded-[var(--radius-sm)] border border-border bg-bg-elev px-1.5 py-0.5 outline-none"
          >
            <option value="">연결 없음</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        )}
        <button
          className="ml-auto hover:text-danger"
          title="노트 삭제"
          onClick={() => trash.mutate(note.id)}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
