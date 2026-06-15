import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import type { RichDoc } from '@shared/types'

export type ExportFormat = 'docx' | 'epub' | 'md' | 'txt' | 'hwp'

/** ProseMirror JSON에서 블록(문단/제목) 단위 평문 추출 */
interface Block {
  text: string
  heading: number // 0=문단
}

function extractBlocks(doc: RichDoc): Block[] {
  const blocks: Block[] = []
  const content = (doc as { content?: unknown[] } | null)?.content
  if (!Array.isArray(content)) return blocks
  for (const node of content as Array<Record<string, unknown>>) {
    const type = node.type as string
    const inline = (node.content as Array<{ text?: string }> | undefined) ?? []
    const text = inline.map((n) => n.text ?? '').join('')
    if (type === 'heading') blocks.push({ text, heading: (node.attrs as { level?: number })?.level ?? 1 })
    else blocks.push({ text, heading: 0 })
  }
  return blocks
}

function toPlainText(title: string, doc: RichDoc): string {
  const body = extractBlocks(doc)
    .map((b) => b.text)
    .join('\n\n')
  return `${title}\n\n${body}\n`
}

function toMarkdown(title: string, doc: RichDoc): string {
  const body = extractBlocks(doc)
    .map((b) => (b.heading ? `${'#'.repeat(b.heading + 1)} ${b.text}` : b.text))
    .join('\n\n')
  return `# ${title}\n\n${body}\n`
}

async function toDocxBlob(title: string, doc: RichDoc): Promise<Blob> {
  const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3
  }
  const paragraphs = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(title)] }),
    ...extractBlocks(doc).map((b) =>
      b.heading
        ? new Paragraph({ heading: headingMap[b.heading] ?? HeadingLevel.HEADING_3, children: [new TextRun(b.text)] })
        : new Paragraph({ children: [new TextRun(b.text)] })
    )
  ]
  const docx = new Document({ sections: [{ children: paragraphs }] })
  return Packer.toBlob(docx)
}

/** 문서를 지정 형식으로 내보내 다운로드한다. */
export async function exportDocument(
  title: string,
  doc: RichDoc,
  format: ExportFormat
): Promise<void> {
  const safe = title.replace(/[\\/:*?"<>|]/g, '_') || '문서'
  switch (format) {
    case 'txt':
      saveAs(new Blob([toPlainText(title, doc)], { type: 'text/plain;charset=utf-8' }), `${safe}.txt`)
      return
    case 'md':
      saveAs(new Blob([toMarkdown(title, doc)], { type: 'text/markdown;charset=utf-8' }), `${safe}.md`)
      return
    case 'docx':
      saveAs(await toDocxBlob(title, doc), `${safe}.docx`)
      return
    case 'epub':
    case 'hwp':
      // 후속 단계: epub은 브라우저 lib/Edge Function, hwp(hwpx)는 별도 생성기
      alert(`${format.toUpperCase()} 내보내기는 다음 단계에서 제공됩니다.`)
      return
  }
}
