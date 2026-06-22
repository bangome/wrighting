/**
 * Gemini 임베딩 (gemini-embedding-001).
 * pgvector HNSW 인덱스 한계(2000)에 맞춰 output_dimensionality=1536 으로 잘라 L2 정규화.
 * (3072 외 차원은 정규화가 안 된 채 반환되므로 직접 정규화한다.)
 */

const MODEL = 'models/gemini-embedding-001'
export const EMBED_DIM = 1536
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'

export type EmbedTask = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'

export function geminiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null
}

function l2normalize(v: number[]): number[] {
  let s = 0
  for (const x of v) s += x * x
  const n = Math.sqrt(s)
  return n > 0 ? v.map((x) => x / n) : v
}

interface EmbedResponse {
  embedding?: { values: number[] }
  embeddings?: { values: number[] }[]
}

/** 단일 텍스트 임베딩 → 정규화된 1536차원 벡터 */
export async function embedText(text: string, taskType: EmbedTask): Promise<number[]> {
  const key = geminiKey()
  if (!key) throw new Error('GEMINI_API_KEY 가 필요합니다(.env 확인).')
  const res = await fetch(`${ENDPOINT}/${MODEL}:embedContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: EMBED_DIM
    })
  })
  if (!res.ok) throw new Error(`Gemini 임베딩 실패 ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as EmbedResponse
  const values = json.embedding?.values
  if (!values) throw new Error('Gemini 응답에 embedding 이 없습니다.')
  return l2normalize(values)
}

/** 여러 텍스트 배치 임베딩 (최대 100개씩 나눠 호출) */
export async function embedBatch(texts: string[], taskType: EmbedTask): Promise<number[][]> {
  const key = geminiKey()
  if (!key) throw new Error('GEMINI_API_KEY 가 필요합니다(.env 확인).')
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100)
    const res = await fetch(`${ENDPOINT}/${MODEL}:batchEmbedContents?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: batch.map((text) => ({
          model: MODEL,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBED_DIM
        }))
      })
    })
    if (!res.ok) throw new Error(`Gemini 배치 임베딩 실패 ${res.status}: ${await res.text()}`)
    const json = (await res.json()) as EmbedResponse
    for (const e of json.embeddings ?? []) out.push(l2normalize(e.values))
  }
  return out
}

/** pgvector 텍스트 리터럴 '[a,b,c]' 로 직렬화 */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`
}
