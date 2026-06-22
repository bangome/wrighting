import type { RichDoc } from '@shared/types'

/** ProseMirror 문서에서 추출한 블록 (문단/제목) */
export interface Block {
  text: string
  heading: number // 0=문단, 1~3=제목 레벨
}

/** 내보내기 1건: 제목 + 본문 블록 */
export interface ExportPiece {
  title: string
  blocks: Block[]
}

/** ProseMirror JSON → 블록 목록 (문단/제목/표 행을 평문화) */
export function extractBlocks(doc: RichDoc): Block[] {
  const blocks: Block[] = []
  const content = (doc as { content?: unknown[] } | null)?.content
  if (!Array.isArray(content)) return blocks

  const inlineText = (node: Record<string, unknown>): string => {
    const inline = (node.content as Array<{ text?: string }> | undefined) ?? []
    return inline.map((n) => n.text ?? '').join('')
  }

  for (const node of content as Array<Record<string, unknown>>) {
    const type = node.type as string
    if (type === 'heading') {
      blocks.push({ text: inlineText(node), heading: (node.attrs as { level?: number })?.level ?? 1 })
    } else if (type === 'table') {
      // 표는 행 단위로 셀 텍스트를 ' | ' 로 이어 평문화
      const rows = (node.content as Array<Record<string, unknown>> | undefined) ?? []
      for (const row of rows) {
        const cells = (row.content as Array<Record<string, unknown>> | undefined) ?? []
        const line = cells
          .map((cell) => {
            const paras = (cell.content as Array<Record<string, unknown>> | undefined) ?? []
            return paras.map(inlineText).join(' ')
          })
          .join(' | ')
        blocks.push({ text: line, heading: 0 })
      }
    } else {
      blocks.push({ text: inlineText(node), heading: 0 })
    }
  }
  return blocks
}

export function piecesToPlainText(pieces: ExportPiece[]): string {
  return pieces
    .map((p) => `${p.title}\n\n${p.blocks.map((b) => b.text).join('\n\n')}\n`)
    .join('\n\n────────\n\n')
}

export function piecesToMarkdown(pieces: ExportPiece[]): string {
  return pieces
    .map(
      (p) =>
        `# ${p.title}\n\n` +
        p.blocks.map((b) => (b.heading ? `${'#'.repeat(b.heading + 1)} ${b.text}` : b.text)).join('\n\n')
    )
    .join('\n\n')
}

/** XML/XHTML 특수문자 이스케이프 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
