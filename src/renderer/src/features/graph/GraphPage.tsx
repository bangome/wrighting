import type { Project } from '@shared/types'
import { RelationGraph } from './RelationGraph'

/** 전체 화면 관계 그래프 (사이드바 '그래프') */
export function GraphPage({ project }: { project: Project }): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <h2 className="text-base font-semibold">관계 그래프</h2>
      </div>
      <div className="min-h-0 flex-1">
        <RelationGraph project={project} />
      </div>
    </div>
  )
}
