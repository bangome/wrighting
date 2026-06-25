import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor, type Content } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import { TableKit } from '@tiptap/extension-table'
import { useNavigate } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'
import type { Item, Project, RichDoc } from '@shared/types'
import { useDocument, useSaveDocument } from '../../lib/documents'
import { useItems, useUpdateItem } from '../../lib/items'
import { useSyncMentionLinks } from '../../lib/links'
import { useAutoSnapshot } from '../../lib/snapshots'
import { EditorToolbar } from './EditorToolbar'
import { DocTools } from './DocTools'
import { useDebouncedEffect } from './useDebounced'
import { useEditorPrefs, fontStack, platformGoal } from '../../store/editorPrefs'
import { createMention, type MentionSource } from './mention/mention'
import { SearchExtension } from './search/searchExtension'
import { SearchPanel } from './search/SearchPanel'

interface Props {
  project: Project
  item: Item
}

/** 클릭 한 번으로 텍스트를 클립보드에 복사하는 작은 버튼 (복사 후 1.5초간 체크 표시) */
function CopyButton({ getText, label }: { getText: () => string; label: string }): JSX.Element {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={async () => {
        const text = getText().trim()
        if (!text) return
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        } catch {
          // 클립보드 접근 실패(권한 등) — 조용히 무시
        }
      }}
      className="inline-flex h-6 w-6 items-center justify-center rounded text-text-faint transition hover:bg-bg-hover hover:text-text"
    >
      {copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
    </button>
  )
}

/** RichDoc JSON에서 멘션된 아이템 id 집합을 추출 */
function collectMentionIds(doc: RichDoc): string[] {
  const ids = new Set<string>()
  const walk = (node: Record<string, unknown> | undefined): void => {
    if (!node) return
    if (node.type === 'mention') {
      const id = (node.attrs as { id?: string } | undefined)?.id
      if (id) ids.add(id)
    }
    const content = node.content as Array<Record<string, unknown>> | undefined
    if (Array.isArray(content)) content.forEach(walk)
  }
  walk((doc as Record<string, unknown> | null) ?? undefined)
  return [...ids]
}

export function DocumentEditor({ project, item }: Props): JSX.Element {
  const { data: doc, isLoading } = useDocument(item.id)
  const { data: items } = useItems(project.id)
  const save = useSaveDocument()
  const updateItem = useUpdateItem(project.id)
  const syncLinks = useSyncMentionLinks(project.id)
  const maybeSnapshot = useAutoSnapshot(item.id, project.id)
  const prefs = useEditorPrefs()
  const nav = useNavigate()
  const [title, setTitle] = useState(item.title)
  const [dirty, setDirty] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [charNoSpace, setCharNoSpace] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const goal = platformGoal(prefs.platform)
  const loadedFor = useRef<string | null>(null)

  // 멘션 후보 홀더 — 에디터는 1회 생성되므로 ref로 최신 아이템 목록을 전달
  const mentionSource = useRef<MentionSource>({ items: [] })
  mentionSource.current.items = items ?? []

  const editor = useEditor({
    extensions: useMemo(
      () => [
        StarterKit,
        Underline,
        Placeholder.configure({ placeholder: '여기에 이야기를 쓰세요… (@로 다른 항목 연결)' }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        CharacterCount,
        TableKit.configure({ table: { resizable: true } }),
        createMention(mentionSource.current),
        SearchExtension
      ],
      []
    ),
    content: '',
    editorProps: {
      attributes: {
        class: 'ProseMirror mx-auto max-w-[720px]',
        spellcheck: String(prefs.spellcheck)
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
          event.preventDefault()
          setSearchOpen(true)
          return true
        }
        return false
      },
      handleClickOn: (_view, _pos, node) => {
        if (node.type.name === 'mention') {
          const id = node.attrs.id as string | undefined
          if (id) nav(`/p/${project.id}/i/${id}`)
          return true
        }
        return false
      }
    },
    onUpdate: ({ editor }) => {
      setDirty(true)
      setCharCount(editor.storage.characterCount.characters())
      setCharNoSpace(editor.getText().replace(/\s/g, '').length)
    }
  })

  // 문서 로드 시 1회 에디터에 주입 (아이템 전환마다)
  useEffect(() => {
    if (!editor || isLoading) return
    if (loadedFor.current === item.id) return
    loadedFor.current = item.id
    editor.commands.setContent((doc?.content as Content) ?? '')
    setCharCount(editor.storage.characterCount.characters())
    setCharNoSpace(editor.getText().replace(/\s/g, '').length)
    setDirty(false)
  }, [editor, isLoading, doc, item.id])

  // 본문 저장 + 멘션 링크 동기화 — 디바운스와 언마운트 flush가 공유하는 실제 동작.
  // ref로 최신 클로저(editor/dirty/item)를 담아, 언마운트 시점에도 정확히 현재 문서를 저장한다.
  const persist = useRef<() => void>(() => {})
  persist.current = (): void => {
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
    syncLinks.mutate({ fromItem: item.id, toItemIds: collectMentionIds(json) })
    // 저장될 때마다 자동 버전 기록 (간격·변경 조건은 훅 내부에서 판단)
    maybeSnapshot(json)
    setDirty(false)
  }

  // 본문 자동 저장 (디바운스)
  useDebouncedEffect(() => persist.current(), [dirty, charCount], 900)

  // 에디터를 떠날 때(그래프 등으로 이동/문서 전환) 대기 중인 저장·멘션 동기화를 즉시 반영.
  // 이게 없으면 멘션 직후 디바운스(900ms) 안에 화면을 옮길 때 링크가 생성되지 않는다.
  useEffect(() => () => persist.current(), [])

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
        <div className="no-scrollbar flex items-stretch overflow-x-auto border-b border-border">
          <EditorToolbar editor={editor} charCount={charCount} />
          <div className="flex shrink-0 items-center border-l border-border px-2">
            <DocTools
              editor={editor}
              project={project}
              item={item}
              onOpenSearch={() => setSearchOpen(true)}
            />
          </div>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {editor && searchOpen && <SearchPanel editor={editor} onClose={() => setSearchOpen(false)} />}
        <div
          className={`h-full overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 ${prefs.focusMode ? 'focus-mode' : ''}`}
          style={{
            fontSize: `${16 * prefs.fontScale}px`,
            fontFamily: fontStack(prefs.fontFamily),
            lineHeight: prefs.lineHeight
          }}
        >
          <div className="relative mx-auto mb-6 w-full max-w-[720px]">
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
              className="block w-full bg-transparent px-8 text-center text-2xl font-bold outline-none placeholder:text-text-faint"
            />
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <CopyButton getText={() => title} label="제목 복사" />
            </div>
          </div>
          <div className="mx-auto mb-1 flex w-full max-w-[720px] justify-end">
            <CopyButton getText={() => editor?.getText() ?? ''} label="본문 복사" />
          </div>
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-border px-4 py-1.5 text-xs text-text-faint">
        <span>{charCount.toLocaleString()} 자</span>
        <span>공백 제외 {charNoSpace.toLocaleString()}</span>
        {goal > 0 && (
          <span className={charNoSpace >= goal ? 'text-ok' : ''}>
            목표 {goal.toLocaleString()}자 · {Math.round((charNoSpace / goal) * 100)}%
          </span>
        )}
        <span className="ml-auto">{dirty ? '저장 중…' : '저장됨'}</span>
      </div>
    </div>
  )
}
