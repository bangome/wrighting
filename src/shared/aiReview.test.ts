import { describe, expect, it } from 'vitest'
import { buildAiReviewPrompt, normalizeAiReviewResponse, type AiReviewRequest } from './aiReview'

describe('buildAiReviewPrompt', () => {
  it('includes the target audience rubric when reviewing for platform editors', () => {
    const prompt = buildAiReviewPrompt(request({ audience: 'platformEditor' }))

    expect(prompt.userPrompt).toContain('플랫폼 편집자')
    expect(prompt.userPrompt).toContain('연재 유지력')
    expect(prompt.userPrompt).toContain('다음 회차 결제/클릭 동기')
  })

  it('includes linked part-card intent when document cards are provided', () => {
    const prompt = buildAiReviewPrompt(
      request({
        partCards: [
          {
            boardTitle: '1부 플롯',
            columnTitle: '2막',
            title: '몸을 말려야 하는 회차',
            body: '동물 토론 이후 경주 행동으로 넘어간다.',
            tags: ['전환점'],
            mentionedTitles: ['코커스 경주']
          }
        ]
      })
    )

    expect(prompt.userPrompt).toContain('몸을 말려야 하는 회차')
    expect(prompt.userPrompt).toContain('동물 토론 이후 경주 행동')
    expect(prompt.userPrompt).toContain('코커스 경주')
  })
})

describe('normalizeAiReviewResponse', () => {
  it('repairs alias score keys and pads short revision plans from Gemini output', () => {
    const review = normalizeAiReviewResponse({
      overallScore: 3.5,
      scores: [
        { key: 'story', label: '이야기·플롯', score: 3.8, reason: 'clear' },
        { key: 'character', label: '인물', score: 3, reason: 'clear' },
        { key: 'pacing', label: '호흡·전개', score: 3, reason: 'clear' },
        { key: 'problem', label: '문제', score: 3.9, reason: 'clear' },
        { key: 'emotion', label: '감정선', score: 2.9, reason: 'clear' },
        { key: 'visuality', label: '시장성', score: 3.8, reason: 'clear' },
        { key: 'worldbuilding', label: '세계관', score: 3.8, reason: 'clear' }
      ],
      summary: 'ok',
      strengths: [{ title: 'good', body: 'body', evidence: [], suggestions: [] }],
      risks: [{ title: 'risk', body: 'body', evidence: [], suggestions: [] }],
      revisionPlan: ['문제 제시를 선명하게 다듬는다.'],
      audienceRead: 'ok',
      partCardNotes: []
    })

    expect(review.scores[3]?.key).toBe('prose')
    expect(review.scores[5]?.key).toBe('marketability')
    expect(review.revisionPlan).toHaveLength(3)
  })
})

function request(patch: Partial<AiReviewRequest>): AiReviewRequest {
  return {
    documentTitle: '4화',
    documentText: '첫 번째 과제는 당연히 어떻게 다시 몸을 말릴 것인가였다.',
    format: 'webNovel',
    audience: 'lightReader',
    focus: ['story', 'pacing'],
    directness: 80,
    partCards: [],
    referenceDocuments: [],
    additionalGuidance: '',
    ...patch
  }
}
