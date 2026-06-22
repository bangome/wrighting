import { create } from 'zustand'

export type Theme = 'dark' | 'light' | 'system'

/** 우측 분할 패널에 표시할 내용 */
export type RightPane =
  | { type: 'none' }
  | { type: 'graph' }
  | { type: 'item'; itemId: string }

interface UiState {
  theme: Theme
  setTheme: (t: Theme) => void
  /** 열려 있는 문서 탭(아이템 id, 연 순서) */
  tabs: string[]
  openTab: (itemId: string) => void
  closeTab: (itemId: string) => void
  /** 우측 분할 패널 */
  rightPane: RightPane
  setRightPane: (p: RightPane) => void
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
  tabs: [],
  openTab: (itemId) =>
    set((s) => (s.tabs.includes(itemId) ? s : { tabs: [...s.tabs, itemId] })),
  closeTab: (itemId) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t !== itemId)
      // 우측 패널이 닫은 항목을 보고 있었다면 패널도 정리
      const rightPane =
        s.rightPane.type === 'item' && s.rightPane.itemId === itemId
          ? ({ type: 'none' } as RightPane)
          : s.rightPane
      return { tabs, rightPane }
    }),
  rightPane: { type: 'none' },
  setRightPane: (p) => set({ rightPane: p }),
  paletteOpen: false,
  setPaletteOpen: (v) => set({ paletteOpen: v })
}))
