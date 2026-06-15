import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { Item } from '@shared/types'
import { buildTree, type TreeNode } from '../../lib/tree'
import { useCreateItem, useItems, useTrashItem, useUpdateItem } from '../../lib/items'
import { iconFor } from './itemIcons'
import { CreateMenu, type CreateChoice } from './CreateMenu'

interface RowProps {
  node: TreeNode
  depth: number
  selectedId?: string
  projectId: string
  onCreateUnder: (parentId: string, choice: CreateChoice) => void
}

function Row({ node, depth, selectedId, projectId, onCreateUnder }: RowProps): JSX.Element {
  const nav = useNavigate()
  const update = useUpdateItem(projectId)
  const trash = useTrashItem(projectId)
  const [open, setOpen] = useState(true)
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(node.item.title)
  const { item } = node
  const Icon = iconFor(item)
  const isContainer = item.type === 'folder'
  const selected = selectedId === item.id

  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-[5px] text-sm ${
          selected ? 'bg-bg-active text-text' : 'text-text-muted hover:bg-bg-hover hover:text-text'
        }`}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={() => nav(`/p/${projectId}/i/${item.id}`)}
      >
        {isContainer ? (
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
      {isContainer && open && node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <Row
              key={c.item.id}
              node={c}
              depth={depth + 1}
              selectedId={selectedId}
              projectId={projectId}
              onCreateUnder={onCreateUnder}
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
  const [rootMenu, setRootMenu] = useState(false)

  const tree = buildTree(items ?? [])

  async function handleCreate(parentId: string | null, choice: CreateChoice): Promise<void> {
    const item = await create.mutateAsync({
      projectId,
      parentId,
      type: choice.type,
      sheetSubtype: choice.sheetSubtype
    })
    nav(`/p/${projectId}/i/${item.id}`)
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
      <nav className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-4">
        <ul>
          {tree.map((node) => (
            <Row
              key={node.item.id}
              node={node}
              depth={0}
              selectedId={itemId}
              projectId={projectId}
              onCreateUnder={(pid, c) => void handleCreate(pid, c)}
            />
          ))}
        </ul>
      </nav>
    </div>
  )
}

export type { Item }
