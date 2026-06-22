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

interface Props {
  editor: Editor
  charCount: number
}

const HEADINGS = [
  { label: '본문', level: 0 },
  { label: '제목 1', level: 1 },
  { label: '제목 2', level: 2 },
  { label: '제목 3', level: 3 }
] as const

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

/** 리치텍스트 툴바 — 글꼴/정렬/서식/목록 (스크린샷 67e276). 한국어 도구는 M7. */
export function EditorToolbar({ editor, charCount }: Props): JSX.Element {
  const curHeading = HEADINGS.find((h) => h.level > 0 && editor.isActive('heading', { level: h.level }))

  return (
    <div className="flex flex-1 items-center gap-0.5 overflow-x-auto px-3 py-1.5">
      <Btn title="실행 취소" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={16} />
      </Btn>
      <Btn title="다시 실행" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={16} />
      </Btn>
      <Sep />

      <select
        value={curHeading?.level ?? 0}
        onChange={(e) => {
          const level = Number(e.target.value)
          if (level === 0) editor.chain().focus().setParagraph().run()
          else
            editor
              .chain()
              .focus()
              .toggleHeading({ level: level as 1 | 2 | 3 })
              .run()
        }}
        className="h-7 rounded-[6px] border border-border bg-bg-elev px-2 text-sm outline-none"
      >
        {HEADINGS.map((h) => (
          <option key={h.level} value={h.level}>
            {h.label}
          </option>
        ))}
      </select>
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
        title="밑줄"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon size={16} />
      </Btn>
      <Btn
        title="취소선"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} />
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

      <span className="ml-auto text-xs text-text-faint">{charCount.toLocaleString()} 자</span>
    </div>
  )
}
