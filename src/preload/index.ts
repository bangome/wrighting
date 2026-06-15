import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '@shared/ipc'
import type {
  Project,
  AiStartRequest,
  AiEvent,
  BibleEntry,
  CorpusInfo,
  SceneMeta,
  SheetProfile,
  SheetData
} from '@shared/types'

const api = {
  createProject: (): Promise<Project | null> => ipcRenderer.invoke(IPC.ProjectCreate),
  openProject: (): Promise<Project | null> => ipcRenderer.invoke(IPC.ProjectOpen),
  loadProject: (dir: string): Promise<Project> => ipcRenderer.invoke(IPC.ProjectLoad, dir),
  addChapter: (dir: string, title: string): Promise<Project> =>
    ipcRenderer.invoke(IPC.ChapterAdd, dir, title),
  addScene: (dir: string, chapterId: string, title: string): Promise<Project> =>
    ipcRenderer.invoke(IPC.SceneAdd, dir, chapterId, title),
  readScene: (dir: string, file: string): Promise<string> =>
    ipcRenderer.invoke(IPC.SceneRead, dir, file),
  writeScene: (dir: string, file: string, content: string): Promise<void> =>
    ipcRenderer.invoke(IPC.SceneWrite, dir, file, content),
  updateSceneMeta: (dir: string, sceneId: string, meta: SceneMeta): Promise<Project> =>
    ipcRenderer.invoke(IPC.SceneMetaUpdate, dir, sceneId, meta),
  listBible: (dir: string): Promise<BibleEntry[]> => ipcRenderer.invoke(IPC.BibleList, dir),
  addCharacter: (dir: string, name: string): Promise<BibleEntry[]> =>
    ipcRenderer.invoke(IPC.CharacterAdd, dir, name),
  addConnection: (dir: string, from: string, to: string, label?: string): Promise<Project> =>
    ipcRenderer.invoke(IPC.ConnectionAdd, dir, from, to, label),
  removeConnection: (dir: string, id: string): Promise<Project> =>
    ipcRenderer.invoke(IPC.ConnectionRemove, dir, id),
  exportManuscript: (dir: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.ManuscriptExport, dir),
  readSheet: (dir: string, file: string): Promise<SheetData> =>
    ipcRenderer.invoke(IPC.SheetRead, dir, file),
  writeSheet: (dir: string, file: string, profile: SheetProfile, body: string): Promise<void> =>
    ipcRenderer.invoke(IPC.SheetWrite, dir, file, profile, body),
  corpusImport: (dir: string): Promise<CorpusInfo> => ipcRenderer.invoke(IPC.CorpusImport, dir),
  corpusInfo: (dir: string): Promise<CorpusInfo> => ipcRenderer.invoke(IPC.CorpusInfo, dir),
  startAi: (req: AiStartRequest): Promise<string> => ipcRenderer.invoke(IPC.AiStart, req),
  onAiEvent: (cb: (e: AiEvent) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: AiEvent): void => cb(payload)
    ipcRenderer.on(IPC.AiEvent, listener)
    return () => ipcRenderer.removeListener(IPC.AiEvent, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
