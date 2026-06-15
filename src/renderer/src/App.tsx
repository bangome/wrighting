import { useCallback, useRef, useState } from 'react'
import type { Project } from '@shared/types'
import type { Selection } from './selection'
import { Binder } from './components/Binder'
import { SceneEditor } from './components/SceneEditor'
import { SceneMeta } from './components/SceneMeta'
import { Connections } from './components/Connections'
import { DocEditor } from './components/DocEditor'
import { SheetEditor } from './components/SheetEditor'
import { AiPanel } from './components/AiPanel'
import { GraphView } from './components/GraphView'

export default function App(): JSX.Element {
  const [project, setProject] = useState<Project | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [view, setView] = useState<'workspace' | 'graph'>('workspace')
  const [busy, setBusy] = useState(false)
  const insertRef = useRef<((text: string) => void) | null>(null)

  const provideInsert = useCallback((fn: ((text: string) => void) | null) => {
    insertRef.current = fn
  }, [])
  const handleInsert = useCallback((text: string) => {
    insertRef.current?.(text)
  }, [])
  const openFromGraph = useCallback((sel: Selection) => {
    setSelection(sel)
    setView('workspace')
  }, [])

  async function handleCreate(): Promise<void> {
    setBusy(true)
    try {
      const p = await window.api.createProject()
      if (p) {
        setProject(p)
        setSelection(null)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleOpen(): Promise<void> {
    setBusy(true)
    try {
      const p = await window.api.openProject()
      if (p) {
        setProject(p)
        setSelection(null)
      }
    } finally {
      setBusy(false)
    }
  }

  function handleProjectChange(p: Project): void {
    setProject(p)
    if (selection?.kind === 'scene') {
      const stillExists = p.chapters.some((c) => c.scenes.some((s) => s.id === selection.id))
      if (!stillExists) setSelection(null)
    }
  }

  const currentScene =
    selection?.kind === 'scene'
      ? (project?.chapters.flatMap((c) => c.scenes).find((s) => s.id === selection.id) ?? null)
      : null

  if (!project) {
    return (
      <div className="welcome">
        <h1>wrighting</h1>
        <p className="tagline">AI 웹소설 설계 · 집필 워크스페이스</p>
        <div className="actions">
          <button disabled={busy} onClick={handleCreate}>
            새 프로젝트 만들기
          </button>
          <button disabled={busy} onClick={handleOpen}>
            프로젝트 열기
          </button>
        </div>
      </div>
    )
  }

  if (view === 'graph') {
    return (
      <GraphView
        dir={project.dir}
        project={project}
        onOpen={openFromGraph}
        onClose={() => setView('workspace')}
      />
    )
  }

  return (
    <div className="workspace">
      <Binder
        project={project}
        selection={selection}
        onSelect={setSelection}
        onProjectChange={handleProjectChange}
        onOpenGraph={() => setView('graph')}
      />
      <main className="editor-pane">
        {selection?.kind === 'scene' && currentScene && (
          <>
            <SceneMeta
              key={`meta-${currentScene.id}`}
              dir={project.dir}
              scene={currentScene}
              onSaved={setProject}
            />
            <Connections
              dir={project.dir}
              file={selection.file}
              project={project}
              onChange={setProject}
              onOpen={setSelection}
            />
            <SceneEditor
              key={selection.file}
              dir={project.dir}
              file={selection.file}
              title={selection.title}
              onProvideInsert={provideInsert}
            />
          </>
        )}
        {selection?.kind === 'doc' && (
          <>
            <Connections
              dir={project.dir}
              file={selection.file}
              project={project}
              onChange={setProject}
              onOpen={setSelection}
            />
            {selection.file.startsWith('bible/characters/') ? (
              <SheetEditor
                key={selection.file}
                dir={project.dir}
                file={selection.file}
                title={selection.title}
              />
            ) : (
              <DocEditor
                key={selection.file}
                dir={project.dir}
                file={selection.file}
                title={selection.title}
              />
            )}
          </>
        )}
        {!selection && (
          <div className="placeholder">
            <h2>{project.title}</h2>
            <p>왼쪽에서 씬이나 자료(세계관·인물·플롯·메모리)를 선택해 시작하세요.</p>
          </div>
        )}
      </main>
      <AiPanel
        projectDir={project.dir}
        sceneFile={selection?.kind === 'scene' ? selection.file : null}
        onInsert={selection?.kind === 'scene' ? handleInsert : null}
      />
    </div>
  )
}
