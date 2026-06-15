import { query } from '@anthropic-ai/claude-agent-sdk'
import { promises as fs } from 'fs'
import { join } from 'path'
import { ROLES } from './roles'
import { assembleContext } from './context'
import { search } from '../corpus'
import type { AiRole } from '@shared/types'

export interface RunAgentParams {
  projectDir: string
  role: AiRole
  prompt: string
  sceneFile?: string
  useCorpus?: boolean
  model?: string
}

/** drafter 집필 시 레퍼런스 코퍼스에서 유사 발췌를 가져와 참고 블록으로 구성 */
async function corpusReferences(params: RunAgentParams): Promise<string> {
  if (params.role !== 'drafter' || params.useCorpus === false) return ''
  try {
    const refs = await search(params.projectDir, params.prompt, 4)
    if (refs.length === 0) return ''
    const body = refs
      .map((r, i) => `### 레퍼런스 ${i + 1} (출처: ${r.source})\n${r.text}`)
      .join('\n\n')
    return `## 참고 레퍼런스 (구조·리듬만 참고, 표현 복제 금지)\n${body}`
  } catch {
    return ''
  }
}

export interface AgentCallbacks {
  onChunk: (text: string) => void
  onDone: () => void
  onError: (message: string) => void
}

/** 프로젝트 메모리(CLAUDE.md)를 읽어 시스템 프롬프트에 주입 */
async function loadMemory(projectDir: string): Promise<string> {
  try {
    return (await fs.readFile(join(projectDir, 'CLAUDE.md'), 'utf-8')).trim()
  } catch {
    return ''
  }
}

/**
 * 구독(OAuth) 인증을 강제하기 위한 환경.
 * ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN 이 설정돼 있으면 SDK가 API 과금으로
 * 빠지므로 자식 프로세스 환경에서 제거한다.
 */
function subscriptionEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue
    if (key === 'ANTHROPIC_API_KEY' || key === 'ANTHROPIC_AUTH_TOKEN') continue
    env[key] = value
  }
  return env
}

export async function runAgent(params: RunAgentParams, cb: AgentCallbacks): Promise<void> {
  try {
    const memory = await loadMemory(params.projectDir)
    let systemPrompt = ROLES[params.role]
    if (memory) systemPrompt += `\n\n# 작품 메모리 (CLAUDE.md)\n${memory}`

    const context = await assembleContext(params.projectDir, params.role, params.sceneFile)
    const references = await corpusReferences(params)

    const contextBlock = [context, references].filter(Boolean).join('\n\n')
    const userPrompt = contextBlock
      ? `# 작업 맥락 (스토리 바이블 / 본문 / 레퍼런스)\n${contextBlock}\n\n---\n\n# 요청\n${params.prompt}`
      : params.prompt

    const response = query({
      prompt: userPrompt,
      options: {
        systemPrompt,
        cwd: params.projectDir,
        allowedTools: [],
        // 외부 설정·전역 CLAUDE.md 를 로드하지 않는다 (앱 자기완결성).
        // 작품 메모리는 위에서 명시적으로 주입한다.
        settingSources: [],
        env: subscriptionEnv(),
        ...(params.model ? { model: params.model } : {})
      }
    })

    for await (const message of response) {
      if (message.type === 'assistant') {
        const content = message.message.content as unknown as Array<{
          type: string
          text?: string
        }>
        const text = content
          .filter((b) => b.type === 'text')
          .map((b) => b.text ?? '')
          .join('')
        if (text) cb.onChunk(text)
      }
    }
    cb.onDone()
  } catch (err) {
    cb.onError(err instanceof Error ? err.message : String(err))
  }
}
