import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import type { Item, Status } from '@shared/types'
import type { TreeNode } from '../../lib/tree'
import { useTrashItem, useUpdateItem } from '../../lib/items'
import { useDuplicateItem } from '../../lib/itemDuplication'
import { iconFor } from './itemIcons'
import { CreateMenu, type CreateChoice } from './CreateMenu'
import { ItemContextMenu } from './ItemContextMenu'

export type DropZone = 'before' | 'after' | 'inside'

interface ContextMenuState {
  readonly x: number
  readonly y: number
}

interface RowProps {
  readonly node: TreeNode
  readonly depth: number
  readonly selectedId?: string
  readonly projectId: string
  readonly statuses: readonly Status[]
  readonly statusColorMap: ReadonlyMap<string, string>
  readonly onCreateUnder: (parentId: string, choice: CreateChoice) => void
  readonly dragIdRef: React.MutableRefObject<string | null>
  readonly onMove: (dragId: string, targetId: string, zone: DropZone) => void
}

function zoneFromEvent(event: React.DragEvent): DropZone {
  const rect = event.currentTarget.getBoundingClientRect()
  const y = event.clientY - rect.top
  if (y > rect.height * 0.25 && y < rect.height * 0.75) return 'inside'
  return y < rect.height / 2 ? 'before' : 'after'
}

export function BinderRow({
  node,
  depth,
  selectedId,
  projectId,
  statuses,
  statusColorMap,
  onCreateUnder,
  dragIdRef,
  onMove
}: RowProps): JSX.Element {
  const nav = useNavigate()
  const update = useUpdateItem(projectId)
  const trash = useTrashItem(projectId)
  const duplicate = useDuplicateItem(projectId)
  const [open, setOpen] = useState(true)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(node.item.title)
  const [dnd, setDnd] = useState<DropZone | null>(null)
  const menuAnchor = useRef<HTMLSpanElement>(null)
  const { item } = node
  const Icon = iconFor(item)
  const isContainer = item.type === 'folder'
  const hasChildren = node.children.length > 0
  const selected = selectedId === item.id

  function beginRename(): void {
    setName(item.title)
    setRenaming(true)
  }

  function trashItem(): void {
    if (confirm(`'${item.title}'을(를) 휴지통으로 보낼까요?`)) trash.mutate(item.id)
  }

  function setStatus(statusId: string | null): void {
    update.mutate({ id: item.id, patch: { status_id: statusId } })
  }

  function saveRename(): void {
    setRenaming(false)
    const nextName = name.trim()
    if (nextName && nextName !== item.title) update.mutate({ id: item.id, patch: { title: nextName } })
  }

  return (
    <li>
      <div
        draggable
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setContextMenu({ x: event.clientX, y: event.clientY })
        }}
        onDragStart={(event) => {
          dragIdRef.current = item.id
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', item.id)
        }}
        onDragEnd={() => {
          dragIdRef.current = null
          setDnd(null)
        }}
        onDragOver={(event) => {
          const dragId = dragIdRef.current
          if (!dragId || dragId === item.id) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          const zone = zoneFromEvent(event)
          setDnd(zone)
          if (zone === 'inside' && hasChildren && !open) setOpen(true)
        }}
        onDragLeave={() => setDnd(null)}
        onDrop={(event) => {
          event.preventDefault()
          event.stopPropagation()
          const dragId = dragIdRef.current
          const zone = dnd
          setDnd(null)
          if (dragId && zone && dragId !== item.id) onMove(dragId, item.id, zone)
        }}
        className={`group relative flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-[5px] text-sm ${
          selected ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover hover:text-text'
        } ${dnd === 'inside' ? 'ring-1 ring-inset ring-accent bg-bg-hover' : ''}`}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={() => nav(`/p/${projectId}/i/${item.id}`)}
      >
        {dnd === 'before' && (
          <span className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-accent" />
        )}
        {dnd === 'after' && (
          <span className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-accent" />
        )}
        {hasChildren ? (
          <button
            className="shrink-0 text-text-faint"
            onClick={(event) => {
              event.stopPropagation()
              setOpen(!open)
            }}
            title={open ? '접기' : '펼치기'}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        <span className="relative shrink-0">
          <Icon size={15} className="opacity-80" />
          {item.status_id && statusColorMap.has(item.status_id) && (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-bg-sidebar"
              style={{ background: statusColorMap.get(item.status_id) }}
            />
          )}
        </span>
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onBlur={saveRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') {
                setName(item.title)
                setRenaming(false)
              }
            }}
            className="min-w-0 flex-1 rounded border border-accent bg-bg-elev-2 px-1 py-0 text-sm outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate" onDoubleClick={beginRename}>
            {item.title}
          </span>
        )}
        <span ref={menuAnchor} className="relative opacity-0 group-hover:opacity-100">
          {isContainer && (
            <button
              className="text-text-faint hover:text-text"
              onClick={(event) => {
                event.stopPropagation()
                setCreateMenuOpen(!createMenuOpen)
              }}
              title="하위 항목 만들기"
            >
              <Plus size={14} />
            </button>
          )}
          {createMenuOpen && (
            <CreateMenu
              anchorRef={menuAnchor}
              onChoose={(choice) => onCreateUnder(item.id, choice)}
              onClose={() => setCreateMenuOpen(false)}
            />
          )}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 text-text-faint hover:text-text"
          onClick={(event) => {
            event.stopPropagation()
            setContextMenu({ x: event.clientX, y: event.clientY })
          }}
          title="메뉴"
        >
          <MoreHorizontal size={14} />
        </button>
        <button
          className="opacity-0 group-hover:opacity-100 text-text-faint hover:text-danger"
          onClick={(event) => {
            event.stopPropagation()
            trashItem()
          }}
          title="휴지통으로"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {contextMenu && (
        <ItemContextMenu
          item={item}
          statuses={statuses}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onDuplicate={() => duplicate.mutate(item)}
          onRename={beginRename}
          onStatusChange={setStatus}
          onTrash={trashItem}
        />
      )}
      {open && hasChildren && (
        <ul>
          {node.children.map((child) => (
            <BinderRow
              key={child.item.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              projectId={projectId}
              statuses={statuses}
              statusColorMap={statusColorMap}
              onCreateUnder={onCreateUnder}
              dragIdRef={dragIdRef}
              onMove={onMove}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
