import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor, type Content } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Plus, X } from 'lucide-react'
import type { Item, Project, RichDoc, SheetSubtype } from '@shared/types'
import { SHEET_SUBTYPES } from '@shared/types'
import { useSheet, useSaveSheet } from '../../lib/sheets'
import { useUpdateItem } from '../../lib/items'
import { useDebouncedEffect } from '../editor/useDebounced'
import { Backlinks } from '../graph/Backlinks'

export function SheetView({ project, item }: { project: Project; item: Item }): JSX.Element {
  const { data: sheet, isLoading } = useSheet(item.id)
  const saveSheet = useSaveSheet()
  const updateItem = useUpdateItem(project.id)

  const [title, setTitle] = useState(item.title)
  const [desc, setDesc] = useState(item.synopsis ?? '')
  const [attrs, setAttrs] = useState<Record<string, string>>({})
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [dirty, setDirty] = useState(false)
  const [loaded, setLoaded] = useState<string | null>(null)

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: '설정을 자유롭게 기록하세요…' })],
    content: '',
    editorProps: { attributes: { class: 'ProseMirror' } },
    onUpdate: () => setDirty(true)
  })

  // 시트 로드 1회 주입
  useEffect(() => {
    if (isLoading || !editor || loaded === item.id) return
    setLoaded(item.id)
    setAttrs(sheet?.attributes ?? {})
    setTags(sheet?.tags ?? [])
    editor.commands.setContent((sheet?.body as Content) ?? '')
    setDirty(false)
  }, [isLoading, sheet, editor, item.id, loaded])

  useEffect(() => {
    setTitle(item.title)
    setDesc(item.synopsis ?? '')
  }, [item.id, item.title, item.synopsis])

  // 시트(속성·태그·본문) 자동 저장
  useDebouncedEffect(
    () => {
      if (!editor || !dirty) return
      saveSheet.mutate({
        itemId: item.id,
        projectId: project.id,
        attributes: attrs,
        tags,
        body: editor.getJSON() as RichDoc
      })
      setDirty(false)
    },
    [dirty, attrs, tags],
    800
  )

  const subtypeLabel = useMemo(
    () => SHEET_SUBTYPES.find((s) => s.value === item.sheet_subtype)?.label ?? '시트',
    [item.sheet_subtype]
  )

  function setAttr(key: string, value: string): void {
    setAttrs((a) => ({ ...a, [key]: value }))
    setDirty(true)
  }
  function renameAttr(oldKey: string, newKey: string): void {
    if (!newKey || newKey === oldKey) return
    setAttrs((a) => {
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(a)) next[k === oldKey ? newKey : k] = v
      return next
    })
    setDirty(true)
  }
  function removeAttr(key: string): void {
    setAttrs((a) => {
      const next = { ...a }
      delete next[key]
      return next
    })
    setDirty(true)
  }
  function addTag(): void {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
      setDirty(true)
    }
    setTagInput('')
  }

  return (
    <div className="mx-auto h-full max-w-[760px] overflow-y-auto px-10 py-8">
      {/* 헤더 */}
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-app bg-bg-active text-xl font-semibold">
        {title.slice(0, 1)}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && updateItem.mutate({ id: item.id, patch: { title: title.trim() } })}
        className="mb-3 block w-full bg-transparent text-3xl font-bold outline-none"
      />

      {/* 설명 · 태그 · 속성 */}
      <div className="mb-6 flex flex-col gap-2.5 border-b border-border pb-5 text-sm">
        <div className="flex items-start gap-3">
          <span className="w-16 shrink-0 pt-1 text-text-muted">설명</span>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => updateItem.mutate({ id: item.id, patch: { synopsis: desc } })}
            rows={1}
            placeholder="한 줄 설명"
            className="flex-1 resize-none bg-transparent outline-none placeholder:text-text-faint"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-text-muted">태그</span>
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-bg-active px-2 py-0.5 text-xs"
              >
                {t}
                <button
                  onClick={() => {
                    setTags(tags.filter((x) => x !== t))
                    setDirty(true)
                  }}
                  className="text-text-faint hover:text-danger"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              onBlur={addTag}
              placeholder="추가…"
              className="w-20 bg-transparent text-xs outline-none placeholder:text-text-faint"
            />
          </div>
        </div>

        {Object.entries(attrs).map(([k, v]) => (
          <div key={k} className="flex items-center gap-3">
            <input
              defaultValue={k}
              onBlur={(e) => renameAttr(k, e.target.value.trim())}
              className="w-16 shrink-0 bg-transparent text-text-muted outline-none"
            />
            <input
              value={v}
              onChange={(e) => setAttr(k, e.target.value)}
              className="flex-1 bg-transparent outline-none"
              placeholder="값"
            />
            <button onClick={() => removeAttr(k)} className="text-text-faint hover:text-danger">
              <X size={13} />
            </button>
          </div>
        ))}

        <button
          onClick={() => {
            let i = 1
            let key = '속성'
            while (key in attrs) key = `속성 ${i++}`
            setAttr(key, '')
          }}
          className="flex items-center gap-1.5 text-text-faint hover:text-text"
        >
          <Plus size={14} /> 속성 추가
        </button>
        <span className="text-xs text-text-faint">
          {subtypeLabel} · {dirty ? '저장 중…' : '저장됨'}
        </span>
      </div>

      {/* 본문 */}
      <EditorContent editor={editor} />

      {/* 백링크 */}
      <Backlinks project={project} item={item} />
    </div>
  )
}
