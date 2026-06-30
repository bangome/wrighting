import { describe, expect, it } from 'vitest'
import { buildAiReviewPrompt, type AiReviewRequest } from './aiReview'

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
