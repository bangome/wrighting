import { z } from 'zod'
import { AiReviewResponseSchema, type AiReviewResponse } from '@shared/aiReview'

interface ReviewStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

const STORED_REVIEW_VERSION = 1
const StoredReviewSchema = z.object({
  version: z.literal(STORED_REVIEW_VERSION),
  result: AiReviewResponseSchema
})

function storageKey(itemId: string): string {
  return `wrighting:ai-review:${itemId}`
}

function browserStorage(): ReviewStorage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

export function loadStoredAiReview(
  itemId: string,
  storage: ReviewStorage | null = browserStorage()
): AiReviewResponse | null {
  const raw = storage?.getItem(storageKey(itemId))
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return StoredReviewSchema.parse(parsed).result
  } catch (error) {
    if (error instanceof Error) return null
    return null
  }
}

export function saveStoredAiReview(
  itemId: string,
  result: AiReviewResponse,
  storage: ReviewStorage | null = browserStorage()
): void {
  storage?.setItem(storageKey(itemId), JSON.stringify({ version: STORED_REVIEW_VERSION, result }))
}
