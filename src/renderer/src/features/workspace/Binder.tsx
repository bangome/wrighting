import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { Item } from '@shared/types'
import { buildTree, type TreeNode } from '../../lib/tree'
import {
  isAncestor,
  useCreateItem,
  useItems,
  useMoveItem,
  useTrashItem,
  useUpdateItem
} from '../../lib/items'
import { useSyncHierarchyLink } from '../../lib/links'
import { iconFor } from './itemIcons'
import { CreateMenu, type CreateChoice } from './CreateMenu'

type DropZone = 'before' | 'after' | 'inside'

interface RowProps {
  node: TreeNode
  depth: number
  selectedId?: string
  projectId: string
  onCreateUnder: (parentId: string, choice: CreateChoice) => void
  dragIdRef: React.MutableRefObject<string | null>
  onMove: (dragId: string, targetId: string, zone: DropZone) => void
}

function Row({
  node,
  depth,
  selectedId,
  projectId,
  onCreateUnder,
  dragIdRef,
  onMove
}: RowProps): JSX.Element {
  const nav = useNavigate()
  const update = useUpdateItem(projectId)
  const trash = useTrashItem(projectId)
  const [open, setOpen] = useState(true)
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(node.item.title)
  const [dnd, setDnd] = useState<DropZone | null>(null)
  const { item } = node
  const Icon = iconFor(item)
  const isContainer = item.type === 'folder'
  const hasChildren = node.children.length > 0
  const selected = selectedId === item.id

  function zoneFromEvent(e: React.DragEvent): DropZone {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    // 모든 항목(문서·시트·폴더)이 하위 항목을 받을 수 있음
    if (y > rect.height * 0.25 && y < rect.height * 0.75) return 'inside'
    return y < rect.height / 2 ? 'before' : 'after'
  }

  return (
    <li>
      <div
        draggable
        onDragStart={(e) => {
          dragIdRef.current = item.id
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', item.id)
        }}
        onDragEnd={() => {
          dragIdRef.current = null
          setDnd(null)
        }}
        onDragOver={(e) => {
          const dragId = dragIdRef.current
          if (!dragId || dragId === item.id) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          const zone = zoneFromEvent(e)
          setDnd(zone)
          if (zone === 'inside' && hasChildren && !open) setOpen(true)
        }}
        onDragLeave={() => setDnd(null)}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
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
            onClick={(e) => {
              e.stopPropagation()
              setOpen(!open)
            }}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        <Icon size={15} className="shrink-0 opacity-80" />
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => {
              setRenaming(false)
              if (name.trim() && name !== item.title)
                update.mutate({ id: item.id, patch: { title: name.trim() } })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setName(item.title)
                setRenaming(false)
              }
            }}
            className="min-w-0 flex-1 rounded border border-accent bg-bg-elev-2 px-1 py-0 text-sm outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate" onDoubleClick={() => setRenaming(true)}>
            {item.title}
          </span>
        )}
        <span className="relative opacity-0 group-hover:opacity-100">
          {isContainer && (
            <button
              className="text-text-faint hover:text-text"
              onClick={(e) => {
                e.stopPropagation()
                setMenu(!menu)
              }}
            >
              <Plus size={14} />
            </button>
          )}
          {menu && (
            <CreateMenu
              onChoose={(c) => onCreateUnder(item.id, c)}
              onClose={() => setMenu(false)}
            />
          )}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 text-text-faint hover:text-danger"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(`'${item.title}'을(를) 휴지통으로 보낼까요?`)) trash.mutate(item.id)
          }}
          title="휴지통으로"
        >
          ×
        </button>
      </div>
      {open && hasChildren && (
        <ul>
          {node.children.map((c) => (
            <Row
              key={c.item.id}
              node={c}
              depth={depth + 1}
              selectedId={selectedId}
              projectId={projectId}
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

export function Binder({ projectId }: { projectId: string }): JSX.Element {
  const { itemId } = useParams()
  const nav = useNavigate()
  const { data: items } = useItems(projectId)
  const create = useCreateItem(projectId)
  const move = useMoveItem(projectId)
  const syncHier = useSyncHierarchyLink(projectId)
  const [rootMenu, setRootMenu] = useState(false)
  const dragIdRef = useRef<string | null>(null)

  // 노트는 별도 '노트' 탭에서 관리하므로 작품 트리에서는 제외
  const all = (items ?? []).filter((i) => i.type !== 'notes')
  const tree = buildTree(all)

  async function handleCreate(parentId: string | null, choice: CreateChoice): Promise<void> {
    const item = await create.mutateAsync({
      projectId,
      parentId,
      type: choice.type,
      sheetSubtype: choice.sheetSubtype
    })
    nav(`/p/${projectId}/i/${item.id}`)
  }

  function handleMove(dragId: string, targetId: string, zone: DropZone): void {
    const target = all.find((i) => i.id === targetId)
    if (!target || dragId === targetId) return

    let newParentId: string | null
    let beforeId: string | null
    if (zone === 'inside') {
      newParentId = targetId
      beforeId = null // 폴더 맨 끝에 추가
    } else {
      newParentId = target.parent_id
      const sibs = all
        .filter((i) => i.parent_id === newParentId && i.id !== dragId)
        .sort((a, b) => a.sort_order - b.sort_order)
      const ti = sibs.findIndex((s) => s.id === targetId)
      beforeId = zone === 'before' ? targetId : (sibs[ti + 1]?.id ?? null)
    }

    // 폴더를 자기 자신/하위로 드롭하는 것 방지
    if (newParentId && isAncestor(all, dragId, newParentId)) return

    move.mutate({ dragId, newParentId, beforeId })

    // 상하관계 링크 동기화: 폴더가 아닌 항목(문서·시트 등) 하위로 들어가면 두 항목을 연결.
    // 루트/폴더 하위로 빠지면 기존 상하관계 링크를 제거.
    const parent = newParentId ? all.find((i) => i.id === newParentId) : null
    const linkParentId = parent && parent.type !== 'folder' ? parent.id : null
    syncHier.mutate({ childId: dragId, parentId: linkParentId })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="text-xs font-medium uppercase tracking-wide text-text-faint">작품</span>
        <span className="relative">
          <button className="icon-btn p-1" onClick={() => setRootMenu(!rootMenu)} title="새로 만들기">
            <Plus size={15} />
          </button>
          {rootMenu && (
            <CreateMenu
              onChoose={(c) => void handleCreate(null, c)}
              onClose={() => setRootMenu(false)}
            />
          )}
        </span>
      </div>
      <nav
        className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-4"
        onDragOver={(e) => {
          if (dragIdRef.current) e.preventDefault()
        }}
        onDrop={(e) => {
          // 빈 영역에 드롭 → 루트 맨 끝으로 이동
          const dragId = dragIdRef.current
          if (dragId) {
            e.preventDefault()
            move.mutate({ dragId, newParentId: null, beforeId: null })
          }
        }}
      >
        <ul>
          {tree.map((node) => (
            <Row
              key={node.item.id}
              node={node}
              depth={0}
              selectedId={itemId}
              projectId={projectId}
              onCreateUnder={(pid, c) => void handleCreate(pid, c)}
              dragIdRef={dragIdRef}
              onMove={handleMove}
            />
          ))}
        </ul>
      </nav>
    </div>
  )
}

export type { Item }
