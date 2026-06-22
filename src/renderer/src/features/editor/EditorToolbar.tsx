import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronsUpDown,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2
} from 'lucide-react'
import { useEditorPrefs, FONT_FAMILIES, LINE_HEIGHTS } from '../../store/editorPrefs'

interface Props {
  editor: Editor
  charCount: number
}

/** 본문 표시 크기 pt 선택지 (12pt = 기준 배율 1.0). fontScale = pt / 12 */
const FONT_PTS = [10, 11, 12, 13, 14, 16, 18, 20, 24]
const PT_BASE = 12

function Btn({
  active,
  onClick,
  title,
  children
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-[6px] ${
        active ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}

function Sep(): JSX.Element {
  return <span className="mx-1 h-5 w-px bg-border" />
}

interface Opt {
  value: string
  label: string
}

/** 값 + 위아래 화살표(펼침) 드롭다운 — 글씨체·크기·줄간격 공용 */
function ToolbarDropdown({
  value,
  display,
  options,
  onChange,
  title,
  minWidth
}: {
  value: string
  display?: string
  options: Opt[]
  onChange: (v: string) => void
  title: string
  minWidth: number
}): JSX.Element {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const cur = options.find((o) => o.value === value)

  function toggle(): void {
    if (pos) return setPos(null)
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, left: r.left, width: r.width })
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
        style={{ minWidth }}
        className="flex h-7 items-center gap-1 rounded-[6px] bg-transparent px-1.5 text-sm text-text-muted hover:bg-bg-hover hover:text-text"
      >
        <span className="flex-1 truncate text-left text-text">{display ?? cur?.label ?? ''}</span>
        <ChevronsUpDown size={13} className="shrink-0 text-text-faint" />
      </button>
      {pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setPos(null)} />
            <div
              style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width }}
              className="z-[61] max-h-64 overflow-y-auto rounded-app border border-border bg-bg-elev py-1 shadow-[var(--shadow)]"
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(o.value)
                    setPos(null)
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-bg-hover ${
                    o.value === value ? 'text-text' : 'text-text-muted'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  )
}

/** 리치텍스트 툴바 — 글씨체/크기/줄간격 · 정렬 · 서식 · 목록 */
export function EditorToolbar({ editor, charCount }: Props): JSX.Element {
  const prefs = useEditorPrefs()
  const curPt = Math.round(prefs.fontScale * PT_BASE)

  return (
    <div className="flex flex-1 items-center gap-0.5 overflow-x-auto px-3 py-1.5">
      <Btn title="실행 취소" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={16} />
      </Btn>
      <Btn title="다시 실행" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={16} />
      </Btn>
      <Sep />

      {/* 본문 표시 — 글씨체 · 크기 · 줄간격 (펼침 드롭다운) */}
      <ToolbarDropdown
        title="글씨체"
        minWidth={96}
        value={prefs.fontFamily}
        options={FONT_FAMILIES.map((f) => ({ value: f.value, label: f.label }))}
        onChange={(v) => prefs.set({ fontFamily: v })}
      />
      <ToolbarDropdown
        title="글씨 크기"
        minWidth={66}
        value={String(curPt)}
        display={`${curPt} pt`}
        options={FONT_PTS.map((pt) => ({ value: String(pt), label: `${pt} pt` }))}
        onChange={(v) => prefs.set({ fontScale: Number(v) / PT_BASE })}
      />
      <ToolbarDropdown
        title="줄간격"
        minWidth={62}
        value={String(prefs.lineHeight)}
        options={LINE_HEIGHTS.map((l) => ({ value: String(l.value), label: String(l.value) }))}
        onChange={(v) => prefs.set({ lineHeight: Number(v) })}
      />
      <Sep />

      <Btn
        title="굵게"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </Btn>
      <Btn
        title="기울임"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </Btn>
      <Btn
        title="취소선"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </Btn>
      <Btn
        title="밑줄"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon size={16} />
      </Btn>
      <Sep />

      <Btn
        title="왼쪽 정렬"
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft size={16} />
      </Btn>
      <Btn
        title="가운데 정렬"
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter size={16} />
      </Btn>
      <Btn
        title="오른쪽 정렬"
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight size={16} />
      </Btn>
      <Btn
        title="양쪽 정렬"
        active={editor.isActive({ textAlign: 'justify' })}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        <AlignJustify size={16} />
      </Btn>
      <Sep />

      <Btn
        title="글머리 목록"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={16} />
      </Btn>
      <Btn
        title="번호 목록"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </Btn>
      <Btn
        title="인용"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={16} />
      </Btn>
      <Sep />

      <Btn
        title={editor.isActive('table') ? '표 삭제' : '표 삽입 (3×3)'}
        active={editor.isActive('table')}
        onClick={() =>
          editor.isActive('table')
            ? editor.chain().focus().deleteTable().run()
            : editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <TableIcon size={16} />
      </Btn>

      <span className="ml-auto shrink-0 text-xs text-text-faint">{charCount.toLocaleString()} 자</span>
    </div>
  )
}
