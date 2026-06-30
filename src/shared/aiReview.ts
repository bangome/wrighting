import { z } from 'zod'

export const AI_REVIEW_MODEL = 'gemini-2.5-pro'

export const REVIEW_FORMATS = ['webNovel', 'genreNovel', 'literaryNovel', 'script'] as const
export type ReviewFormat = (typeof REVIEW_FORMATS)[number]

export const REVIEW_AUDIENCES = [
  'platformEditor',
  'contestJudge',
  'coreReader',
  'lightReader'
] as const
export type ReviewAudience = (typeof REVIEW_AUDIENCES)[number]

export const REVIEW_FOCUS_KEYS = [
  'story',
  'character',
  'pacing',
  'prose',
  'emotion',
  'marketability',
  'worldbuilding'
] as const
export type ReviewFocusKey = (typeof REVIEW_FOCUS_KEYS)[number]

export const REVIEW_FOCUS_LABEL: Record<ReviewFocusKey, string> = {
  story: '이야기·플롯',
  character: '인물',
  pacing: '호흡·전개',
  prose: '문체·서술',
  emotion: '감정선',
  marketability: '시장성',
  worldbuilding: '세계관'
}

export const REVIEW_AUDIENCE_LABEL: Record<ReviewAudience, string> = {
  platformEditor: '플랫폼 편집자',
  contestJudge: '공모 심사',
  coreReader: '핵심 독자층',
  lightReader: '라이트 독자'
}

export const REVIEW_FORMAT_LABEL: Record<ReviewFormat, string> = {
  webNovel: '웹소설',
  genreNovel: '장르소설',
  literaryNovel: '문예/단행본',
  script: '시나리오'
}

export interface AiReviewPartCard {
  readonly boardTitle: string
  readonly columnTitle: string | null
  readonly title: string
  readonly body: string | null
  readonly tags: readonly string[]
  readonly mentionedTitles: readonly string[]
}

export interface AiReviewRequest {
  readonly documentTitle: string
  readonly documentText: string
  readonly format: ReviewFormat
  readonly audience: ReviewAudience
  readonly focus: readonly ReviewFocusKey[]
  readonly directness: number
  readonly partCards: readonly AiReviewPartCard[]
  readonly referenceDocuments: readonly string[]
  readonly additionalGuidance: string
}

export const AiReviewPartCardSchema = z.object({
  boardTitle: z.string(),
  columnTitle: z.string().nullable(),
  title: z.string(),
  body: z.string().nullable(),
  tags: z.array(z.string()),
  mentionedTitles: z.array(z.string())
})

export const AiReviewRequestSchema = z.object({
  documentTitle: z.string(),
  documentText: z.string(),
  format: z.enum(REVIEW_FORMATS),
  audience: z.enum(REVIEW_AUDIENCES),
  focus: z.array(z.enum(REVIEW_FOCUS_KEYS)),
  directness: z.number().min(0).max(100),
  partCards: z.array(AiReviewPartCardSchema),
  referenceDocuments: z.array(z.string()),
  additionalGuidance: z.string()
})

export const ReviewScoreSchema = z.object({
  key: z.enum(REVIEW_FOCUS_KEYS),
  label: z.string(),
  score: z.number().min(0).max(5),
  reason: z.string()
})

export const ReviewSectionSchema = z.object({
  title: z.string(),
  body: z.string(),
  evidence: z.array(z.string()).max(6),
  suggestions: z.array(z.string()).max(6)
})

export const AiReviewResponseSchema = z.object({
  overallScore: z.number().min(0).max(5),
  scores: z.array(ReviewScoreSchema),
  summary: z.string(),
  strengths: z.array(ReviewSectionSchema).min(1).max(4),
  risks: z.array(ReviewSectionSchema).min(1).max(4),
  revisionPlan: z.array(z.string()).min(3).max(8),
  audienceRead: z.string(),
  partCardNotes: z.array(z.string()).max(6)
})

export type AiReviewResponse = z.infer<typeof AiReviewResponseSchema>

const SCORE_KEY_ALIASES: Record<string, ReviewFocusKey> = {
  plot: 'story',
  narrative: 'story',
  story: 'story',
  '이야기': 'story',
  '플롯': 'story',
  '서사': 'story',
  character: 'character',
  characters: 'character',
  '인물': 'character',
  '캐릭터': 'character',
  pacing: 'pacing',
  pace: 'pacing',
  tempo: 'pacing',
  tension: 'pacing',
  '호흡': 'pacing',
  '전개': 'pacing',
  prose: 'prose',
  style: 'prose',
  sentence: 'prose',
  '문체': 'prose',
  '서술': 'prose',
  '문장': 'prose',
  emotion: 'emotion',
  emotional: 'emotion',
  '감정': 'emotion',
  '감정선': 'emotion',
  marketability: 'marketability',
  commercial: 'marketability',
  hook: 'marketability',
  '시장성': 'marketability',
  '상품성': 'marketability',
  '후킹': 'marketability',
  worldbuilding: 'worldbuilding',
  world: 'worldbuilding',
  setting: 'worldbuilding',
  '세계관': 'worldbuilding',
  '설정': 'worldbuilding'
}

function objectRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function normalizeScoreKey(score: unknown, index: number): ReviewFocusKey {
  const record = objectRecord(score)
  const values = [record.key, record.label].filter(
    (value): value is string => typeof value === 'string'
  )
  for (const value of values) {
    const normalized = value.trim().toLowerCase()
    const exact = SCORE_KEY_ALIASES[normalized]
    if (exact) return exact
    for (const [needle, key] of Object.entries(SCORE_KEY_ALIASES)) {
      if (normalized.includes(needle)) return key
    }
  }
  return REVIEW_FOCUS_KEYS[index] ?? REVIEW_FOCUS_KEYS[0]
}

function normalizeRevisionPlan(value: unknown): string[] {
  const plan = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
  const fallback = [
    '가장 낮은 점수의 항목부터 장면 단위로 수정한다.',
    '파트 카드의 의도와 본문 전개가 어긋나는 지점을 먼저 맞춘다.',
    '수정 후 첫 문단과 마지막 문단의 후킹을 다시 점검한다.'
  ]
  return [...plan, ...fallback].slice(0, Math.max(3, plan.length))
}

export function normalizeAiReviewResponse(raw: unknown): AiReviewResponse {
  const record = objectRecord(raw)
  const scores = Array.isArray(record.scores)
    ? record.scores.map((score, index) => ({
        ...objectRecord(score),
        key: normalizeScoreKey(score, index)
      }))
    : []
  return AiReviewResponseSchema.parse({
    ...record,
    scores,
    revisionPlan: normalizeRevisionPlan(record.revisionPlan)
  })
}

export interface AiReviewPrompt {
  readonly systemInstruction: string
  readonly userPrompt: string
}

const DIRECTNESS_LABELS = ['부드럽게', '균형 있게', '직설적으로'] as const

function directnessLabel(value: number): string {
  if (value < 35) return DIRECTNESS_LABELS[0]
  if (value < 70) return DIRECTNESS_LABELS[1]
  return DIRECTNESS_LABELS[2]
}

function listLines(values: readonly string[]): string {
  return values.length === 0 ? '- 없음' : values.map((value) => `- ${value}`).join('\n')
}

function partCardLines(cards: readonly AiReviewPartCard[]): string {
  if (cards.length === 0) return '- 연결된 파트 카드 없음'
  return cards
    .map((card, index) => {
      const tags = card.tags.length > 0 ? card.tags.join(', ') : '없음'
      const mentions = card.mentionedTitles.length > 0 ? card.mentionedTitles.join(', ') : '없음'
      return [
        `## 파트 카드 ${index + 1}: ${card.title || '제목 없음'}`,
        `- 플롯보드: ${card.boardTitle || '제목 없음'}`,
        `- 막/컬럼: ${card.columnTitle || '미지정'}`,
        `- 태그: ${tags}`,
        `- 언급 항목: ${mentions}`,
        `- 카드 메모: ${card.body?.trim() || '없음'}`
      ].join('\n')
    })
    .join('\n\n')
}

export function buildAiReviewPrompt(input: AiReviewRequest): AiReviewPrompt {
  const focusLabels = input.focus.map((key) => REVIEW_FOCUS_LABEL[key])
  const systemInstruction = [
    '너는 한국어 장편 서사 편집자이자 독자 반응 분석가다.',
    '문서를 독립적으로 평가하되, 연결된 파트 카드의 의도와 충돌하는지 반드시 확인한다.',
    '칭찬은 근거가 있을 때만 하고, 수정 제안은 문장·장면·정보 배치 단위로 실행 가능해야 한다.',
    '대상 독자 관점에 맞춰 판단 기준을 바꾼다.',
    '반드시 JSON만 반환하고 마크다운, 코드펜스, 주석을 쓰지 않는다.'
  ].join('\n')

  const userPrompt = [
    '# 리뷰 설정',
    `- 문서 형식: ${REVIEW_FORMAT_LABEL[input.format]}`,
    `- 대상 독자: ${REVIEW_AUDIENCE_LABEL[input.audience]}`,
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
    `7. scores[].key는 반드시 다음 영문 키 중 하나만 쓴다: ${REVIEW_FOCUS_KEYS.join(', ')}.`,
    '8. revisionPlan은 반드시 3개 이상 작성한다.',
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
