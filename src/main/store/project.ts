import { promises as fs } from 'fs'
import { join, basename, dirname } from 'path'
import { randomUUID } from 'crypto'
import { type IpcMain, type Dialog } from 'electron'
import { IPC } from '@shared/ipc'
import type { Project, ProjectFile, BibleEntry, SceneMeta, SheetProfile, SheetData } from '@shared/types'
import { parseSheet, serializeSheet } from './sheet'

const PROJECT_FILE = 'project.json'

function genId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`
}

async function readProject(dir: string): Promise<Project> {
  const raw = await fs.readFile(join(dir, PROJECT_FILE), 'utf-8')
  const data = JSON.parse(raw) as ProjectFile
  return { ...data, dir }
}

async function writeProject(project: Project): Promise<Project> {
  project.updatedAt = new Date().toISOString()
  const { dir, ...rest } = project
  await fs.writeFile(join(dir, PROJECT_FILE), JSON.stringify(rest, null, 2), 'utf-8')
  return project
}

/** 새 프로젝트 폴더 구조를 만든다 (Scrivener식 .novelproj 폴더) */
async function scaffoldProject(dir: string): Promise<Project> {
  await fs.mkdir(join(dir, 'manuscript'), { recursive: true })
  await fs.mkdir(join(dir, 'bible', 'characters'), { recursive: true })

  const now = new Date().toISOString()
  const project: Project = {
    dir,
    title: basename(dir).replace(/\.novelproj$/, ''),
    createdAt: now,
    updatedAt: now,
    chapters: []
  }
  await writeProject(project)
  await fs.writeFile(
    join(dir, 'CLAUDE.md'),
    '# 작품 메모리\n\n이 작품의 톤, 금지사항, 핵심 설정을 여기에 기록합니다.\nAI 호출 시 일관되게 참고됩니다.\n',
    'utf-8'
  )
  for (const [file, content] of Object.entries(BIBLE_TEMPLATES)) {
    await fs.writeFile(join(dir, 'bible', file), content, 'utf-8')
  }
  return project
}

/** 검증된 집필 워크플로(rubycarrier 패턴)를 일반화한 바이블 문서 템플릿 */
const BIBLE_TEMPLATES: Record<string, string> = {
  'world.md':
    '# 세계관 · 설정\n\n' +
    '## 1. 작품 정체성\n- 로그라인:\n- 톤·분위기:\n- 장르 좌표:\n- 핵심 주제:\n\n' +
    '## 2. 세력 · 조직\n- (조직/집단): 정체 / 구조 / 목적 / 규율\n\n' +
    '## 3. 규칙 · 시스템\n- 이 세계의 핵심 규칙(능력·기술·마법 등)과 한계\n\n' +
    '## 4. 무대 (장소)\n- (장소): 질감 / 여기서 벌어지는 일 / 등장 이유\n\n' +
    '## 5. 보완 / 고증 필요 항목\n',
  'plot.md':
    '# 플롯 · 구성\n\n' +
    '## 1. 로그라인 & 전체 아크\n\n' +
    '## 2. 부(Part)/막 분해\n\n' +
    '## 3. 사건·작전 아크 목록\n\n' +
    '## 4. 회차별 시놉시스 (요약)\n' +
    '| 회차 | 제목 | 한 줄 시놉 | 심는 복선 | 회수 복선 |\n' +
    '|------|------|-----------|-----------|-----------|\n',
  'foreshadow.md':
    '# 떡밥 · 복선 원장\n\n' +
    '회차마다 조금씩 흘리고 정해진 시점에 회수한다. ID로 설계·집필·검수가 공유한다.\n' +
    'ID 규칙: M=핵심 미스터리 · F=시각/모티프 복선 · I/J=인물·관계 복선 · R=고증 · Q=명대사. 상태: 미공개/암시중/회수됨.\n\n' +
    '| ID | 떡밥 내용 | 공개 시점(권장) | 회수 방식 | 상태 |\n' +
    '|----|-----------|----------------|-----------|------|\n' +
    '| M-01 |  |  |  | 미공개 |\n\n' +
    '> 운용 원칙: 한 회차에 ‘작은 답’ 하나 + ‘새 질문’ 하나. 큰 떡밥은 부(部) 경계에서만 움직인다.\n',
  'canon.md':
    '# 캐논 · 불변 규칙\n\n' +
    '집필·검수 중 절대 어겨선 안 되는 규칙. 일관성 검수는 여기 위반을 ‘치명’으로 본다.\n\n' +
    '## 능력 / 시스템 규칙 (천장)\n- 핵심 능력이 할 수 있는 것 / 할 수 없는 것(상한):\n\n' +
    '## fair-play 원칙\n- 독자에게 공개된 단서만으로 반전이 성립해야 한다(추리·반전물).\n\n' +
    '## 표기 · 시점 고정값\n- 시점:\n- 화자:\n- 절대 바뀌면 안 되는 설정:\n',
  'voice.md':
    '# 작가 보이스 · 문체\n\n' +
    '집필(drafter)·윤문이 일관된 필체를 유지하도록 참조.\n\n' +
    '## 손버릇 (시그니처 — 아껴 쓸 것)\n\n' +
    '## 절대 피하는 것 (클리셰·AI티)\n- (예) “그땐 몰랐다” 회고형 예고, 과한 미사여구\n\n' +
    '## 표기 규칙\n- (예) 본문 마크다운 서식 금지 / 장면 전환 기호 / 대사·메시지 표기\n\n' +
    '## 과용어 워치리스트\n- 집필하며 반복되는 어휘를 기록해 솎아낸다\n'
}

/** 스토리 바이블 + 메모리 문서 목록을 디스크에서 구성 */
async function listBible(dir: string): Promise<BibleEntry[]> {
  const entries: BibleEntry[] = []

  async function addIfExists(file: string, title: string, group: BibleEntry['group']): Promise<void> {
    try {
      await fs.access(join(dir, file))
      entries.push({ file, title, group })
    } catch {
      // 파일 없으면 건너뜀
    }
  }

  await addIfExists('CLAUDE.md', '작품 메모리', 'memory')
  await addIfExists('bible/world.md', '세계관', 'world')
  await addIfExists('bible/plot.md', '플롯', 'plot')
  await addIfExists('bible/foreshadow.md', '복선 원장', 'foreshadow')
  await addIfExists('bible/canon.md', '캐논(불변 규칙)', 'canon')
  await addIfExists('bible/voice.md', '작가 보이스', 'voice')

  try {
    const charDir = join(dir, 'bible', 'characters')
    const files = (await fs.readdir(charDir)).filter((f) => f.endsWith('.md')).sort()
    for (const f of files) {
      entries.push({
        file: `bible/characters/${f}`,
        title: f.replace(/\.md$/, ''),
        group: 'character'
      })
    }
  } catch {
    // characters 디렉토리 없으면 건너뜀
  }

  return entries
}

/** 인물 카드(.md)를 새로 만든다 (이미 있으면 유지) */
async function addCharacter(dir: string, name: string): Promise<BibleEntry[]> {
  const clean = (name || '새 인물').trim()
  const slug = clean.replace(/[\\/:*?"<>|]/g, '_')
  const file = join(dir, 'bible', 'characters', `${slug}.md`)
  await fs.mkdir(dirname(file), { recursive: true })
  try {
    await fs.access(file)
  } catch {
    const profile: SheetProfile = {
      type: 'character',
      attributes: {
        코드명: '',
        역할: '',
        '성격/말투': '',
        '목표/동기': '',
        '두려움/결함': '',
        관계: '',
        '비밀/반전': ''
      },
      tags: []
    }
    await fs.writeFile(file, serializeSheet(profile, `# ${clean}\n\n- 회차별 변화 로그:\n`), 'utf-8')
  }
  return listBible(dir)
}

