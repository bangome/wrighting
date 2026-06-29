import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { Item } from '@shared/types'
import { buildTree } from '../../lib/tree'
import { isAncestor, useCreateItem, useItems, useMoveItem } from '../../lib/items'
import { useSyncHierarchyLink } from '../../lib/links'
import { useStatuses } from '../../lib/labels'
import { CreateMenu, type CreateChoice } from './CreateMenu'
import { BinderRow, type DropZone } from './BinderRow'

export function Binder({ projectId }: { projectId: string }): JSX.Element {
  const { itemId } = useParams()
  const nav = useNavigate()
  const { data: items } = useItems(projectId)
  const { data: statuses } = useStatuses(projectId)
  const create = useCreateItem(projectId)
  const move = useMoveItem(projectId)
  const syncHier = useSyncHierarchyLink(projectId)
  const [rootMenu, setRootMenu] = useState(false)
  const dragIdRef = useRef<string | null>(null)
  const rootMenuAnchor = useRef<HTMLSpanElement>(null)

  const statusColorMap = new Map((statuses ?? []).map((s) => [s.id, s.color]))

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
        <span ref={rootMenuAnchor} className="relative">
          <button className="icon-btn p-1" onClick={() => setRootMenu(!rootMenu)} title="새로 만들기">
            <Plus size={15} />
          </button>
          {rootMenu && (
            <CreateMenu
              anchorRef={rootMenuAnchor}
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
            <BinderRow
              key={node.item.id}
              node={node}
              depth={0}
              selectedId={itemId}
              projectId={projectId}
              statuses={statuses ?? []}
              statusColorMap={statusColorMap}
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
