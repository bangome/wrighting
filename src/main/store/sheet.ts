import type { SheetProfile, SheetData } from '@shared/types'

// 시트 프로필은 본문 상단의 HTML 주석 펜스에 JSON으로 저장된다(마크다운 호환·렌더 시 숨김).
const FENCE_RE = /^<!--sheet\s*\n([\s\S]*?)\n-->\n?/

function emptyProfile(): SheetProfile {
  return { type: 'character', attributes: {}, tags: [] }
}

/** 원문에서 프로필(있으면)과 본문을 분리 */
export function parseSheet(raw: string): SheetData {
  const m = raw.match(FENCE_RE)
  if (m) {
    try {
      const p = JSON.parse(m[1]) as Partial<SheetProfile>
      return {
        profile: {
          type: typeof p.type === 'string' ? p.type : 'character',
          attributes: p.attributes && typeof p.attributes === 'object' ? p.attributes : {},
          tags: Array.isArray(p.tags) ? p.tags : []
        },
        body: raw.slice(m[0].length)
      }
    } catch {
      // 깨진 펜스는 무시하고 전체를 본문으로 취급
    }
  }
  return { profile: emptyProfile(), body: raw }
}

/** 프로필 + 본문을 시트 원문으로 직렬화 */
export function serializeSheet(profile: SheetProfile, body: string): string {
  const json = JSON.stringify({ type: profile.type, attributes: profile.attributes, tags: profile.tags })
  return `<!--sheet\n${json}\n-->\n${body.replace(/^\n/, '')}`
}

/** 컨텍스트/검색용: 프로필 속성 + 태그 + 본문을 사람이 읽기 좋은 평문으로 */
export function sheetToPlain(raw: string): string {
  const { profile, body } = parseSheet(raw)
  const lines: string[] = []
  for (const [k, v] of Object.entries(profile.attributes)) {
    if (v && v.trim()) lines.push(`- ${k}: ${v.trim()}`)
  }
  if (profile.tags.length) lines.push(`- 태그: ${profile.tags.join(', ')}`)
  const bodyTrim = body.trim()
  if (bodyTrim) lines.push(bodyTrim)
  return lines.join('\n')
}
