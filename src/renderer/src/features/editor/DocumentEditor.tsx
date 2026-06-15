import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, type Content } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import type { Item, Project, RichDoc } from '@shared/types'
import { useDocument, useSaveDocument } from '../../lib/documents'
import { useUpdateItem } from '../../lib/items'
import { EditorToolbar } from './EditorToolbar'
import { DocTools } from './DocTools'
import { useDebouncedEffect } from './useDebounced'
import { useEditorPrefs } from '../../store/editorPrefs'

interface Props {
  project: Project
  item: Item
}

export function DocumentEditor({ project, item }: Props): JSX.Element {
  const { data: doc, isLoading } = useDocument(item.id)
  const save = useSaveDocument()
  const updateItem = useUpdateItem(project.id)
  const prefs = useEditorPrefs()
  const [title, setTitle] = useState(item.title)
  const [dirty, setDirty] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const loadedFor = useRef<string | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: '여기에 이야기를 쓰세요…' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CharacterCount
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'ProseMirror mx-auto max-w-[720px]',
        spellcheck: String(prefs.spellcheck)
      }
    },
    onUpdate: ({ editor }) => {
      setDirty(true)
      setCharCount(editor.storage.characterCount.characters())
    }
  })

  // 문서 로드 시 1회 에디터에 주입 (아이템 전환마다)
  useEffect(() => {
    if (!editor || isLoading) return
    if (loadedFor.current === item.id) return
    loadedFor.current = item.id
    editor.commands.setContent((doc?.content as Content) ?? '')
    setCharCount(editor.storage.characterCount.characters())
    setDirty(false)
  }, [editor, isLoading, doc, item.id])

  // 본문 자동 저장 (디바운스)
  useDebouncedEffect(
    () => {
      if (!editor || !dirty) return
      const json = editor.getJSON() as RichDoc
      const text = editor.getText()
      save.mutate({
        itemId: item.id,
        projectId: project.id,
        content: json,
        text_plain: text,
        word_count: text.trim() ? text.trim().split(/\s+/).length : 0,
        char_count: editor.storage.characterCount.characters()
      })
      setDirty(false)
    },
    [dirty, charCount],
    900
  )

  // 제목 자동 저장
  function commitTitle(): void {
    const t = title.trim()
    if (t && t !== item.title) updateItem.mutate({ id: item.id, patch: { title: t } })
  }

  useEffect(() => setTitle(item.title), [item.id, item.title])

  // 맞춤법 검사 토글을 contentEditable에 반영
  useEffect(() => {
    if (editor) editor.view.dom.setAttribute('spellcheck', String(prefs.spellcheck))
  }, [editor, prefs.spellcheck])

  return (
    <div className="flex h-full flex-col">
      {editor && (
        <div className="flex items-stretch border-b border-border">
          <EditorToolbar editor={editor} charCount={charCount} />
          <div className="flex items-center border-l border-border px-2">
            <DocTools editor={editor} project={project} item={item} />
          </div>
        </div>
      )}
      <div
        className={`min-h-0 flex-1 overflow-y-auto px-8 py-8 ${prefs.focusMode ? 'focus-mode' : ''}`}
        style={{ fontSize: `${16 * prefs.fontScale}px` }}
      >
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
          placeholder="제목 없음"
          className="mx-auto mb-6 block w-full max-w-[720px] bg-transparent text-center text-2xl font-bold outline-none placeholder:text-text-faint"
        />
        <EditorContent editor={editor} />
      </div>
      <div className="flex items-center gap-3 border-t border-border px-4 py-1.5 text-xs text-text-faint">
        <span>{charCount.toLocaleString()} 자</span>
        <span className="ml-auto">{dirty ? '저장 중…' : '저장됨'}</span>
      </div>
    </div>
  )
}
