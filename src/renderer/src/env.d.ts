/// <reference types="vite/client" />
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

export interface Api {
  createProject: () => Promise<Project | null>
  openProject: () => Promise<Project | null>
  loadProject: (dir: string) => Promise<Project>
  addChapter: (dir: string, title: string) => Promise<Project>
  addScene: (dir: string, chapterId: string, title: string) => Promise<Project>
  readScene: (dir: string, file: string) => Promise<string>
  writeScene: (dir: string, file: string, content: string) => Promise<void>
  updateSceneMeta: (dir: string, sceneId: string, meta: SceneMeta) => Promise<Project>
  listBible: (dir: string) => Promise<BibleEntry[]>
  addCharacter: (dir: string, name: string) => Promise<BibleEntry[]>
  addConnection: (dir: string, from: string, to: string, label?: string) => Promise<Project>
  removeConnection: (dir: string, id: string) => Promise<Project>
  exportManuscript: (dir: string) => Promise<string | null>
  readSheet: (dir: string, file: string) => Promise<SheetData>
  writeSheet: (dir: string, file: string, profile: SheetProfile, body: string) => Promise<void>
  corpusImport: (dir: string) => Promise<CorpusInfo>
  corpusInfo: (dir: string) => Promise<CorpusInfo>
  startAi: (req: AiStartRequest) => Promise<string>
  onAiEvent: (cb: (e: AiEvent) => void) => () => void
}

declare global {
  interface Window {
    api: Api
  }
}
