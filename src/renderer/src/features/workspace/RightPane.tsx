import type { Project } from '@shared/types'
import { useCurrentItemId } from '../../lib/route'
import { useUi } from '../../store/ui'
import { GraphPanel } from '../graph/GraphPanel'
import { MemoPanel } from '../notes/MemoPanel'

/** 우측 보조 패널 — 메모 또는 현재 문서 중심 관계 그래프 */
export function RightPane({ project }: { project: Project }): JSX.Element {
  const itemId = useCurrentItemId()
  const rightPane = useUi((s) => s.rightPane)

  if (rightPane.type === 'memo') {
    return (
      <div className="flex h-full flex-col border-l border-border">
        <MemoPanel project={project} itemId={itemId} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col border-l border-border">
      <div className="min-h-0 flex-1 overflow-hidden">
        <GraphPanel project={project} focusId={itemId} />
      </div>
    </div>
  )
}
