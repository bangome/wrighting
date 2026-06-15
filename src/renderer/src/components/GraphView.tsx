import { useEffect, useRef, useState } from 'react'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import type { Project, BibleEntry } from '@shared/types'
import type { Selection } from '../selection'

interface Props {
  dir: string
  project: Project
  onOpen: (sel: Selection) => void
  onClose: () => void
}

type Category = 'scene' | 'doc' | 'foreshadow'

/** project(연결·복선) + 바이블에서 그래프 요소를 파생 */
function buildElements(project: Project, bible: BibleEntry[]): ElementDefinition[] {
  const els: ElementDefinition[] = []
  const sceneByFile = new Map<string, string>()
  const docByFile = new Map<string, string>()

  for (const ch of project.chapters) {
    for (const sc of ch.scenes) {
      const id = `scene:${sc.id}`
      sceneByFile.set(sc.file, id)
      els.push({
        data: { id, label: sc.title, type: 'scene', cat: 'scene', file: sc.file, sceneId: sc.id }
      })
    }
  }

  for (const b of bible) {
    const id = `doc:${b.file}`
    docByFile.set(b.file, id)
    els.push({
      data: { id, label: b.title, type: `doc-${b.group}`, cat: 'doc', file: b.file, title: b.title }
    })
  }

  // 복선 노드(씬 plant/payoff에서 파생) + 미회수 판정
  const planted = new Set<string>()
  const paidoff = new Set<string>()
  for (const ch of project.chapters) {
    for (const sc of ch.scenes) {
      for (const f of sc.plant ?? []) planted.add(f)
      for (const f of sc.payoff ?? []) paidoff.add(f)
    }
  }
  for (const fid of new Set([...planted, ...paidoff])) {
    const unresolved = planted.has(fid) && !paidoff.has(fid)
    els.push({
      data: { id: `fs:${fid}`, label: fid, type: 'foreshadow', cat: 'foreshadow' },
      classes: unresolved ? 'unresolved' : ''
    })
  }

  // 엣지: 명시적 연결
  const nodeForPath = (p: string): string | null => sceneByFile.get(p) ?? docByFile.get(p) ?? null
  for (const c of project.connections ?? []) {
    const s = nodeForPath(c.from)
    const t = nodeForPath(c.to)
    if (s && t) els.push({ data: { id: `c:${c.id}`, source: s, target: t, rel: 'connection' } })
  }

  // 엣지: 복선 심기/회수
  for (const ch of project.chapters) {
    for (const sc of ch.scenes) {
      const s = `scene:${sc.id}`
      for (const fid of new Set(sc.plant ?? []))
        els.push({ data: { id: `p:${sc.id}:${fid}`, source: s, target: `fs:${fid}`, rel: 'plant' } })
      for (const fid of new Set(sc.payoff ?? []))
        els.push({ data: { id: `r:${sc.id}:${fid}`, source: s, target: `fs:${fid}`, rel: 'payoff' } })
    }
  }

  return els
}

const NODE_COLORS: Record<string, string> = {
  scene: '#5b8fd6',
  'doc-character': '#5fae7a',
  'doc-world': '#b07cc0',
  'doc-plot': '#c98a4a',
  'doc-foreshadow': '#d7b36a',
  'doc-canon': '#cf6a6a',
  'doc-voice': '#6fb0b0',
  'doc-memory': '#caa14a',
  foreshadow: '#e0883a'
}

function styles(): cytoscape.StylesheetCSS[] {
  const nodeColorSelectors = Object.entries(NODE_COLORS).map(([type, color]) => ({
    selector: `node[type = "${type}"]`,
    css: { 'background-color': color }
  }))
  return [
    {
      selector: 'node',
      css: {
        label: 'data(label)',
        color: '#e6e6e6',
        'font-size': '10px',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'ellipsis',
        'text-max-width': '90px',
        width: 18,
        height: 18,
        'background-color': '#888',
        'text-outline-color': '#1e1e22',
        'text-outline-width': 2
      }
    },
    ...nodeColorSelectors,
    {
      selector: 'node[cat = "foreshadow"]',
      css: { shape: 'diamond', width: 22, height: 22 }
    },
    {
      selector: 'node.unresolved',
      css: { 'border-width': 3, 'border-color': '#ff5d5d' }
    },
    {
      selector: 'edge',
      css: {
        width: 1.5,
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.8,
        'line-color': '#666',
        'target-arrow-color': '#666'
      }
    },
    {
      selector: 'edge[rel = "plant"]',
      css: { 'line-color': '#e0883a', 'target-arrow-color': '#e0883a', 'line-style': 'dashed' }
    },
    {
      selector: 'edge[rel = "payoff"]',
      css: { 'line-color': '#5fae7a', 'target-arrow-color': '#5fae7a' }
    }
  ]
}

