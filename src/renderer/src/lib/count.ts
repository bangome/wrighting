export interface TextCount {
  chars: number
  charsNoSpace: number
  words: number
}

/** 텍스트 분량 계산. 웹소설 분량 기준은 보통 '공백 제외 글자 수'. */
export function countText(text: string): TextCount {
  const trimmed = text.trim()
  return {
    chars: text.length,
    charsNoSpace: text.replace(/\s/g, '').length,
    words: trimmed ? trimmed.split(/\s+/).length : 0
  }
}

export function formatCount(c: TextCount): string {
  return `${c.chars.toLocaleString()}자 · 공백제외 ${c.charsNoSpace.toLocaleString()} · ${c.words.toLocaleString()}단어`
}
