import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor, type Content } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { Item, Project, RichDoc } from '@shared/types'
import { useDocument, useSaveDocument } from '../../lib/documents'
import { useUpdateItem } from '../../lib/items'
import { useDebouncedEffect } from '../editor/useDebounced'
import { Backlinks } from '../graph/Backlinks'

/**
 * 노트 — 미정리 아이디어·임시 메모용 경량 에디터.
 * 본문은 documents 테이블을 재사용하며, 하단 관계 패널로 문서·시트·플롯보드와 연결한다.
 */
export function NoteView({ project, item }: { project: Project; item: Item }): JSX.Element {
  const { data: doc, isLoading } = useDocument(item.id)
  const save = useSaveDocument()
  const updateItem = useUpdateItem(project.id)
  const [title, setTitle] = useState(item.title)
  const [dirty, setDirty] = useState(false)
  const loadedFor = useRef<string | null>(null)

  const editor = useEditor({
    extensions: useMemo(
      () => [StarterKit, Placeholder.configure({ placeholder: '떠오르는 생각을 자유롭게 적어두세요…' })],
      []
    ),
    content: '',
    editorProps: { attributes: { class: 'ProseMirror' } },
    onUpdate: () => setDirty(true)
  })

  useEffect(() => {
    if (!editor || isLoading) return
    if (loadedFor.current === item.id) return
    loadedFor.current = item.id
    editor.commands.setContent((doc?.content as Content) ?? '')
    setDirty(false)
  }, [editor, isLoading, doc, item.id])

  useEffect(() => setTitle(item.title), [item.id, item.title])

  useDebouncedEffect(
    () => {
      if (!editor || !dirty) return
      const text = editor.getText()
      save.mutate({
        itemId: item.id,
        projectId: project.id,
        content: editor.getJSON() as RichDoc,
        text_plain: text,
        word_count: text.trim() ? text.trim().split(/\s+/).length : 0,
        char_count: text.length
      })
      setDirty(false)
    },
    [dirty],
    800
  )

  function commitTitle(): void {
    const t = title.trim()
    if (t && t !== item.title) updateItem.mutate({ id: item.id, patch: { title: t } })
  }

  return (
    <div className="mx-auto h-full max-w-[680px] overflow-y-auto px-10 py-8">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitTitle()
            editor?.commands.focus()
          }
        }}
        placeholder="제목 없는 노트"
        className="mb-4 block w-full bg-transparent text-2xl font-bold outline-none placeholder:text-text-faint"
      />
      <EditorContent editor={editor} />
      <Backlinks project={project} item={item} />
    </div>
  )
}
