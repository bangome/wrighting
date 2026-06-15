import { promises as fs } from 'fs'
import { basename } from 'path'
import { type IpcMain, type Dialog } from 'electron'
import { IPC } from '@shared/ipc'
import type { CorpusInfo } from '@shared/types'
import { addDocument, getInfo } from './index'

export function registerCorpusHandlers(ipc: IpcMain, dialog: Dialog): void {
  ipc.handle(IPC.CorpusImport, async (_e, dir: string): Promise<CorpusInfo> => {
    const res = await dialog.showOpenDialog({
      title: '레퍼런스 추가 (txt/md)',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '텍스트', extensions: ['txt', 'md'] }]
    })
    if (res.canceled) return getInfo(dir)

    let last = await getInfo(dir)
    for (const fp of res.filePaths) {
      const text = await fs.readFile(fp, 'utf-8')
      last = await addDocument(dir, basename(fp), text)
    }
    return last
  })

  ipc.handle(IPC.CorpusInfo, async (_e, dir: string): Promise<CorpusInfo> => getInfo(dir))
}
