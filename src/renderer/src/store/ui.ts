import { create } from 'zustand'

export type Theme = 'dark' | 'light' | 'system'

interface UiState {
  theme: Theme
  setTheme: (t: Theme) => void
  /** 워크스페이스 우측 패널(그래프 등) 표시 여부 */
  rightPanel: 'none' | 'graph'
  setRightPanel: (p: 'none' | 'graph') => void
  /** 커맨드 팔레트 */
  paletteOpen: boolean
  setPaletteOpen: (v: boolean) => void
}

const STORAGE_KEY = 'wrighting.theme'

function readTheme(): Theme {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'dark'
}

/** [data-theme] 속성을 실제 적용 (system이면 매체 쿼리 추종) */
export function applyTheme(theme: Theme): void {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : theme
  document.documentElement.setAttribute('data-theme', resolved)
}

export const useUi = create<UiState>((set) => ({
  theme: readTheme(),
  setTheme: (t) => {
    localStorage.setItem(STORAGE_KEY, t)
    applyTheme(t)
    set({ theme: t })
  },
  rightPanel: 'none',
  setRightPanel: (p) => set({ rightPanel: p }),
  paletteOpen: false,
  setPaletteOpen: (v) => set({ paletteOpen: v })
}))
