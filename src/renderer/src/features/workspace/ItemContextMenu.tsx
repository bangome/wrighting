import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  Circle,
  Copy,
  FilePenLine,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import type { Item, Status } from '@shared/types'

const MENU_WIDTH = 224
const MENU_HEIGHT_ESTIMATE = 300

interface Position {
  readonly x: number
  readonly y: number
}

interface Props {
  readonly item: Item
  readonly statuses: readonly Status[]
  readonly position: Position
  readonly onClose: () => void
  readonly onDuplicate: () => void
  readonly onRename: () => void
  readonly onStatusChange: (statusId: string | null) => void
  readonly onTrash: () => void
}

interface MenuAction {
  readonly label: string
  readonly Icon: LucideIcon
  readonly danger?: boolean
  readonly onClick: () => void
}

function clampPosition(position: Position): Position {
  return {
    x: Math.max(8, Math.min(position.x, window.innerWidth - MENU_WIDTH - 8)),
    y: Math.max(8, Math.min(position.y, window.innerHeight - MENU_HEIGHT_ESTIMATE - 8))
  }
}

function MenuRow({ action }: { readonly action: MenuAction }): JSX.Element {
  return (
    <button
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover ${
        action.danger ? 'text-danger' : 'text-text-muted hover:text-text'
      }`}
      onClick={action.onClick}
    >
      <action.Icon size={15} />
      <span className="min-w-0 flex-1 truncate">{action.label}</span>
    </button>
  )
}

export function ItemContextMenu({
  item,
  statuses,
  position,
  onClose,
  onDuplicate,
  onRename,
  onStatusChange,
  onTrash
}: Props): JSX.Element {
  const [resolvedPosition, setResolvedPosition] = useState<Position>(() => position)

  useLayoutEffect(() => {
    setResolvedPosition(clampPosition(position))
  }, [position])

  const run = (action: () => void): void => {
    action()
    onClose()
  }

  const actions: readonly MenuAction[] = [
    { label: '이름 변경', Icon: FilePenLine, onClick: () => run(onRename) },
    { label: '복제', Icon: Copy, onClick: () => run(onDuplicate) }
  ]

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(event) => event.preventDefault()} />
      <div
        role="menu"
        aria-label={`${item.title} 메뉴`}
        className="fixed z-50 w-56 overflow-hidden rounded-app border border-border bg-bg-elev py-1.5 shadow-[var(--shadow)]"
        style={{ left: resolvedPosition.x, top: resolvedPosition.y }}
      >
        {actions.map((action) => (
          <MenuRow key={action.label} action={action} />
        ))}

        <div className="my-1 border-t border-border" />

        <div className="px-3 pb-1.5 pt-1 text-xs font-medium text-text-faint">상태</div>
        <button
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          onClick={() => run(() => onStatusChange(null))}
        >
          {item.status_id ? <Circle size={15} /> : <Check size={15} />}
          <span className="min-w-0 flex-1 truncate">상태 없음</span>
        </button>
        {statuses.map((status) => (
          <button
            key={status.id}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            onClick={() => run(() => onStatusChange(status.id))}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
              style={{ background: status.color }}
            />
            <span className="min-w-0 flex-1 truncate">{status.name}</span>
            {item.status_id === status.id && <Check size={14} className="text-accent" />}
          </button>
        ))}

        <div className="my-1 border-t border-border" />

        <MenuRow action={{ label: '휴지통으로 이동', Icon: Trash2, danger: true, onClick: () => run(onTrash) }} />
      </div>
    </>,
    document.body
  )
}
