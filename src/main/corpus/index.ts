import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { randomUUID } from 'crypto'
import type { CorpusInfo } from '@shared/types'

/** 다국어(한국어 포함) 소형 임베딩 모델. 최초 사용 시 로컬 캐시에 다운로드됨. */
const MODEL = 'Xenova/multilingual-e5-small'
const STORE = '.index/corpus.json'

interface Chunk {
  id: string
  source: string
  text: string
  vector: number[]
}
interface Store {
  model: string
  chunks: Chunk[]
}

export interface RetrievedRef {
  source: string
  text: string
  score: number
}

// transformers.js 파이프라인은 무겁다 — 지연 로드 + 1회만 초기화
let extractorPromise: Promise<(input: string, opts: object) => Promise<{ data: Float32Array }>> | null =
  null

async function getExtractor(): Promise<(input: string, opts: object) => Promise<{ data: Float32Array }>> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      return (await pipeline('feature-extraction', MODEL)) as unknown as (
        input: string,
        opts: object
      ) => Promise<{ data: Float32Array }>
    })()
  }
  return extractorPromise
}

/** e5 계열은 query:/passage: 접두사를 사용할 때 성능이 좋다. */
async function embed(text: string, kind: 'query' | 'passage'): Promise<number[]> {
  const extractor = await getExtractor()
  const out = await extractor(`${kind}: ${text}`, { pooling: 'mean', normalize: true })
  return Array.from(out.data)
}

async function loadStore(dir: string): Promise<Store> {
  try {
    return JSON.parse(await fs.readFile(join(dir, STORE), 'utf-8')) as Store
  } catch {
    return { model: MODEL, chunks: [] }
  }
}

async function saveStore(dir: string, store: Store): Promise<void> {
  const p = join(dir, STORE)
  await fs.mkdir(dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(store), 'utf-8')
}

/** 문단 기준으로 ~maxChars 크기 청크로 묶는다. */
function chunkText(text: string, maxChars = 800): string[] {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const chunks: string[] = []
  let cur = ''
  for (const p of paras) {
    if (cur && (cur + '\n\n' + p).length > maxChars) {
      chunks.push(cur)
      cur = p
    } else {
      cur = cur ? cur + '\n\n' + p : p
    }
  }
  if (cur) chunks.push(cur)
  return chunks
}

function info(store: Store): CorpusInfo {
  const counts = new Map<string, number>()
  for (const c of store.chunks) counts.set(c.source, (counts.get(c.source) ?? 0) + 1)
  return {
    model: store.model,
    total: store.chunks.length,
    sources: [...counts].map(([source, chunks]) => ({ source, chunks }))
  }
}

function dot(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length && i < b.length; i++) s += a[i] * b[i]
  return s
}

/** 레퍼런스 문서를 임베딩해 코퍼스에 추가 */
export async function addDocument(dir: string, source: string, text: string): Promise<CorpusInfo> {
  const store = await loadStore(dir)
  for (const piece of chunkText(text)) {
    store.chunks.push({ id: randomUUID(), source, text: piece, vector: await embed(piece, 'passage') })
  }
  await saveStore(dir, store)
  return info(store)
}

/** 쿼리와 유사한 상위 K개 발췌 반환 (정규화 벡터이므로 dot = cosine) */
export async function search(dir: string, queryText: string, topK = 4): Promise<RetrievedRef[]> {
  const store = await loadStore(dir)
  if (store.chunks.length === 0) return []
  const q = await embed(queryText, 'query')
  return store.chunks
    .map((c) => ({ source: c.source, text: c.text, score: dot(q, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

export async function getInfo(dir: string): Promise<CorpusInfo> {
  return info(await loadStore(dir))
}
