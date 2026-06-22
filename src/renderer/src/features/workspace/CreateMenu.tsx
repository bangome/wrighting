import { FileText, Folder, LayoutGrid, Route, StickyNote, User } from 'lucide-react'
import type { ItemType, SheetSubtype } from '@shared/types'

export interface CreateChoice {
  type: ItemType
  sheetSubtype?: SheetSubtype
  label: string
  shortcut: string
  Icon: typeof FileText
}

export const CREATE_CHOICES: CreateChoice[] = [
  { type: 'document', label: '새 문서', shortcut: '⌘N', Icon: FileText },
  { type: 'notes', label: '새 노트', shortcut: '⌘⇧N', Icon: StickyNote },
  { type: 'sheet', sheetSubtype: 'character', label: '새 캐릭터', shortcut: '⌘⇧C', Icon: User },
  { type: 'plotboard', label: '새 플롯보드', shortcut: '⌘⇧P', Icon: Route },
  { type: 'canvas', label: '새 캔버스', shortcut: '⌘⇧V', Icon: LayoutGrid },
  { type: 'folder', label: '새 폴더', shortcut: '⌘⇧G', Icon: Folder }
]

interface Props {
  onChoose: (choice: CreateChoice) => void
  onClose: () => void
}

/** 생성 메뉴 — 새 문서/캐릭터/플롯보드/캔버스/폴더 (스크린샷 b6164b) */
export function CreateMenu({ onChoose, onClose }: Props): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-7 z-30 w-60 rounded-app border border-border bg-bg-elev py-1.5 shadow-[var(--shadow)]">
        {CREATE_CHOICES.map((c) => (
          <button
            key={c.label}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-bg-hover"
            onClick={() => {
              onChoose(c)
              onClose()
            }}
          >
            <c.Icon size={16} className="text-text-muted" />
            <span className="flex-1">{c.label}</span>
            <span className="text-xs text-text-faint">{c.shortcut}</span>
          </button>
        ))}
      </div>
    </>
  )
}
