import JSZip from 'jszip'
import { escapeXml, type ExportPiece } from './blocks'

/**
 * HWPX(한글 오피스, OWPML) 최소 패키지 생성 — 문단/제목 텍스트 위주(베타).
 * 한컴오피스에서 열리는 것을 목표로 한 최소 스켈레톤이며, 서식은 단순화한다.
 * 참고: HWPX 개방형 문서 규격(OWPML 2011).
 */
const NS = {
  hh: 'http://www.hancom.co.kr/hwpml/2011/head',
  hp: 'http://www.hancom.co.kr/hwpml/2011/paragraph',
  hs: 'http://www.hancom.co.kr/hwpml/2011/section',
  hc: 'http://www.hancom.co.kr/hwpml/2011/core',
  hpf: 'http://www.hancom.co.kr/schema/2011/hpf',
  ocf: 'urn:oasis:names:tc:opendocument:xmlns:container',
  odf: 'urn:oasis:names:tc:opendocument:xmlns:manifest:1.0',
  hv: 'http://www.hancom.co.kr/hwpml/2011/version'
}

/** 본문 문단 XML — 제목은 굵게 한 줄, 문단은 일반 */
function paragraphsXml(pieces: ExportPiece[]): string {
  const out: string[] = []
  for (const piece of pieces) {
    out.push(
      `<hp:p paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="1"><hp:t>${escapeXml(piece.title)}</hp:t></hp:run></hp:p>`
    )
    for (const b of piece.blocks) {
      const charRef = b.heading ? '1' : '0'
      const text = escapeXml(b.text)
      out.push(
        `<hp:p paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="${charRef}"><hp:t>${text}</hp:t></hp:run></hp:p>`
      )
    }
  }
  return out.join('\n      ')
}

export async function buildHwpxBlob(bookTitle: string, pieces: ExportPiece[]): Promise<Blob> {
  const zip = new JSZip()

  zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE' })

  zip.file(
    'version.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hv:HCFVersion xmlns:hv="${NS.hv}" targetApplication="WORDPROCESSOR" major="5" minor="0" micro="5" buildNumber="0" os="1" xmlVersion="1.4" application="wrighting" appVersion="0.0.1"/>`
  )

  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ocf:container xmlns:ocf="${NS.ocf}">
  <ocf:rootfiles>
    <ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/>
  </ocf:rootfiles>
</ocf:container>`
  )

  zip.file(
    'META-INF/manifest.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<odf:manifest xmlns:odf="${NS.odf}" version="1.4">
  <odf:file-entry full-path="Contents/header.xml" media-type="application/xml"/>
  <odf:file-entry full-path="Contents/section0.xml" media-type="application/xml"/>
</odf:manifest>`
  )

  const contents = zip.folder('Contents')!

  contents.file(
    'content.hpf',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hpf:HWPML xmlns:hpf="${NS.hpf}" xmlns:ocf="${NS.ocf}" version="1.4">
  <hpf:head>
    <hpf:title>${escapeXml(bookTitle)}</hpf:title>
  </hpf:head>
  <hpf:manifest>
    <hpf:item id="header" href="Contents/header.xml" media-type="application/xml"/>
    <hpf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>
  </hpf:manifest>
  <hpf:spine>
    <hpf:itemref idref="header"/>
    <hpf:itemref idref="section0"/>
  </hpf:spine>
</hpf:HWPML>`
  )

  // 최소 head: 글꼴 1, 문자모양 2(본문/강조), 문단모양 1, 스타일 1, 테두리 1
  contents.file(
    'header.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:head xmlns:hh="${NS.hh}" xmlns:hc="${NS.hc}" version="1.4" secCnt="1">
  <hh:refList>
    <hh:fontfaces itemCnt="1">
      <hh:fontface lang="HANGUL" fontCnt="1">
        <hh:font id="0" face="함초롬바탕" type="TTF" isEmbedded="0"/>
      </hh:fontface>
    </hh:fontfaces>
    <hh:borderFills itemCnt="1">
      <hh:borderFill id="0" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:rightBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:topBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:bottomBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>
      </hh:borderFill>
    </hh:borderFills>
    <hh:charProperties itemCnt="2">
      <hh:charPr id="0" height="1000" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="0">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <hh:charPr id="1" height="1200" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="0">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
      </hh:charPr>
    </hh:charProperties>
    <hh:paraProperties itemCnt="1">
      <hh:paraPr id="0" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:margin>
          <hc:intent value="0" unit="HWPUNIT"/>
          <hc:left value="0" unit="HWPUNIT"/>
          <hc:right value="0" unit="HWPUNIT"/>
          <hc:prev value="0" unit="HWPUNIT"/>
          <hc:next value="0" unit="HWPUNIT"/>
        </hh:margin>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
      </hh:paraPr>
    </hh:paraProperties>
    <hh:styles itemCnt="1">
      <hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0" nextStyleIDRef="0" langID="1042" lockForm="0"/>
    </hh:styles>
  </hh:refList>
</hh:head>`
  )

  contents.file(
    'section0.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="${NS.hs}" xmlns:hp="${NS.hp}" xmlns:hc="${NS.hc}">
      ${paragraphsXml(pieces)}
</hs:sec>`
  )

  return zip.generateAsync({ type: 'blob', mimeType: 'application/hwp+zip' })
}
