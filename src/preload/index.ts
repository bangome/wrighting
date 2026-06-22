import { contextBridge, ipcRenderer } from 'electron'
import type { HarnessBundle } from '../shared/types'

/**
 * 데스크톱 브리지. 웹에서는 window.wrighting 이 undefined 이고, Electron에서만 존재한다.
 * harness.* 는 Claude Code 하네스(.claude/agents·skills) 파일 입출력 — 데스크톱 전용.
 */
const desktop = {
  platform: process.platform,
  version: process.versions.electron,
  harness: {
    /** 작품 폴더 선택 다이얼로그. 취소 시 null */
    pickDir: (): Promise<string | null> => ipcRenderer.invoke('harness:pickDir'),
    /** <dir>/.claude 에서 에이전트·스킬을 읽어 묶음으로 반환 */
    read: (dir: string): Promise<HarnessBundle> => ipcRenderer.invoke('harness:read', dir),
    /** 묶음을 <dir>/.claude 에 .md 파일로 기록 */
    write: (dir: string, bundle: HarnessBundle): Promise<{ agents: number; skills: number }> =>
      ipcRenderer.invoke('harness:write', dir, bundle)
  }
}

contextBridge.exposeInMainWorld('wrighting', desktop)

export type WrightingDesktop = typeof desktop
