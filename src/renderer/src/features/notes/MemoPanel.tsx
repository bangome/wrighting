import { useMemo } from 'react'
import { Plus, X, StickyNote } from 'lucide-react'
import type { Project } from '@shared/types'
import { useItems, useCreateItem } from '../../lib/items'
import { useUi } from '../../store/ui'
import { NoteCard } from './NoteCard'

/**
 * 우측 '메모' 패널 — 현재 열린 항목에 연결된 노트를 표시·추가한다.
 * (노트 탭의 '항목 연결 노트'와 동일한 데이터, 문서를 보면서 곁에 메모)
 */
export function MemoPanel({
  project,
  itemId
}: {
  project: Project
  itemId: string | undefined
}): JSX.Element {
  const { data: items } = useItems(project.id)
  const create = useCreateItem(project.id)
  const setRightPane = useUi((s) => s.setRightPane)

  const target = useMemo(
    () => (items ?? []).find((i) => i.id === itemId),
    [items, itemId]
  )
  const notes = useMemo(
    () => (items ?? []).filter((i) => i.type === 'notes' && i.linked_item_id === itemId),
    [items, itemId]
  )

  function addMemo(): void {
    if (itemId) create.mutate({ projectId: project.id, parentId: null, type: 'notes', linkedItemId: itemId })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <StickyNote size={15} className="text-text-muted" />
        <span className="text-sm font-medium">메모</span>
        {notes.length > 0 && <span className="text-xs text-text-faint">{notes.length}</span>}
        <button
          className="ml-auto icon-btn p-1"
          title="메모 추가"
          onClick={addMemo}
          disabled={!itemId}
        >
          <Plus size={15} />
        </button>
        <button className="icon-btn p-1" title="패널 닫기" onClick={() => setRightPane({ type: 'none' })}>
          <X size={15} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-scroll p-3">
        {!itemId ? (
          <p className="mt-8 text-center text-sm text-text-faint">
            항목을 열면 메모를 달 수 있습니다.
          </p>
        ) : notes.length === 0 ? (
          <p className="mt-8 px-2 text-center text-sm text-text-faint">
            {target ? `'${target.title}'에` : '이 항목에'} 연결된 메모가 없습니다.
            <br />+ 로 첫 메모를 추가하세요.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((n) => (
              <NoteCard key={n.id} project={project} note={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
