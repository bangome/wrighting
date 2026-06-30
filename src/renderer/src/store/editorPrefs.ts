import { create } from 'zustand'
import type { CharacterCountMode } from '../lib/count'

/** 본문 글꼴 선택지 (한글 집필 기준) */
export const FONT_FAMILIES: { value: string; label: string; stack: string }[] = [
  { value: 'sans', label: '고딕', stack: 'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' },
  { value: 'serif', label: '명조', stack: '"Nanum Myeongjo", "Apple Myungjo", "Batang", serif' },
  { value: 'mono', label: '고정폭', stack: '"D2Coding", "Nanum Gothic Coding", monospace' }
]

export const LINE_HEIGHTS: { value: number; label: string }[] = [
  { value: 1.5, label: '좁게' },
  { value: 1.8, label: '보통' },
  { value: 2.2, label: '넓게' }
]

/** 연재 플랫폼 프리셋 — 회차 분량 목표(공백 제외 글자 수) */
export const PLATFORMS: { value: string; label: string; goal: number }[] = [
  { value: 'none', label: '없음', goal: 0 },
  { value: 'munpia', label: '문피아', goal: 5500 },
  { value: 'naver', label: '네이버 시리즈', goal: 5500 },
  { value: 'kakao', label: '카카오페이지', goal: 5000 },
  { value: 'ridi', label: '리디', goal: 5000 }
]

/** 플랫폼 value → 회차 목표 글자수(공백 제외). 0이면 목표 없음. */
export function platformGoal(value: string): number {
  return PLATFORMS.find((p) => p.value === value)?.goal ?? 0
}

/** 기기-로컬 에디터 설정 (localStorage). 스크린샷 e19a18. */
interface EditorPrefs {
  fontScale: number // 0.85 ~ 1.5
  focusMode: boolean
  spellcheck: boolean
  smartQuotes: boolean
  /** 본문 글꼴 (FONT_FAMILIES.value) */
  fontFamily: string
  /** 본문 줄간격 */
  lineHeight: number
  /** 연재 플랫폼 프리셋 (PLATFORMS.value) — 회차 분량 목표 */
  platform: string
  characterCountMode: CharacterCountMode
  set: (patch: Partial<Omit<EditorPrefs, 'set'>>) => void
}

const KEY = 'wrighting.editorPrefs'

type Stored = Omit<EditorPrefs, 'set'>

const DEFAULTS: Stored = {
  fontScale: 1,
  focusMode: false,
  spellcheck: false,
  smartQuotes: true,
  fontFamily: 'sans',
  lineHeight: 1.8,
  platform: 'none',
  characterCountMode: 'without-space'
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULTS
}

/** 글꼴 value → CSS font stack */
export function fontStack(value: string): string {
  return FONT_FAMILIES.find((f) => f.value === value)?.stack ?? FONT_FAMILIES[0].stack
}

export const useEditorPrefs = create<EditorPrefs>((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch)
    const {
      fontScale,
      focusMode,
      spellcheck,
      smartQuotes,
      fontFamily,
      lineHeight,
      platform,
      characterCountMode
    } = get()
    localStorage.setItem(
      KEY,
      JSON.stringify({
        fontScale,
        focusMode,
        spellcheck,
        smartQuotes,
        fontFamily,
        lineHeight,
        platform,
        characterCountMode
      })
    )
  }
}))
