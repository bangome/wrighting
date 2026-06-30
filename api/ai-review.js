import { z } from 'zod'

export const maxDuration = 60

const MODEL = 'gemini-2.5-pro'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'
const FOCUS_KEYS = ['story', 'character', 'pacing', 'prose', 'emotion', 'marketability', 'worldbuilding']
const FORMATS = ['webNovel', 'genreNovel', 'literaryNovel', 'script']
const AUDIENCES = ['platformEditor', 'contestJudge', 'coreReader', 'lightReader']

const FOCUS_LABEL = {
  story: '이야기·플롯',
  character: '인물',
  pacing: '호흡·전개',
  prose: '문체·서술',
  emotion: '감정선',
  marketability: '시장성',
  worldbuilding: '세계관'
}

const AUDIENCE_LABEL = {
  platformEditor: '플랫폼 편집자',
  contestJudge: '공모 심사',
  coreReader: '핵심 독자층',
  lightReader: '라이트 독자'
}

const FORMAT_LABEL = {
  webNovel: '웹소설',
  genreNovel: '장르소설',
  literaryNovel: '문예/단행본',
  script: '시나리오'
}

const ReviewRequestSchema = z.object({
  documentTitle: z.string(),
  documentText: z.string(),
  format: z.enum(FORMATS),
  audience: z.enum(AUDIENCES),
  focus: z.array(z.enum(FOCUS_KEYS)),
  directness: z.number().min(0).max(100),
  partCards: z.array(
    z.object({
      boardTitle: z.string(),
      columnTitle: z.string().nullable(),
      title: z.string(),
      body: z.string().nullable(),
      tags: z.array(z.string()),
      mentionedTitles: z.array(z.string())
    })
  ),
  referenceDocuments: z.array(z.string()),
  additionalGuidance: z.string()
})

const ReviewResponseSchema = z.object({
  overallScore: z.number().min(0).max(5),
  scores: z.array(
    z.object({
      key: z.enum(FOCUS_KEYS),
      label: z.string(),
      score: z.number().min(0).max(5),
      reason: z.string()
    })
  ),
  summary: z.string(),
  strengths: z.array(sectionSchema()).min(1).max(4),
  risks: z.array(sectionSchema()).min(1).max(4),
  revisionPlan: z.array(z.string()).min(3).max(8),
  audienceRead: z.string(),
  partCardNotes: z.array(z.string()).max(6)
})

const GeminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() }))
        })
      })
    )
    .optional(),
  error: z.object({ message: z.string() }).optional()
})

function sectionSchema() {
  return z.object({
    title: z.string(),
    body: z.string(),
    evidence: z.array(z.string()).max(6),
    suggestions: z.array(z.string()).max(6)
  })
}

function geminiKey() {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY 또는 GOOGLE_API_KEY가 필요합니다.')
  return key
}

function directnessLabel(value) {
  if (value < 35) return '부드럽게'
  if (value < 70) return '균형 있게'
  return '직설적으로'
}

function listLines(values) {
  return values.length === 0 ? '- 없음' : values.map((value) => `- ${value}`).join('\n')
}

function partCardLines(cards) {
  if (cards.length === 0) return '- 연결된 파트 카드 없음'
  return cards
    .map((card, index) =>
      [
        `## 파트 카드 ${index + 1}: ${card.title || '제목 없음'}`,
        `- 플롯보드: ${card.boardTitle || '제목 없음'}`,
        `- 막/컬럼: ${card.columnTitle || '미지정'}`,
        `- 태그: ${card.tags.length > 0 ? card.tags.join(', ') : '없음'}`,
        `- 언급 항목: ${card.mentionedTitles.length > 0 ? card.mentionedTitles.join(', ') : '없음'}`,
        `- 카드 메모: ${card.body?.trim() || '없음'}`
      ].join('\n')
    )
    .join('\n\n')
}

