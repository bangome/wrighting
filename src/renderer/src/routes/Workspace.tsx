import { useEffect } from 'react'
import { Route, Routes, useLocation, useParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { useProject } from '../lib/queries'
import { useIsMobile } from '../lib/useMediaQuery'
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
  const setRightPane = useUi((s) => s.setRightPane)
  const sidebarOpen = useUi((s) => s.sidebarOpen)
  const setSidebarOpen = useUi((s) => s.setSidebarOpen)
  const isMobile = useIsMobile()
  const location = useLocation()
  useRealtimeSync(projectId)

  // 모바일: 경로가 바뀌면(항목/메뉴 이동) 드로어를 닫는다
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, setSidebarOpen])

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

  // 모바일에선 분할/사이드 보조 패널을 본문 단독으로 강등하고,
  // 메모·그래프는 전체 화면 오버레이로 띄운다(아래 mobileOverlay).
  let content: JSX.Element
  if (!isMobile && rightPane.type === 'split') {
    content = (
      <ResizableSplit
        dir={splitDir}
        ratio={splitRatio}
        onChange={setSplitRatio}
        first={primaryPane}
        second={<SplitPane project={project} />}
      />
    )
  } else if (!isMobile && rightPane.type !== 'none') {
    content = (
      <div className="grid h-full min-h-0 grid-cols-[1fr_minmax(320px,460px)]">
        {primaryPane}
        <RightPane project={project} />
      </div>
    )
  } else {
    content = primaryPane
  }

  const mobileOverlay = isMobile && (rightPane.type === 'memo' || rightPane.type === 'graph')

  return (
    <div className="grid h-full grid-cols-1 overflow-hidden bg-bg md:grid-cols-[260px_1fr]">
      {/* 모바일 드로어 배경 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* 사이드바: 모바일=오프캔버스 드로어, 데스크톱=고정 컬럼 */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] transition-transform duration-200 md:static md:z-auto md:w-auto md:max-w-none md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar project={project} />
      </div>
      <div className="grid min-h-0 min-w-0 grid-rows-[auto_1fr] overflow-hidden">
        <TopBar project={project} onMenu={() => setSidebarOpen(true)} />
        <div className="min-h-0 min-w-0 overflow-hidden">{content}</div>
      </div>

      {/* 모바일: 메모·관계 그래프 전체 화면 오버레이 */}
      {mobileOverlay && (
        <div className="fixed inset-0 z-30 flex flex-col bg-bg md:hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
            <span className="text-sm font-medium">
              {rightPane.type === 'memo' ? '메모' : '관계 그래프'}
            </span>
            <button className="icon-btn" title="닫기" onClick={() => setRightPane({ type: 'none' })}>
              <X size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <RightPane project={project} />
          </div>
        </div>
      )}

      <CommandPalette project={project} />
    </div>
  )
}
