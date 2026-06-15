import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import type { Item, Link, Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { useLinks } from '../../lib/links'

/** 아이템 종류별 노드 색상 */
const NODE_COLORS: Record<string, string> = {
  document: '#5b8fd6',
  'sheet-character': '#5fae7a',
  'sheet-place': '#b07cc0',
  'sheet-item': '#c98a4a',
  'sheet-organization': '#d7b36a',
  'sheet-concept': '#6fb0b0',
  folder: '#7a7a86',
  plotboard: '#e0883a',
  canvas: '#cf6a6a'
}

function nodeType(item: Item): string {
  if (item.type === 'sheet') return `sheet-${item.sheet_subtype ?? 'character'}`
  return item.type
}

function buildElements(items: Item[], links: Link[]): ElementDefinition[] {
  const els: ElementDefinition[] = []
  const valid = new Set(items.map((i) => i.id))
  for (const it of items) {
    if (it.type === 'folder') continue // 폴더는 그래프에서 생략
    els.push({
      data: { id: it.id, label: it.title, type: nodeType(it), itemType: it.type }
    })
  }
  for (const l of links) {
    if (!valid.has(l.from_item) || !valid.has(l.to_item)) continue
    els.push({
      data: { id: `e:${l.id}`, source: l.from_item, target: l.to_item, rel: l.rel, label: l.label ?? '' }
    })
  }
  return els
}

function styles(): cytoscape.StylesheetCSS[] {
  const colorSelectors = Object.entries(NODE_COLORS).map(([type, color]) => ({
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
        'text-outline-color': '#0e0e11',
        'text-outline-width': 2
      }
    },
    ...colorSelectors,
    {
      selector: 'edge',
      css: {
        width: 1.5,
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.8,
        'line-color': '#555',
        'target-arrow-color': '#555'
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

interface Props {
  project: Project
  compact?: boolean
}

/** Cytoscape 관계 그래프 — 기존 GraphView 로직을 새 데이터 모델로 이식 */
export function RelationGraph({ project, compact }: Props): JSX.Element {
  const nav = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)
  const { data: items } = useItems(project.id)
  const { data: links } = useLinks(project.id)

  useEffect(() => {
    if (!containerRef.current || !items) return
    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(items, links ?? []),
      style: styles(),
      layout: { name: 'cose', animate: false, padding: 30 },
      wheelSensitivity: 0.2
    })
    cyRef.current = cy
    cy.on('tap', 'node', (evt) => nav(`/p/${project.id}/i/${evt.target.id()}`))
    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [items, links, project.id, nav])

  const hasNodes = (items ?? []).some((i) => i.type !== 'folder')

  return (
    <div className="relative h-full w-full">
      {!hasNodes && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-[320px] -translate-x-1/2 -translate-y-1/2 text-center text-sm text-text-muted">
          아직 노드가 없습니다. 문서·캐릭터를 만들고 링크로 연결하세요.
        </div>
      )}
      <div ref={containerRef} className={`h-full w-full ${compact ? '' : ''}`} />
    </div>
  )
}