function buildPrompt(input) {
  const focusLabels = input.focus.map((key) => FOCUS_LABEL[key])
  const systemInstruction = [
    '너는 한국어 장편 서사 편집자이자 독자 반응 분석가다.',
    '문서를 독립적으로 평가하되, 연결된 파트 카드의 의도와 충돌하는지 반드시 확인한다.',
    '칭찬은 근거가 있을 때만 하고, 수정 제안은 문장·장면·정보 배치 단위로 실행 가능해야 한다.',
    '대상 독자 관점에 맞춰 판단 기준을 바꾼다.',
    '반드시 JSON만 반환하고 마크다운, 코드펜스, 주석을 쓰지 않는다.'
  ].join('\n')
  const userPrompt = [
    '# 리뷰 설정',
    `- 문서 형식: ${FORMAT_LABEL[input.format]}`,
    `- 대상 독자: ${AUDIENCE_LABEL[input.audience]}`,
    `- 피드백 톤: ${directnessLabel(input.directness)} (${input.directness}/100)`,
    `- 집중 평가: ${focusLabels.join(', ') || '전체'}`,
    '',
    '# 평가 하네스',
    '1. 먼저 이 문서의 장면 목적, 갈등, 정보 전달, 감정 변화, 다음 행동 유도를 5문장 이내로 파악한다.',
    '2. 파트 카드가 제시한 의도(막, 태그, 언급 항목, 카드 메모)와 실제 본문이 맞는지 비교한다.',
    '3. 선택된 집중 평가 항목은 점수와 근거를 더 촘촘히 쓰고, 선택되지 않은 항목도 치명적 결함은 지적한다.',
    '4. 대상 독자별 기준:',
    '   - 플랫폼 편집자: 연재 유지력, 회차 후킹, 상품성, 독자 이탈 구간, 다음 회차 결제/클릭 동기',
    '   - 공모 심사: 독창성, 완성도, 서사 통제력, 주제 의식, 장면의 필연성',
    '   - 핵심 독자층: 장르 기대 충족, 캐릭터 몰입, 떡밥 회수 기대, 감정 보상',
    '   - 라이트 독자: 이해 용이성, 초반 집중도, 정보 과부하, 문장 접근성',
    '5. 증거는 본문이나 파트 카드에서 짧게 요약하고, 개선안은 바로 고쳐 쓸 수 있는 액션으로 작성한다.',
    '6. 점수는 0~5 소수 한 자리까지 허용한다. 전체 점수는 선택 항목과 대상 독자 적합도를 종합한다.',
    '',
    '# 참고 문서 메모',
    listLines(input.referenceDocuments),
    '',
    '# 추가 지시',
    input.additionalGuidance.trim() || '- 없음',
    '',
    '# 연결된 파트 카드',
    partCardLines(input.partCards),
    '',
    '# 리뷰 대상 문서',
    `제목: ${input.documentTitle || '제목 없음'}`,
    input.documentText.trim() || '(본문 없음)',
    '',
    '# 반환 JSON 형태',
    JSON.stringify({
      overallScore: 0,
      scores: [{ key: 'story', label: '이야기·플롯', score: 0, reason: '근거' }],
      summary: '전반적인 피드백',
      strengths: [{ title: '좋은 점', body: '설명', evidence: ['근거'], suggestions: ['강화 방법'] }],
      risks: [{ title: '수정 필요', body: '설명', evidence: ['근거'], suggestions: ['수정 방법'] }],
      revisionPlan: ['1순위 수정', '2순위 수정', '3순위 수정'],
      audienceRead: '대상 독자 관점의 반응 예측',
      partCardNotes: ['파트 카드와 본문 연결에 대한 관찰']
    })
  ].join('\n')
  return { systemInstruction, userPrompt }
}

function extractJson(text) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  throw new Error('Gemini 리뷰 응답에서 JSON을 찾지 못했습니다.')
}

async function reviewWithGemini(input) {
  const { systemInstruction, userPrompt } = buildPrompt(input)
  const response = await fetch(`${ENDPOINT}/models/${MODEL}:generateContent?key=${geminiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.35, topP: 0.9, responseMimeType: 'application/json' }
    })
  })
  const raw = await response.json()
  const parsed = GeminiResponseSchema.parse(raw)
  if (!response.ok) throw new Error(parsed.error?.message ?? `Gemini 리뷰 실패 ${response.status}`)
  const text = parsed.candidates?.[0]?.content.parts.map((part) => part.text ?? '').join('').trim() ?? ''
  if (!text) throw new Error('Gemini 리뷰 응답이 비어 있습니다.')
  return ReviewResponseSchema.parse(JSON.parse(extractJson(text)))
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ error: 'POST만 지원합니다.' }, { status: 405 })
    try {
      const input = ReviewRequestSchema.parse(await request.json())
      return Response.json(await reviewWithGemini(input))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 리뷰를 생성하지 못했습니다.'
      return Response.json({ error: message }, { status: 400 })
    }
  }
}
