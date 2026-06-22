/**
 * 본문을 임베딩용 청크로 분할. 문단 경계를 우선 존중하고,
 * 목표 길이를 넘으면 잘라내며 약간의 오버랩으로 문맥을 보존한다.
 */

const TARGET = 1200 // 청크당 목표 글자수
const OVERLAP = 150 // 청크 간 겹침 글자수

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim()
  if (!clean) return []
  if (clean.length <= TARGET) return [clean]

  const paras = clean.split(/\n{2,}/)
  const chunks: string[] = []
  let buf = ''
  const flush = (): void => {
    const t = buf.trim()
    if (t) chunks.push(t)
    // 오버랩: 직전 청크 끝부분을 다음 버퍼 시작으로
    buf = t.length > OVERLAP ? t.slice(-OVERLAP) : ''
  }

  for (const para of paras) {
    if (para.length > TARGET) {
      // 큰 문단은 문장 단위로 추가 분할
      const sentences = para.split(/(?<=[.!?。！？])\s+/)
      for (const s of sentences) {
        if (buf.length + s.length > TARGET) flush()
        buf += (buf ? ' ' : '') + s
      }
    } else {
      if (buf.length + para.length > TARGET) flush()
      buf += (buf ? '\n\n' : '') + para
    }
  }
  const last = buf.trim()
  if (last) chunks.push(last)
  return chunks
}

export function tokenEstimate(text: string): number {
  return Math.ceil(text.length / 4)
}
