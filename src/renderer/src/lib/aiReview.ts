import type { AiReviewRequest, AiReviewResponse } from '@shared/aiReview'

class AiReviewRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiReviewRequestError'
  }
}

export async function requestAiReview(input: AiReviewRequest): Promise<AiReviewResponse> {
  const bridge = window.wrighting?.ai
  if (bridge) return bridge.reviewDocument(input)

  const response = await fetch('/api/ai-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  const json: unknown = await response.json()
  if (!response.ok) {
    const message =
      typeof json === 'object' && json !== null && 'error' in json && typeof json.error === 'string'
        ? json.error
        : 'AI 리뷰를 생성하지 못했습니다.'
    throw new AiReviewRequestError(message)
  }
  return json as AiReviewResponse
}
