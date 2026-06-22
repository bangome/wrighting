import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'

interface HarnessAgentFile {
  name: string
  description: string
  model: string | null
  body: string
}
interface HarnessSkillFile {
  name: string
  description: string
  body: string
}
interface HarnessBundle {
  agents: HarnessAgentFile[]
  skills: HarnessSkillFile[]
  claudeMd: string | null
}

// ── frontmatter 파싱/직렬화 (외부 yaml 의존성 없이 최소 구현) ──────────
function parseFrontmatter(raw: string): { attrs: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!m) return { attrs: {}, body: raw.trim() }
  const attrs: Record<string, string> = {}
  const lines = m[1].split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const km = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i])
    if (!km) {
      i++
      continue
    }
    const key = km[1]
    let val = km[2]
    if (val === '>' || val === '|' || val === '>-' || val === '|-') {
      const folded = val[0] === '>'
      const collected: string[] = []
      i++
      while (i < lines.length && (lines[i].trim() === '' || /^\s+\S/.test(lines[i]))) {
        collected.push(lines[i].replace(/^\s{1,4}/, ''))
        i++
      }
      val = folded
        ? collected.join(' ').replace(/\s+/g, ' ').trim()
        : collected.join('\n').trim()
    } else {
      val = val.replace(/^["']|["']$/g, '').trim()
      i++
    }
    attrs[key] = val
  }
  return { attrs, body: m[2].trim() }
}

function yamlValue(s: string): string {
  if (!s) return "''"
  if (s.includes('\n')) return '|\n' + s.split('\n').map((l) => '  ' + l).join('\n')
  if (/[:#"']/.test(s)) return JSON.stringify(s)
  return s
}

function serializeAgent(a: HarnessAgentFile): string {
  let fm = `---\nname: ${a.name}\ndescription: ${yamlValue(a.description)}\n`
  if (a.model) fm += `model: ${a.model}\n`
  fm += '---\n\n'
  return fm + (a.body?.trim() ?? '') + '\n'
}

function serializeSkill(s: HarnessSkillFile): string {
  const fm = `---\nname: ${s.name}\ndescription: ${yamlValue(s.description)}\n---\n\n`
  return fm + (s.body?.trim() ?? '') + '\n'
}

async function readHarness(dir: string): Promise<HarnessBundle> {
  const agents: HarnessAgentFile[] = []
  const skills: HarnessSkillFile[] = []

  const agentsDir = join(dir, '.claude', 'agents')
  try {
    for (const f of await fs.readdir(agentsDir)) {
      if (!f.endsWith('.md')) continue
      const raw = await fs.readFile(join(agentsDir, f), 'utf-8')
      const { attrs, body } = parseFrontmatter(raw)
      agents.push({
        name: attrs.name || f.replace(/\.md$/, ''),
        description: attrs.description ?? '',
        model: attrs.model || null,
        body
      })
    }
  } catch {
    /* agents 디렉터리 없음 — 무시 */
  }

  const skillsDir = join(dir, '.claude', 'skills')
  try {
    for (const entry of await fs.readdir(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      try {
        const raw = await fs.readFile(join(skillsDir, entry.name, 'SKILL.md'), 'utf-8')
        const { attrs, body } = parseFrontmatter(raw)
        skills.push({ name: attrs.name || entry.name, description: attrs.description ?? '', body })
      } catch {
        /* SKILL.md 없음 — 건너뜀 */
      }
    }
  } catch {
    /* skills 디렉터리 없음 — 무시 */
  }

  let claudeMd: string | null = null
  try {
    claudeMd = await fs.readFile(join(dir, 'CLAUDE.md'), 'utf-8')
  } catch {
    /* CLAUDE.md 없음 — null */
  }

  return { agents, skills, claudeMd }
}

async function writeHarness(dir: string, bundle: HarnessBundle): Promise<{ agents: number; skills: number }> {
  const agentsDir = join(dir, '.claude', 'agents')
  await fs.mkdir(agentsDir, { recursive: true })
  for (const a of bundle.agents) {
    await fs.writeFile(join(agentsDir, `${a.name}.md`), serializeAgent(a), 'utf-8')
  }
  for (const s of bundle.skills) {
    const sd = join(dir, '.claude', 'skills', s.name)
    await fs.mkdir(sd, { recursive: true })
    await fs.writeFile(join(sd, 'SKILL.md'), serializeSkill(s), 'utf-8')
  }
  if (bundle.claudeMd != null) {
    await fs.writeFile(join(dir, 'CLAUDE.md'), bundle.claudeMd.trim() + '\n', 'utf-8')
  }
  return { agents: bundle.agents.length, skills: bundle.skills.length }
}

/**
 * Electron 얇은 셸 — 웹 SPA(renderer)를 로드한다.
 * 데이터·인증·동기화는 Supabase(웹 코드)에서 처리한다.
 * 단, Claude Code 하네스(.claude/agents·skills) 파일 입출력만 IPC로 제공한다.
 */
function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    show: false,
    title: 'wrighting',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0e0e11',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => win.show())

  // 외부 링크는 기본 브라우저로
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // ── 하네스 파일 입출력 IPC ──────────────────────────────────────────
  ipcMain.handle('harness:pickDir', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender) ?? undefined
    const r = await dialog.showOpenDialog(win!, {
      title: '작품 폴더 선택 (.claude 하네스 위치)',
      properties: ['openDirectory', 'createDirectory']
    })
    return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0]
  })
  ipcMain.handle('harness:read', (_e, dir: string) => readHarness(dir))
  ipcMain.handle('harness:write', (_e, dir: string, bundle: HarnessBundle) =>
    writeHarness(dir, bundle)
  )

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
