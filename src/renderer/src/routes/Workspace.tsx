import { Route, Routes, useParams } from 'react-router-dom'
import { useProject } from '../lib/queries'
import { Sidebar } from '../features/workspace/Sidebar'
import { TopBar } from '../features/workspace/TopBar'
import { ProjectHome } from '../features/workspace/ProjectHome'
import { ItemView } from '../features/workspace/ItemView'
import { GraphPanel } from '../features/graph/GraphPanel'
import { GraphPage } from '../features/graph/GraphPage'
import { TasksPage } from '../features/tasks/TasksPage'
import { TrashPage } from '../features/workspace/TrashPage'
import { SettingsPage } from '../features/workspace/SettingsPage'
import { Placeholder } from '../features/workspace/Placeholder'
import { CommandPalette } from '../features/command-palette/CommandPalette'
import { useUi } from '../store/ui'
import { useRealtimeSync } from '../lib/realtime'

export function Workspace(): JSX.Element {
  const { projectId } = useParams()
  const { data: project, isLoading, error } = useProject(projectId)
  const rightPanel = useUi((s) => s.rightPanel)
  useRealtimeSync(projectId)

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-text-faint">불러오는 중…</div>
  }
  if (error || !project) {
    return (
      <div className="flex h-full items-center justify-center text-danger">
        작품을 불러오지 못했습니다.
      </div>
    )
  }

  return (
    <div className="grid h-full grid-cols-[260px_1fr] bg-bg">
      <Sidebar project={project} />
      <div className="grid min-w-0 grid-rows-[auto_1fr]">
        <TopBar project={project} />
        <div
          className={`grid min-h-0 ${rightPanel === 'graph' ? 'grid-cols-[1fr_360px]' : 'grid-cols-1'}`}
        >
          <main className="min-w-0 overflow-hidden">
            <Routes>
              <Route index element={<ProjectHome project={project} />} />
              <Route path="i/:itemId" element={<ItemView project={project} />} />
              <Route path="graph" element={<GraphPage project={project} />} />
              <Route path="tasks" element={<TasksPage project={project} />} />
              <Route path="trash" element={<TrashPage project={project} />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="import" element={<Placeholder title="가져오기" />} />
              <Route path="feedback" element={<Placeholder title="피드백 보내기" />} />
            </Routes>
          </main>
          {rightPanel === 'graph' && (
            <div className="border-l border-border">
              <GraphPanel project={project} />
            </div>
          )}
        </div>
      </div>
      <CommandPalette project={project} />
    </div>
  )
}
