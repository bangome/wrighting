import { useParams } from 'react-router-dom'
import type { Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { DocumentEditor } from '../editor/DocumentEditor'
import { FolderView } from '../folder-views/FolderView'
import { SheetView } from '../sheet/SheetView'
import { BoardView } from '../plotboard/BoardView'

/** 선택된 아이템을 종류에 맞는 뷰로 디스패치 */
export function ItemView({ project }: { project: Project }): JSX.Element {
  const { itemId } = useParams()
  const { data: items, isLoading } = useItems(project.id)
  const item = items?.find((i) => i.id === itemId)

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

  switch (item.type) {
    case 'document':
      return <DocumentEditor key={item.id} project={project} item={item} />
    case 'folder':
      return <FolderView key={item.id} project={project} folder={item} />
    case 'sheet':
      return <SheetView key={item.id} project={project} item={item} />
    case 'plotboard':
    case 'canvas':
      return <BoardView key={item.id} project={project} item={item} />
    default:
      return <div className="p-8 text-text-muted">지원하지 않는 항목입니다.</div>
  }
}
