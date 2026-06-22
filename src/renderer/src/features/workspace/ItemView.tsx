import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import type { Item, Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { useUi } from '../../store/ui'
import { DocumentEditor } from '../editor/DocumentEditor'
import { FolderView } from '../folder-views/FolderView'
import { SheetView } from '../sheet/SheetView'
import { BoardView } from '../plotboard/BoardView'
import { NoteView } from '../notes/NoteView'

/** 구체 아이템을 종류에 맞는 뷰로 디스패치 (메인·우측 패널 공용) */
export function ItemPane({ project, item }: { project: Project; item: Item }): JSX.Element {
  switch (item.type) {
    case 'document':
      return <DocumentEditor key={item.id} project={project} item={item} />
    case 'notes':
      return <NoteView key={item.id} project={project} item={item} />
    case 'folder':
      return <FolderView key={item.id} project={project} folder={item} />
    case 'sheet':
      return <SheetView key={item.id} project={project} item={item} />
    case 'plotboard':
      return <BoardView key={item.id} project={project} item={item} mode="plot" />
    case 'canvas':
      return <BoardView key={item.id} project={project} item={item} mode="canvas" />
    default:
      return <div className="p-8 text-text-muted">지원하지 않는 항목입니다.</div>
  }
}

/** 라우팅된 메인 패널 — URL 의 itemId 를 열고 탭에 등록 */
export function ItemView({ project }: { project: Project }): JSX.Element {
  const { itemId } = useParams()
  const { data: items, isLoading } = useItems(project.id)
  const openTab = useUi((s) => s.openTab)
  const item = items?.find((i) => i.id === itemId)

  useEffect(() => {
    if (item) openTab(item.id)
  }, [item, openTab])

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-text-faint">불러오는 중…</div>
  }
  if (!item) {
    return (
      <div className="flex h-full items-center justify-center text-text-muted">
        항목을 찾을 수 없습니다.
      </div>
    )
  }

  return <ItemPane project={project} item={item} />
}
