/**
 * Tiptap/ProseMirror 문서 JSON(RichDoc) ↔ 평문/마크다운 변환.
 * MCP는 Claude에 평문을 주고, 받은 텍스트를 최소 구조의 RichDoc로 저장한다.
 */

export type RichDoc = { type: 'doc'; content?: unknown[] } | null

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'listItem',
  'codeBlock',
  'tableRow'
])

/** RichDoc → 평문. 블록 단위로 줄을 나눈다. */
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
  return out.replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * 평문/간이 마크다운 → RichDoc. 각 줄을 문단으로,
 * `#`/`##`/`###` 로 시작하는 줄은 heading 으로 변환(웹소설 본문에 적합한 최소 구조).
 */
export function textToRichDoc(text: string): RichDoc {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const content: unknown[] = []
  for (const line of lines) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      content.push({
        type: 'heading',
        attrs: { level: h[1].length },
        content: h[2] ? [{ type: 'text', text: h[2] }] : []
      })
    } else if (line.trim() === '') {
      content.push({ type: 'paragraph' })
    } else {
      content.push({ type: 'paragraph', content: [{ type: 'text', text: line }] })
    }
  }
  if (content.length === 0) content.push({ type: 'paragraph' })
  return { type: 'doc', content }
}

/** 분량 집계 (공백 포함 글자수 / 단어수) */
export function counts(text: string): { char_count: number; word_count: number } {
  const trimmed = text.trim()
  return {
    char_count: text.length,
    word_count: trimmed ? trimmed.split(/\s+/).length : 0
  }
}
