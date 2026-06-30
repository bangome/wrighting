import type { Editor } from '@tiptap/react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
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
import { characterCountModeLabel } from '../../lib/count'
import { ToolbarDropdown } from './ToolbarDropdown'

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

      <span className="ml-auto shrink-0 text-xs text-text-faint">
        {characterCountModeLabel(prefs.characterCountMode)} {charCount.toLocaleString()} 자
      </span>
    </div>
  )
}
