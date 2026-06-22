import { Route, Routes, useParams } from 'react-router-dom'
import { useProject } from '../lib/queries'
import { Sidebar } from '../features/workspace/Sidebar'
import { TopBar } from '../features/workspace/TopBar'
import { ProjectHome } from '../features/workspace/ProjectHome'
import { ItemView } from '../features/workspace/ItemView'
import { TabBar } from '../features/workspace/TabBar'
import { ContextBar } from '../features/workspace/ContextBar'
import { RightPane } from '../features/workspace/RightPane'
import { SplitPane } from '../features/workspace/SplitPane'
import { ResizableSplit } from '../features/workspace/ResizableSplit'
import { GraphPage } from '../features/graph/GraphPage'
import { TasksPage } from '../features/tasks/TasksPage'
import { NotesPage } from '../features/notes/NotesPage'
import { TrashPage } from '../features/workspace/TrashPage'
import { SettingsPage } from '../features/workspace/SettingsPage'
import { HarnessPage } from '../features/harness/HarnessPage'
import { Placeholder } from '../features/workspace/Placeholder'
import { CommandPalette } from '../features/command-palette/CommandPalette'
import { useUi } from '../store/ui'
import { useRealtimeSync } from '../lib/realtime'

export function Workspace(): JSX.Element {
  const { projectId } = useParams()
  const { data: project, isLoading, error } = useProject(projectId)
  const rightPane = useUi((s) => s.rightPane)
  const splitDir = useUi((s) => s.splitDir)
  const splitRatio = useUi((s) => s.splitRatio)
  const setSplitRatio = useUi((s) => s.setSplitRatio)
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

  // 메인(주) 편집 창 — 자체 탭바 + 브레드크럼 + 본문
  const primaryPane = (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden">
      <TabBar project={project} />
      <ContextBar project={project} />
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <Routes>
          <Route index element={<ProjectHome project={project} />} />
          <Route path="i/:itemId" element={<ItemView project={project} />} />
          <Route path="graph" element={<GraphPage project={project} />} />
          <Route path="tasks" element={<TasksPage project={project} />} />
          <Route path="notes" element={<NotesPage project={project} />} />
          <Route path="trash" element={<TrashPage project={project} />} />
          <Route path="settings" element={<SettingsPage project={project} />} />
          <Route path="harness" element={<HarnessPage project={project} />} />
          <Route path="import" element={<Placeholder title="가져오기" />} />
          <Route path="feedback" element={<Placeholder title="피드백 보내기" />} />
        </Routes>
      </main>
    </div>
  )

  let content: JSX.Element
  if (rightPane.type === 'split') {
    content = (
      <ResizableSplit
        dir={splitDir}
        ratio={splitRatio}
        onChange={setSplitRatio}
        first={primaryPane}
        second={<SplitPane project={project} />}
      />
    )
  } else if (rightPane.type !== 'none') {
    content = (
      <div className="grid h-full min-h-0 grid-cols-[1fr_minmax(320px,460px)]">
        {primaryPane}
        <RightPane project={project} />
      </div>
    )
  } else {
    content = primaryPane
  }

  return (
    <div className="grid h-full grid-cols-[260px_1fr] overflow-hidden bg-bg">
      <Sidebar project={project} />
      <div className="grid min-h-0 min-w-0 grid-rows-[auto_1fr] overflow-hidden">
        <TopBar project={project} />
        <div className="min-h-0 min-w-0 overflow-hidden">{content}</div>
      </div>
      <CommandPalette project={project} />
    </div>
  )
}
