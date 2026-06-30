import { describe, expect, it } from 'vitest'
import type { AiReviewResponse } from '@shared/aiReview'
import { loadStoredAiReview, saveStoredAiReview } from './aiReviewStorage'

describe('aiReviewStorage', () => {
  it('loads the latest saved review for a document', () => {
    const storage = memoryStorage()
    const first = review({ summary: 'first' })
    const second = review({ summary: 'second' })

    saveStoredAiReview('doc-1', first, storage)
    saveStoredAiReview('doc-1', second, storage)

    expect(loadStoredAiReview('doc-1', storage)?.summary).toBe('second')
    expect(loadStoredAiReview('doc-2', storage)).toBeNull()
  })

  it('returns null when stored data is not a review result', () => {
    const storage = memoryStorage()
    storage.setItem('wrighting:ai-review:doc-1', '{"version":1,"result":{"summary":"broken"}}')

    expect(loadStoredAiReview('doc-1', storage)).toBeNull()
  })
})

function review(patch: Partial<AiReviewResponse>): AiReviewResponse {
  return {
    overallScore: 4,
    scores: [{ key: 'story', label: 'story', score: 4, reason: 'clear' }],
    summary: 'saved',
    strengths: [{ title: 'strong', body: 'body', evidence: [], suggestions: [] }],
    risks: [{ title: 'risk', body: 'body', evidence: [], suggestions: [] }],
    revisionPlan: ['one', 'two', 'three'],
    audienceRead: 'clear',
    partCardNotes: [],
    ...patch
  }
}

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string): string | null => values.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      values.set(key, value)
    }
  }
}
