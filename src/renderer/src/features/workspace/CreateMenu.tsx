import { useRef, useState } from 'react'
import {
  FileText,
  Folder,
  LayoutGrid,
  Route,
  Sheet,
  ChevronRight,
  User,
  Calendar,
  Building2,
  Box,
  MapPin,
  Globe,
  Layers,
  type LucideIcon
} from 'lucide-react'
import type { ItemType, SheetSubtype } from '@shared/types'
import { SHEET_SUBTYPES } from '@shared/types'

export interface CreateChoice {
  type: ItemType
  sheetSubtype?: SheetSubtype
  label: string
  shortcut?: string
  Icon: LucideIcon
}

/** 최상위 생성 항목 (시트는 별도 서브메뉴) */
const TOP_CHOICES: CreateChoice[] = [
  { type: 'document', label: '새 문서', shortcut: '⌘N', Icon: FileText },
  { type: 'plotboard', label: '새 플롯보드', shortcut: '⌘⇧P', Icon: Route },
  { type: 'canvas', label: '새 캔버스', shortcut: '⌘⇧V', Icon: LayoutGrid },
  { type: 'folder', label: '새 폴더', shortcut: '⌘⇧G', Icon: Folder }
]

/** '새 시트' 서브메뉴 — 하위 종류별 생성 (스크린샷 순서/아이콘) */
const SHEET_ICONS: Record<SheetSubtype, LucideIcon> = {
  character: User,
  event: Calendar,
  organization: Building2,
  item: Box,
  place: MapPin,
  worldview: Globe,
  other: Layers,
  concept: Globe
}
const SHEET_CHOICES: CreateChoice[] = SHEET_SUBTYPES.map((s) => ({
  type: 'sheet',
  sheetSubtype: s.value,
  label: s.label,
  Icon: SHEET_ICONS[s.value]
}))

interface Props {
  onChoose: (choice: CreateChoice) => void
  onClose: () => void
}

function MenuRow({
  choice,
  onClick
}: {
  choice: CreateChoice
  onClick: () => void
}): JSX.Element {
  return (
    <button
      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-bg-hover"
      onClick={onClick}
    >
      <choice.Icon size={16} className="text-text-muted" />
      <span className="flex-1">{choice.label}</span>
      {choice.shortcut && <span className="text-xs text-text-faint">{choice.shortcut}</span>}
    </button>
  )
}

/** 생성 메뉴 — 새 문서/노트/시트(▶)/플롯보드/캔버스/폴더 */
export function CreateMenu({ onChoose, onClose }: Props): JSX.Element {
  const [sheetOpen, setSheetOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openSheet = (): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setSheetOpen(true)
  }
  // 부모↔서브메뉴 사이 이동 중 닫힘 방지 (약간의 지연)
  const scheduleClose = (): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setSheetOpen(false), 120)
  }
  const pick = (c: CreateChoice): void => {
    onChoose(c)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-7 z-30 w-60 rounded-app border border-border bg-bg-elev py-1.5 shadow-[var(--shadow)]">
        <MenuRow choice={TOP_CHOICES[0]} onClick={() => pick(TOP_CHOICES[0])} />

        {/* 새 시트 — 서브메뉴 */}
        <div className="relative" onMouseEnter={openSheet} onMouseLeave={scheduleClose}>
          <button
            className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-bg-hover ${sheetOpen ? 'bg-bg-hover' : ''}`}
            onClick={openSheet}
          >
            <Sheet size={16} className="text-text-muted" />
            <span className="flex-1">새 시트</span>
            <ChevronRight size={14} className="text-text-faint" />
          </button>
          {sheetOpen && (
            <div
              className="absolute left-full top-0 z-40 w-44 rounded-app border border-border bg-bg-elev py-1.5 shadow-[var(--shadow)]"
              onMouseEnter={openSheet}
              onMouseLeave={scheduleClose}
            >
              {SHEET_CHOICES.map((c) => (
                <MenuRow key={c.sheetSubtype} choice={c} onClick={() => pick(c)} />
              ))}
            </div>
          )}
        </div>

        {TOP_CHOICES.slice(1).map((c) => (
          <MenuRow key={c.label} choice={c} onClick={() => pick(c)} />
        ))}
      </div>
    </>
  )
}
