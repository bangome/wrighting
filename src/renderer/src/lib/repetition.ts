export interface RepeatEntry {
  word: string
  count: number
}

/** 분석에서 제외할 흔한 한국어 조사·연결어 (노이즈) */
const STOPWORDS = new Set([
  '그리고', '그러나', '하지만', '그래서', '그런데', '그러면', '그러니까',
  '나는', '내가', '너는', '그는', '그녀는', '우리는', '있다', '없다', '했다',
  '한다', '하는', '같은', '것이', '것은', '것을', '수가', '거의', '정말'
])

/**
 * 평문에서 2회 이상(기본) 반복되는 어절을 빈도순으로 집계한다.
 * 웹소설 퇴고에서 '반복 표현' 점검에 사용. 구두점은 제거하고 어절 단위로 센다.
 */
export function analyzeRepetition(text: string, minCount = 3, minLen = 2): RepeatEntry[] {
  const counts = new Map<string, number>()
  const tokens = text
    .replace(/[.,!?;:"'“”‘’()[\]{}…·~\-—/\\]/g, ' ')
    .split(/\s+/)
  for (const raw of tokens) {
    const w = raw.trim()
    if (w.length < minLen) continue
    if (STOPWORDS.has(w)) continue
    if (/^\d+$/.test(w)) continue
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= minCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
}
