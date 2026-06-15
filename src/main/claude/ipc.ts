import { type IpcMain } from 'electron'
import { randomUUID } from 'crypto'
import { IPC } from '@shared/ipc'
import type { AiStartRequest, AiEvent } from '@shared/types'
import { runAgent } from './agent'

export function registerAiHandlers(ipc: IpcMain): void {
  ipc.handle(IPC.AiStart, async (event, req: AiStartRequest): Promise<string> => {
    const requestId = randomUUID()
    const send = (payload: AiEvent): void => {
      if (!event.sender.isDestroyed()) event.sender.send(IPC.AiEvent, payload)
    }

    // 스트리밍은 비동기로 진행하고 requestId 를 즉시 반환한다.
    void runAgent(
      {
        projectDir: req.projectDir,
        role: req.role,
        prompt: req.prompt,
        sceneFile: req.sceneFile,
        useCorpus: req.useCorpus,
        model: req.model
      },
      {
        onChunk: (text) => send({ requestId, kind: 'chunk', text }),
        onDone: () => send({ requestId, kind: 'done' }),
        onError: (message) => send({ requestId, kind: 'error', message })
      }
    )

    return requestId
  })
}