export function GraphView({ dir, project, onOpen, onClose }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)
  const [bible, setBible] = useState<BibleEntry[] | null>(null)
  const [hidden, setHidden] = useState<Set<Category>>(new Set())
  const [count, setCount] = useState({ nodes: 0, edges: 0 })

  useEffect(() => {
    void window.api.listBible(dir).then(setBible)
  }, [dir])

  useEffect(() => {
    if (!bible || !containerRef.current) return
    const elements = buildElements(project, bible)
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: styles(),
      layout: { name: 'cose', animate: false, padding: 40 },
      wheelSensitivity: 0.2
    })
    cyRef.current = cy
    setCount({ nodes: cy.nodes().length, edges: cy.edges().length })

    cy.on('tap', 'node', (evt) => {
      const d = evt.target.data()
      if (d.type === 'scene') onOpen({ kind: 'scene', id: d.sceneId, file: d.file, title: d.label })
      else if (typeof d.type === 'string' && d.type.startsWith('doc-'))
        onOpen({ kind: 'doc', file: d.file, title: d.title })
      else if (d.type === 'foreshadow')
        onOpen({ kind: 'doc', file: 'bible/foreshadow.md', title: '복선 원장' })
    })

    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [bible, project, onOpen])

  // 카테고리 필터 적용
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.batch(() => {
      for (const cat of ['scene', 'doc', 'foreshadow'] as Category[]) {
        cy.nodes(`[cat = "${cat}"]`).style('display', hidden.has(cat) ? 'none' : 'element')
      }
    })
  }, [hidden, count])

  function toggle(cat: Category): void {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function relayout(): void {
    cyRef.current?.layout({ name: 'cose', animate: true, padding: 40 }).run()
  }

  return (
    <div className="graph-view">
      <header className="graph-toolbar">
        <button className="icon-btn" onClick={onClose}>
          ← 작업실
        </button>
        <span className="graph-title">관계 그래프</span>
        <span className="muted">
          노드 {count.nodes} · 엣지 {count.edges}
        </span>
        <div className="graph-filters">
          <button className={`chip${hidden.has('scene') ? ' off' : ''}`} onClick={() => toggle('scene')}>
            원고
          </button>
          <button className={`chip${hidden.has('doc') ? ' off' : ''}`} onClick={() => toggle('doc')}>
            자료
          </button>
          <button
            className={`chip${hidden.has('foreshadow') ? ' off' : ''}`}
            onClick={() => toggle('foreshadow')}
          >
            복선
          </button>
        </div>
        <button className="icon-btn" onClick={relayout}>
          재배치
        </button>
      </header>
      <div className="graph-legend">
        <span><i className="dot" style={{ background: '#5b8fd6' }} /> 씬</span>
        <span><i className="dot" style={{ background: '#5fae7a' }} /> 인물</span>
        <span><i className="dot diamond" style={{ background: '#e0883a' }} /> 복선</span>
        <span><i className="dot ring" /> 미회수 복선</span>
        <span><i className="line dash" /> 심기</span>
        <span><i className="line" style={{ background: '#5fae7a' }} /> 회수</span>
      </div>
      {count.nodes === 0 && bible && (
        <div className="graph-empty">
          아직 노드가 없습니다. 씬·자료를 만들고 연결하거나, 씬 메타에 복선(plant/payoff)을 입력하세요.
        </div>
      )}
      <div ref={containerRef} className="graph-canvas" />
    </div>
  )
}