export function registerProjectHandlers(ipc: IpcMain, dialog: Dialog): void {
  ipc.handle(IPC.ProjectCreate, async (): Promise<Project | null> => {
    const res = await dialog.showSaveDialog({
      title: '새 소설 프로젝트',
      defaultPath: 'MyNovel.novelproj',
      buttonLabel: '생성'
    })
    if (res.canceled || !res.filePath) return null
    const dir = res.filePath.endsWith('.novelproj') ? res.filePath : `${res.filePath}.novelproj`
    await fs.mkdir(dir, { recursive: true })
    return scaffoldProject(dir)
  })

  ipc.handle(IPC.ProjectOpen, async (): Promise<Project | null> => {
    const res = await dialog.showOpenDialog({
      title: '소설 프로젝트 열기',
      properties: ['openDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) return null
    return readProject(res.filePaths[0])
  })

  ipc.handle(IPC.ProjectLoad, async (_e, dir: string): Promise<Project> => readProject(dir))

  ipc.handle(IPC.ChapterAdd, async (_e, dir: string, title: string): Promise<Project> => {
    const project = await readProject(dir)
    project.chapters.push({ id: genId('ch'), title: title || `${project.chapters.length + 1}장`, scenes: [] })
    return writeProject(project)
  })

  ipc.handle(
    IPC.SceneAdd,
    async (_e, dir: string, chapterId: string, title: string): Promise<Project> => {
      const project = await readProject(dir)
      const chapter = project.chapters.find((c) => c.id === chapterId)
      if (!chapter) throw new Error(`챕터를 찾을 수 없습니다: ${chapterId}`)
      const sceneId = genId('sc')
      const file = `manuscript/${chapterId}/${sceneId}.md`
      const abs = join(dir, file)
      await fs.mkdir(dirname(abs), { recursive: true })
      await fs.writeFile(abs, '', 'utf-8')
      chapter.scenes.push({ id: sceneId, title: title || `씬 ${chapter.scenes.length + 1}`, file })
      return writeProject(project)
    }
  )

  ipc.handle(IPC.SceneRead, async (_e, dir: string, file: string): Promise<string> => {
    try {
      return await fs.readFile(join(dir, file), 'utf-8')
    } catch {
      return ''
    }
  })

  ipc.handle(
    IPC.SceneWrite,
    async (_e, dir: string, file: string, content: string): Promise<void> => {
      const abs = join(dir, file)
      await fs.mkdir(dirname(abs), { recursive: true })
      await fs.writeFile(abs, content, 'utf-8')
    }
  )

  ipc.handle(IPC.BibleList, async (_e, dir: string): Promise<BibleEntry[]> => listBible(dir))

  ipc.handle(
    IPC.CharacterAdd,
    async (_e, dir: string, name: string): Promise<BibleEntry[]> => addCharacter(dir, name)
  )

  ipc.handle(
    IPC.SceneMetaUpdate,
    async (_e, dir: string, sceneId: string, meta: SceneMeta): Promise<Project> => {
      const project = await readProject(dir)
      const scene = project.chapters.flatMap((c) => c.scenes).find((s) => s.id === sceneId)
      if (!scene) throw new Error(`씬을 찾을 수 없습니다: ${sceneId}`)
      scene.synopsis = meta.synopsis
      scene.cliffhanger = meta.cliffhanger
      scene.plant = meta.plant
      scene.payoff = meta.payoff
      return writeProject(project)
    }
  )

  ipc.handle(
    IPC.ConnectionAdd,
    async (_e, dir: string, from: string, to: string, label?: string): Promise<Project> => {
      const project = await readProject(dir)
      const connections = project.connections ?? []
      // 동일 from→to 중복 방지
      if (!connections.some((c) => c.from === from && c.to === to)) {
        connections.push({ id: genId('cn'), from, to, label })
      }
      project.connections = connections
      return writeProject(project)
    }
  )

  ipc.handle(IPC.ConnectionRemove, async (_e, dir: string, id: string): Promise<Project> => {
    const project = await readProject(dir)
    project.connections = (project.connections ?? []).filter((c) => c.id !== id)
    return writeProject(project)
  })

  ipc.handle(IPC.ManuscriptExport, async (_e, dir: string): Promise<string | null> => {
    const project = await readProject(dir)
    const res = await dialog.showSaveDialog({
      title: '원고 내보내기',
      defaultPath: `${project.title}.txt`,
      filters: [
        { name: '텍스트', extensions: ['txt'] },
        { name: '마크다운', extensions: ['md'] }
      ]
    })
    if (res.canceled || !res.filePath) return null

    const asMd = res.filePath.toLowerCase().endsWith('.md')
    const parts: string[] = []
    for (const chapter of project.chapters) {
      parts.push(asMd ? `# ${chapter.title}` : `■ ${chapter.title}`)
      for (const scene of chapter.scenes) {
        const body = await fs.readFile(join(dir, scene.file), 'utf-8').catch(() => '')
        parts.push(asMd ? `## ${scene.title}\n\n${body}` : `${scene.title}\n\n${body}`)
      }
    }
    await fs.writeFile(res.filePath, parts.join('\n\n').trimEnd() + '\n', 'utf-8')
    return res.filePath
  })

  ipc.handle(IPC.SheetRead, async (_e, dir: string, file: string): Promise<SheetData> => {
    try {
      return parseSheet(await fs.readFile(join(dir, file), 'utf-8'))
    } catch {
      return { profile: { type: 'character', attributes: {}, tags: [] }, body: '' }
    }
  })

  ipc.handle(
    IPC.SheetWrite,
    async (_e, dir: string, file: string, profile: SheetProfile, body: string): Promise<void> => {
      const abs = join(dir, file)
      await fs.mkdir(dirname(abs), { recursive: true })
      await fs.writeFile(abs, serializeSheet(profile, body), 'utf-8')
    }
  )
}
