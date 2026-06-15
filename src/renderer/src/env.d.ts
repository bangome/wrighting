/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Electron preload가 노출하는 최소 데스크톱 브리지(웹에서는 undefined) */
interface WrightingDesktop {
  platform: string
  version: string
}

interface Window {
  wrighting?: WrightingDesktop
}
