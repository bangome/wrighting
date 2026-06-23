/// <reference types="vite/client" />

declare module 'cytoscape-cola' {
  const cola: (cytoscape: unknown) => void
  export default cola
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** preload 가 가져오기/내보내기로 주고받는 하네스 묶음 (shared/types 의 HarnessBundle 과 동일 구조) */
interface WrightingHarnessBundle {
  agents: { name: string; description: string; model: string | null; body: string }[]
  skills: { name: string; description: string; body: string }[]
  claudeMd: string | null
}

/** Electron preload가 노출하는 데스크톱 브리지(웹에서는 undefined) */
interface WrightingDesktop {
  platform: string
  version: string
  harness: {
    pickDir: () => Promise<string | null>
    read: (dir: string) => Promise<WrightingHarnessBundle>
    write: (
      dir: string,
      bundle: WrightingHarnessBundle
    ) => Promise<{ agents: number; skills: number }>
  }
}

interface Window {
  wrighting?: WrightingDesktop
}
