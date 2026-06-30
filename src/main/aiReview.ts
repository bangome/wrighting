import { z } from 'zod'
import {
  AI_REVIEW_MODEL,
  buildAiReviewPrompt,
  normalizeAiReviewResponse,
  type AiReviewRequest,
  type AiReviewResponse
} from '../shared/aiReview'

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'

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

class GeminiReviewError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiReviewError'
  }
}

function geminiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!key) throw new GeminiReviewError('GEMINI_API_KEY 또는 GOOGLE_API_KEY가 필요합니다.')
  return key
}

function extractJson(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  throw new GeminiReviewError('Gemini 리뷰 응답에서 JSON을 찾지 못했습니다.')
}

export async function reviewWithGemini(input: AiReviewRequest): Promise<AiReviewResponse> {
  const { systemInstruction, userPrompt } = buildAiReviewPrompt(input)
  const response = await fetch(
    `${GEMINI_ENDPOINT}/models/${AI_REVIEW_MODEL}:generateContent?key=${geminiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.35,
          topP: 0.9,
          responseMimeType: 'application/json'
        }
      })
    }
  )
  const raw: unknown = await response.json()
  const parsed = GeminiResponseSchema.parse(raw)
  if (!response.ok) {
    throw new GeminiReviewError(parsed.error?.message ?? `Gemini 리뷰 실패 ${response.status}`)
  }
  const text =
    parsed.candidates?.[0]?.content.parts
      .map((part) => part.text ?? '')
      .join('')
      .trim() ?? ''
  if (!text) throw new GeminiReviewError('Gemini 리뷰 응답이 비어 있습니다.')
  const json: unknown = JSON.parse(extractJson(text))
  return normalizeAiReviewResponse(json)
}
