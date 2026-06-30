export interface TextCount {
  chars: number
  charsNoSpace: number
  words: number
}

export type CharacterCountMode = 'with-space' | 'without-space'

/** 텍스트 분량 계산. 웹소설 분량 기준은 보통 '공백 제외 글자 수'. */
export function countText(text: string): TextCount {
  const trimmed = text.trim()
  return {
    chars: text.length,
    charsNoSpace: text.replace(/\s/g, '').length,
    words: trimmed ? trimmed.split(/\s+/).length : 0
  }
}

export function characterCountForMode(count: TextCount, mode: CharacterCountMode): number {
  return mode === 'with-space' ? count.chars : count.charsNoSpace
}

export function characterCountModeLabel(mode: CharacterCountMode): string {
  return mode === 'with-space' ? '공백 포함' : '공백 제외'
}

export function formatCount(c: TextCount): string {
  return `${c.chars.toLocaleString()}자 · 공백제외 ${c.charsNoSpace.toLocaleString()} · ${c.words.toLocaleString()}단어`
}
