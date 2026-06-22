import type { RichDoc } from '@shared/types'

/** 한 줄(블록)을 만드는 노드 타입 — 텍스트 추출 시 줄바꿈 경계로 사용 */
const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'listItem',
  'codeBlock',
  'tableRow'
])

/** RichDoc(JSON)을 비교용 평문 텍스트로 변환한다. 블록 단위로 줄을 나눈다. */
export function richDocToText(doc: RichDoc | unknown): string {
  let out = ''
  const walk = (node: Record<string, unknown> | undefined): void => {
    if (!node) return
    if (typeof node.text === 'string') out += node.text
    if (node.type === 'mention') {
      const attrs = node.attrs as { label?: string; id?: string } | undefined
      out += '@' + (attrs?.label ?? attrs?.id ?? '')
    }
    const content = node.content as Array<Record<string, unknown>> | undefined
    if (Array.isArray(content)) content.forEach(walk)
    if (typeof node.type === 'string' && BLOCK_TYPES.has(node.type)) out += '\n'
  }
  walk((doc as Record<string, unknown> | null) ?? undefined)
  return out.replace(/\n{3,}/g, '\n\n').trimEnd()
}

export type DiffOp = 'eq' | 'add' | 'del'
export interface DiffLine {
  type: DiffOp
  text: string
}

/**
 * 두 평문 텍스트를 줄 단위로 비교한다. LCS 기반 diff.
 * `del`은 이전(좌측) 버전에만, `add`는 이후(우측) 버전에만 있는 줄.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.length ? oldText.split('\n') : []
  const b = newText.length ? newText.split('\n') : []
  const n = a.length
  const m = b.length

  // LCS 길이 DP (뒤에서부터 채움)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const res: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      res.push({ type: 'eq', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      res.push({ type: 'del', text: a[i] })
      i++
    } else {
      res.push({ type: 'add', text: b[j] })
      j++
    }
  }
  while (i < n) res.push({ type: 'del', text: a[i++] })
  while (j < m) res.push({ type: 'add', text: b[j++] })
  return res
}

/** 변경 통계 (추가/삭제 줄 수) */
export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const l of lines) {
    if (l.type === 'add') added++
    else if (l.type === 'del') removed++
  }
  return { added, removed }
}
