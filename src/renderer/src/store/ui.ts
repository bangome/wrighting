import { create } from 'zustand'

export type Theme = 'dark' | 'light' | 'system'

/** 우측/하단 보조 패널에 표시할 내용 */
export type RightPane =
  | { type: 'none' }
  | { type: 'graph' }
  | { type: 'memo' }
  | { type: 'split' }

/** 분할 패널 방향 */
export type SplitDir = 'right' | 'bottom'

/** 탭이 속한 창 */
export type Pane = 'main' | 'split'

/** 관계 그래프 노드 분류 필터 카테고리 */
export type GraphCategory =
  | 'document'
  | 'sheet'
  | 'plotboard'
  | 'folder'
  | 'plot-card'
  | 'plot-part-card'

/** 필터 메뉴 표시 순서·라벨 */
export const GRAPH_CATEGORIES: { key: GraphCategory; label: string }[] = [
  { key: 'document', label: '문서' },
  { key: 'sheet', label: '시트' },
  { key: 'plotboard', label: '플롯보드' },
  { key: 'folder', label: '폴더' },
  { key: 'plot-card', label: '플롯 카드' },
  { key: 'plot-part-card', label: '플롯 파트 카드' }
]

interface UiState {
  theme: Theme
  setTheme: (t: Theme) => void
  /** 열려 있는 문서 탭(아이템 id, 연 순서) */
  tabs: string[]
  openTab: (itemId: string) => void
  closeTab: (itemId: string) => void
  /** 보조 패널(그래프·메모·분할) */
  rightPane: RightPane
  setRightPane: (p: RightPane) => void
  /** 분할 편집 창 — 자체 탭 + 본문 */
  splitDir: SplitDir
  /** 주 창이 차지하는 비율 (0.2~0.8). 기본 0.5(50:50) */
  splitRatio: number
  setSplitRatio: (r: number) => void
  splitTabs: string[]
  splitActive: string | null
  /** 현재 항목을 분할 창으로 띄운다 */
  openSplit: (itemId: string, dir: SplitDir) => void
  closeSplit: () => void
  setSplitDir: (dir: SplitDir) => void
  setSplitActive: (itemId: string) => void
  openSplitTab: (itemId: string) => void
  closeSplitTab: (itemId: string) => void
  /** 탭 드래그앤드롭 이동 — pane 내 재정렬 또는 pane 간 이동.
   * beforeId가 가리키는 탭 앞에 삽입(null이면 맨 끝). */
  moveTab: (dragId: string, fromPane: Pane, toPane: Pane, beforeId: string | null) => void
  /** 커맨드 팔레트 */
  paletteOpen: boolean
  setPaletteOpen: (v: boolean) => void
  /** 관계 그래프 분류 필터 — 카테고리별 표시 여부 */
  graphFilter: Record<GraphCategory, boolean>
  toggleGraphCategory: (cat: GraphCategory) => void
  setAllGraphCategories: (on: boolean) => void
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
  closeTab: (itemId) => set((s) => ({ tabs: s.tabs.filter((t) => t !== itemId) })),
  rightPane: { type: 'none' },
  setRightPane: (p) => set({ rightPane: p }),

  splitDir: 'right',
  splitRatio: 0.5,
  setSplitRatio: (r) => set({ splitRatio: Math.min(0.8, Math.max(0.2, r)) }),
  splitTabs: [],
  splitActive: null,
  openSplit: (itemId, dir) =>
    set((s) => ({
      rightPane: { type: 'split' },
      splitDir: dir,
      splitRatio: 0.5,
      splitTabs: s.splitTabs.includes(itemId) ? s.splitTabs : [...s.splitTabs, itemId],
      splitActive: itemId
    })),
  closeSplit: () => set({ rightPane: { type: 'none' }, splitTabs: [], splitActive: null }),
  setSplitDir: (dir) => set({ splitDir: dir }),
  setSplitActive: (itemId) => set({ splitActive: itemId }),
  openSplitTab: (itemId) =>
    set((s) => ({
      splitTabs: s.splitTabs.includes(itemId) ? s.splitTabs : [...s.splitTabs, itemId],
      splitActive: itemId
    })),
  closeSplitTab: (itemId) =>
    set((s) => {
      const idx = s.splitTabs.indexOf(itemId)
      const tabs = s.splitTabs.filter((t) => t !== itemId)
      if (tabs.length === 0) {
        return { splitTabs: [], splitActive: null, rightPane: { type: 'none' } }
      }
      const nextActive =
        s.splitActive === itemId ? (tabs[idx] ?? tabs[idx - 1] ?? tabs[0]) : s.splitActive
      return { splitTabs: tabs, splitActive: nextActive }
    }),

  moveTab: (dragId, fromPane, toPane, beforeId) =>
    set((s) => {
      if (dragId === beforeId) return {}

      // 같은 창 내 재정렬
      if (fromPane === toPane) {
        const key = fromPane === 'main' ? 'tabs' : 'splitTabs'
        const arr = [...s[key]]
        const from = arr.indexOf(dragId)
        if (from < 0) return {}
        arr.splice(from, 1)
        let at = beforeId ? arr.indexOf(beforeId) : arr.length
        if (at < 0) at = arr.length
        arr.splice(at, 0, dragId)
        return { [key]: arr } as Partial<UiState>
      }

      // 창 간 이동
      const fromTabs = (fromPane === 'main' ? s.tabs : s.splitTabs).filter((t) => t !== dragId)
      const toTabs = [...(toPane === 'main' ? s.tabs : s.splitTabs)].filter((t) => t !== dragId)
      let at = beforeId ? toTabs.indexOf(beforeId) : toTabs.length
      if (at < 0) at = toTabs.length
      toTabs.splice(at, 0, dragId)

      const patch: Partial<UiState> = {}
      if (fromPane === 'main') patch.tabs = fromTabs
      else patch.splitTabs = fromTabs
      if (toPane === 'main') patch.tabs = toTabs
      else patch.splitTabs = toTabs

      // 분할 창으로 들어오면 그 탭을 활성화
      if (toPane === 'split') patch.splitActive = dragId
      // 분할 창에서 활성 탭이 빠져나가면 활성 탭 갱신
      if (fromPane === 'split' && s.splitActive === dragId) {
        patch.splitActive = fromTabs[0] ?? null
      }
      // 분할 창이 비면 분할 닫기
      if (fromPane === 'split' && fromTabs.length === 0) {
        patch.rightPane = { type: 'none' }
        patch.splitTabs = []
        patch.splitActive = null
      }
      return patch
    }),
  paletteOpen: false,
  setPaletteOpen: (v) => set({ paletteOpen: v }),
  graphFilter: {
    document: true,
    sheet: true,
    plotboard: true,
    folder: true,
    'plot-card': true,
    'plot-part-card': true
  },
  toggleGraphCategory: (cat) =>
    set((s) => ({ graphFilter: { ...s.graphFilter, [cat]: !s.graphFilter[cat] } })),
  setAllGraphCategories: (on) =>
    set((s) => {
      const next = { ...s.graphFilter }
      for (const k of Object.keys(next) as GraphCategory[]) next[k] = on
      return { graphFilter: next }
    })
}))
