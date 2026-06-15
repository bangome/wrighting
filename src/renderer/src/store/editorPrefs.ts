import { create } from 'zustand'

/** 기기-로컬 에디터 설정 (localStorage). 스크린샷 e19a18. */
interface EditorPrefs {
  fontScale: number // 0.85 ~ 1.5
  focusMode: boolean
  spellcheck: boolean
  smartQuotes: boolean
  set: (patch: Partial<Omit<EditorPrefs, 'set'>>) => void
}

const KEY = 'wrighting.editorPrefs'

function load(): Pick<EditorPrefs, 'fontScale' | 'focusMode' | 'spellcheck' | 'smartQuotes'> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { fontScale: 1, focusMode: false, spellcheck: false, smartQuotes: true, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { fontScale: 1, focusMode: false, spellcheck: false, smartQuotes: true }
}

export const useEditorPrefs = create<EditorPrefs>((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch)
    const { fontScale, focusMode, spellcheck, smartQuotes } = get()
    localStorage.setItem(KEY, JSON.stringify({ fontScale, focusMode, spellcheck, smartQuotes }))
  }
}))
