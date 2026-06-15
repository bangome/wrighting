/** IPC 채널 이름 — main / preload 가 공유 */
export const IPC = {
  ProjectCreate: 'project:create',
  ProjectOpen: 'project:open',
  ProjectLoad: 'project:load',
  ChapterAdd: 'chapter:add',
  SceneAdd: 'scene:add',
  SceneRead: 'scene:read',
  SceneWrite: 'scene:write',
  SceneMetaUpdate: 'scene:meta-update',
  BibleList: 'bible:list',
  CharacterAdd: 'character:add',
  SheetRead: 'sheet:read',
  SheetWrite: 'sheet:write',
  ConnectionAdd: 'connection:add',
  ConnectionRemove: 'connection:remove',
  ManuscriptExport: 'manuscript:export',
  CorpusImport: 'corpus:import',
  CorpusInfo: 'corpus:info',
  AiStart: 'ai:start',
  AiEvent: 'ai:event'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
