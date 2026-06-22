import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import type { RichDoc } from '@shared/types'
import {
  extractBlocks,
  piecesToMarkdown,
  piecesToPlainText,
  type ExportPiece
} from './blocks'
import { buildEpubBlob } from './epub'
import { buildHwpxBlob } from './hwpx'

export type ExportFormat = 'docx' | 'epub' | 'md' | 'txt' | 'hwp'

const EXT: Record<ExportFormat, string> = {
  docx: 'docx',
  epub: 'epub',
  md: 'md',
  txt: 'txt',
  hwp: 'hwpx'
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || '문서'
}

async function piecesToDocxBlob(pieces: ExportPiece[]): Promise<Blob> {
  const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3
  }
  const paragraphs: Paragraph[] = []
  pieces.forEach((piece, idx) => {
    if (idx > 0) paragraphs.push(new Paragraph({ children: [], pageBreakBefore: true }))
    paragraphs.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(piece.title)] }))
    for (const b of piece.blocks) {
      paragraphs.push(
        b.heading
          ? new Paragraph({ heading: headingMap[b.heading] ?? HeadingLevel.HEADING_3, children: [new TextRun(b.text)] })
          : new Paragraph({ children: [new TextRun(b.text)] })
      )
    }
  })
  const docx = new Document({ sections: [{ children: paragraphs }] })
  return Packer.toBlob(docx)
}

/** 여러 문서(회차)를 하나의 파일로 묶어 내보낸다. */
export async function exportPieces(
  name: string,
  pieces: ExportPiece[],
  format: ExportFormat
): Promise<void> {
  const file = `${safeName(name)}.${EXT[format]}`
  switch (format) {
    case 'txt':
      saveAs(new Blob([piecesToPlainText(pieces)], { type: 'text/plain;charset=utf-8' }), file)
      return
    case 'md':
      saveAs(new Blob([piecesToMarkdown(pieces)], { type: 'text/markdown;charset=utf-8' }), file)
      return
    case 'docx':
      saveAs(await piecesToDocxBlob(pieces), file)
      return
    case 'epub':
      saveAs(await buildEpubBlob(name, pieces), file)
      return
    case 'hwp':
      saveAs(await buildHwpxBlob(name, pieces), file)
      return
  }
}

/** 단일 문서를 지정 형식으로 내보내 다운로드한다. */
export async function exportDocument(
  title: string,
  doc: RichDoc,
  format: ExportFormat
): Promise<void> {
  return exportPieces(title, [{ title, blocks: extractBlocks(doc) }], format)
}
