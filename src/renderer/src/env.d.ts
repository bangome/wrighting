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

interface WrightingAiReviewPartCard {
  boardTitle: string
  columnTitle: string | null
  title: string
  body: string | null
  tags: readonly string[]
  mentionedTitles: readonly string[]
}

interface WrightingAiReviewRequest {
  documentTitle: string
  documentText: string
  format: 'webNovel' | 'genreNovel' | 'literaryNovel' | 'script'
  audience: 'platformEditor' | 'contestJudge' | 'coreReader' | 'lightReader'
  focus: readonly WrightingAiReviewFocusKey[]
  directness: number
  partCards: readonly WrightingAiReviewPartCard[]
  referenceDocuments: readonly string[]
  additionalGuidance: string
}

type WrightingAiReviewFocusKey =
  | 'story'
  | 'character'
  | 'pacing'
  | 'prose'
  | 'emotion'
  | 'marketability'
  | 'worldbuilding'

interface WrightingAiReviewSection {
  title: string
  body: string
  evidence: string[]
  suggestions: string[]
}

interface WrightingAiReviewResponse {
  overallScore: number
  scores: Array<{ key: WrightingAiReviewFocusKey; label: string; score: number; reason: string }>
  summary: string
  strengths: WrightingAiReviewSection[]
  risks: WrightingAiReviewSection[]
  revisionPlan: string[]
  audienceRead: string
  partCardNotes: string[]
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
  ai: {
    reviewDocument: (input: WrightingAiReviewRequest) => Promise<WrightingAiReviewResponse>
  }
}

interface Window {
  wrighting?: WrightingDesktop
}
