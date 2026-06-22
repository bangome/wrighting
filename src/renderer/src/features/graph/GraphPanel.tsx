import { X } from 'lucide-react'
import type { Project } from '@shared/types'
import { useUi } from '../../store/ui'
import { RelationGraph } from './RelationGraph'

/** 우측 사이드 패널용 관계 그래프. focusId 지정 시 현재 문서 중심(ego) 그래프. */
export function GraphPanel({
  project,
  focusId
}: {
  project: Project
  focusId?: string
}): JSX.Element {
  const setRightPane = useUi((s) => s.setRightPane)
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-sm font-medium">
        {focusId ? '관계 그래프 · 현재 문서 중심' : '관계 그래프'}
        <button
          className="ml-auto icon-btn p-1"
          title="패널 닫기"
          onClick={() => setRightPane({ type: 'none' })}
        >
          <X size={15} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <RelationGraph project={project} compact focusId={focusId} />
      </div>
    </div>
  )
}
