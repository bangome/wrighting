import { contextBridge } from 'electron'

/**
 * 최소 데스크톱 브리지. 웹에서는 window.wrighting 이 undefined 이고,
 * Electron에서만 존재한다(플랫폼 분기·데스크톱 전용 UI 판단에 사용).
 */
const desktop = {
  platform: process.platform,
  version: process.versions.electron
}

contextBridge.exposeInMainWorld('wrighting', desktop)

export type WrightingDesktop = typeof desktop
