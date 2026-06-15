import type { Project } from '@shared/types'
import { RelationGraph } from './RelationGraph'

/** 우측 사이드 패널용 관계 그래프 (스크린샷 47542f 우측) */
export function GraphPanel({ project }: { project: Project }): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-medium">
        그래프
      </div>
      <div className="min-h-0 flex-1">
        <RelationGraph project={project} compact />
      </div>
    </div>
  )
}
