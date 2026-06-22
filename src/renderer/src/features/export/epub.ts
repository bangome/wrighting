import JSZip from 'jszip'
import { escapeXml, type ExportPiece } from './blocks'

/** 블록들을 XHTML 본문으로 변환 */
function pieceToXhtml(piece: ExportPiece): string {
  const body = piece.blocks
    .map((b) => {
      const t = escapeXml(b.text) || '&#160;'
      return b.heading ? `<h${b.heading}>${t}</h${b.heading}>` : `<p>${t}</p>`
    })
    .join('\n    ')
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ko" lang="ko">
  <head>
    <meta charset="UTF-8"/>
    <title>${escapeXml(piece.title)}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
  </head>
  <body>
    <h1 class="chapter-title">${escapeXml(piece.title)}</h1>
    ${body}
  </body>
</html>`
}

const STYLE = `body { font-family: serif; line-height: 1.8; margin: 5%; }
h1.chapter-title { font-size: 1.4em; margin: 1em 0 1.5em; text-align: center; }
p { margin: 0 0 0.9em; text-indent: 1em; }`

/**
 * EPUB 3 패키지를 생성한다. 각 piece가 하나의 장(chapter)이 된다.
 * mimetype은 압축하지 않고 가장 먼저 저장해야 한다(EPUB 규격).
 */
export async function buildEpubBlob(bookTitle: string, pieces: ExportPiece[]): Promise<Blob> {
  const zip = new JSZip()
  const uid = `urn:uuid:${crypto.randomUUID()}`

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  )

  const oebps = zip.folder('OEBPS')!
  oebps.file('style.css', STYLE)

  const chapters = pieces.map((p, i) => ({ id: `chap${i + 1}`, file: `chap${i + 1}.xhtml`, piece: p }))
  for (const c of chapters) oebps.file(c.file, pieceToXhtml(c.piece))

  const manifestItems = chapters
    .map((c) => `<item id="${c.id}" href="${c.file}" media-type="application/xhtml+xml"/>`)
    .join('\n    ')
  const spineItems = chapters.map((c) => `<itemref idref="${c.id}"/>`).join('\n    ')

  oebps.file(
    'content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${uid}</dc:identifier>
    <dc:title>${escapeXml(bookTitle)}</dc:title>
    <dc:language>ko</dc:language>
    <meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="style.css" media-type="text/css"/>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`
  )

  const navList = chapters
    .map((c) => `<li><a href="${c.file}">${escapeXml(c.piece.title)}</a></li>`)
    .join('\n      ')
  oebps.file(
    'nav.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko" lang="ko">
  <head><meta charset="UTF-8"/><title>목차</title></head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>목차</h1>
      <ol>
      ${navList}
      </ol>
    </nav>
  </body>
</html>`
  )

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
}
