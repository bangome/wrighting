import { promises as fs } from 'fs'
import { join } from 'path'
import type { AiRole, ProjectFile, Scene } from '@shared/types'
import { sheetToPlain } from '../store/sheet'

/** 컨텍스트 최대 길이(문자). 초과 시 앞부분 위주로 보존하고 잘라낸다. */
const MAX_CHARS = 40000

async function read(dir: string, rel: string): Promise<string> {
  try {
    return await fs.readFile(join(dir, rel), 'utf-8')
  } catch {
    return ''
  }
}

async function readCharacters(dir: string): Promise<string[]> {
  try {
    const cdir = join(dir, 'bible', 'characters')
    const files = (await fs.readdir(cdir)).filter((f) => f.endsWith('.md')).sort()
    const out: string[] = []
    for (const f of files) {
      const c = sheetToPlain(await read(dir, `bible/characters/${f}`)).trim()
      if (c) out.push(c)
    }
    return out
  } catch {
    return []
  }
}

interface OrderedScene {
  file: string
  title: string
}

/** 파일 경로로 씬(메타 포함)을 찾는다 */
async function findScene(dir: string, sceneFile: string): Promise<Scene | null> {
  const raw = await read(dir, 'project.json')
  if (!raw) return null
  try {
    const proj = JSON.parse(raw) as ProjectFile
    for (const ch of proj.chapters ?? []) {
      for (const sc of ch.scenes) if (sc.file === sceneFile) return sc
    }
  } catch {
    return null
  }
  return null
}

async function orderedScenes(dir: string): Promise<OrderedScene[]> {
  const raw = await read(dir, 'project.json')
  if (!raw) return []
  let proj: ProjectFile
  try {
    proj = JSON.parse(raw) as ProjectFile
  } catch {
    return []
  }
  const out: OrderedScene[] = []
  for (const ch of proj.chapters ?? []) {
    for (const sc of ch.scenes) out.push({ file: sc.file, title: `${ch.title} / ${sc.title}` })
  }
  return out
}

/**
 * 역할과 현재 씬을 기준으로 AI 작업 맥락(스토리 바이블 + 본문)을 조립한다.
 * - 모든 역할: 세계관/플롯/인물(스토리 바이블)
 * - drafter: 대상 씬 직전까지의 본문
 * - readerCritic: 대상 씬 본문
 * - consistency: 대상 씬까지의 본문
 */
export async function assembleContext(
  dir: string,
  role: AiRole,
  sceneFile?: string
): Promise<string> {
  const parts: string[] = []

  async function pushDoc(rel: string, heading: string): Promise<void> {
    const t = (await read(dir, rel)).trim()
    if (t) parts.push(`## ${heading}\n${t}`)
  }

  // 모든 역할: 세계관 + 플롯 + 인물 (설정 토대)
  await pushDoc('bible/world.md', '세계관')
  await pushDoc('bible/plot.md', '플롯')
  const chars = await readCharacters(dir)
  if (chars.length) parts.push(`## 인물\n${chars.join('\n\n')}`)

  // 캐논(불변 규칙)·복선 원장: 집필/검수/설계가 반드시 준수·관리
  if (role === 'drafter' || role === 'consistency' || role === 'architect') {
    await pushDoc('bible/canon.md', '캐논(불변 규칙 — 절대 위반 금지)')
    await pushDoc('bible/foreshadow.md', '복선 원장(심기·회수 정합 유지)')
  }
  // 작가 보이스: 집필 시 문체 일관성
  if (role === 'drafter') {
    await pushDoc('bible/voice.md', '작가 보이스·문체')
  }

  if (sceneFile && (role === 'drafter' || role === 'consistency' || role === 'readerCritic')) {
    const scenes = await orderedScenes(dir)
    const idx = scenes.findIndex((s) => s.file === sceneFile)

    async function collect(list: OrderedScene[]): Promise<string> {
      const texts: string[] = []
      for (const s of list) {
        const t = (await read(dir, s.file)).trim()
        if (t) texts.push(`### ${s.title}\n${t}`)
      }
      return texts.join('\n\n')
    }

    if (role === 'drafter') {
      const preceding = idx >= 0 ? scenes.slice(0, idx) : scenes
      const body = await collect(preceding)
      if (body) parts.push(`## 직전까지의 본문\n${body}`)
    } else if (role === 'readerCritic') {
      const target = idx >= 0 ? scenes[idx].file : sceneFile
      const t = (await read(dir, target)).trim()
      if (t) parts.push(`## 평가 대상 본문\n${t}`)
    } else {
      const upto = idx >= 0 ? scenes.slice(0, idx + 1) : scenes
      const body = await collect(upto)
      if (body) parts.push(`## 본문\n${body}`)
    }
  }

  // 이 회차 메타(설계 의도): 집필은 이를 향해 쓰고, 검수는 복선 정합을 본다
  if (sceneFile && (role === 'drafter' || role === 'consistency')) {
    const sc = await findScene(dir, sceneFile)
    if (sc) {
      const lines: string[] = []
      if (sc.synopsis) lines.push(`- 시놉시스: ${sc.synopsis}`)
      if (sc.cliffhanger) lines.push(`- 절단(클리프행어): ${sc.cliffhanger}`)
      if (sc.plant?.length) lines.push(`- 이 회차에 심을 복선: ${sc.plant.join(', ')}`)
      if (sc.payoff?.length) lines.push(`- 이 회차에서 회수할 복선: ${sc.payoff.join(', ')}`)
      if (lines.length) parts.push(`## 이 회차 메타(설계 의도)\n${lines.join('\n')}`)
    }
  }

  let ctx = parts.join('\n\n')
  if (ctx.length > MAX_CHARS) {
    ctx = ctx.slice(0, MAX_CHARS) + '\n\n…(컨텍스트가 길어 일부 생략됨)'
  }
  return ctx
}
