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
  'sheet-event': '#d97a7a',
  'sheet-place': '#b07cc0',
  'sheet-item': '#c98a4a',
  'sheet-organization': '#d7b36a',
  'sheet-worldview': '#6f9bd1',
  'sheet-concept': '#6fb0b0',
  'sheet-other': '#9aa0aa',
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
  const degree = new Map<string, number>()

  // 표시 대상 노드(폴더 제외) 집합
  const shown = new Set<string>()
  for (const it of items) {
    if (it.type === 'folder') continue
    shown.add(it.id)
  }

  // degree 집계 (양쪽 노드가 모두 표시 대상인 링크만)
  for (const l of links) {
    if (!shown.has(l.from_item) || !shown.has(l.to_item)) continue
    degree.set(l.from_item, (degree.get(l.from_item) ?? 0) + 1)
    degree.set(l.to_item, (degree.get(l.to_item) ?? 0) + 1)
  }

  for (const it of items) {
    if (it.type === 'folder') continue
    els.push({
      data: {
        id: it.id,
        label: it.title,
        type: nodeType(it),
        itemType: it.type,
        degree: degree.get(it.id) ?? 0
      }
    })
  }
  for (const l of links) {
    if (!valid.has(l.from_item) || !valid.has(l.to_item)) continue
    if (!shown.has(l.from_item) || !shown.has(l.to_item)) continue
    els.push({
      data: {
        id: `e:${l.id}`,
        source: l.from_item,
        target: l.to_item,
        rel: l.rel,
        label: l.label ?? ''
      }
    })
  }
  return els
}

function styles(): cytoscape.StylesheetCSS[] {
  const colorSelectors = Object.entries(NODE_COLORS).flatMap(([type, color]) => [
    {
      selector: `node[type = "${type}"]`,
      css: { 'background-color': color, 'border-color': color }
    }
  ])
  return [
    {
      selector: 'node',
      css: {
        label: 'data(label)',
        color: '#9aa0aa',
        // 연결 수에 비례해 노드 크기 가변 (옵시디언 방식)
        width: 'mapData(degree, 0, 12, 6, 34)',
        height: 'mapData(degree, 0, 12, 6, 34)',
        'background-color': '#7f8794',
        'border-width': 0,
        // 라벨은 노드 '아래'로 — 노드를 침범하지 않음
        'font-size': '5px',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 3,
        'text-wrap': 'ellipsis',
        'text-max-width': '70px',
        'min-zoomed-font-size': 7,
        'transition-property': 'opacity, background-color, border-width',
        'transition-duration': 0.15
      }
    },
    ...colorSelectors,
    {
      selector: 'edge',
      css: {
        width: 0.8,
        'curve-style': 'straight',
        'line-color': '#3a3d44',
        'line-opacity': 0.7,
        'transition-property': 'opacity, line-color',
        'transition-duration': 0.15
      }
    },
    {
      selector: 'edge[rel = "plant"]',
      css: { 'line-color': '#e0883a', 'line-style': 'dashed' }
    },
    {
      selector: 'edge[rel = "payoff"]',
      css: { 'line-color': '#5fae7a' }
    },
    // 호버 강조: 선택된 노드 + 이웃만 또렷하게
    {
      selector: 'node.faded',
      css: { opacity: 0.12 }
    },
    {
      selector: 'edge.faded',
      css: { 'line-opacity': 0.05 }
    },
    {
      selector: 'node.highlight',
      css: { 'border-width': 2, 'border-color': '#ffffff', color: '#f0f0f3' }
    },
    {
      selector: 'edge.highlight',
      css: { width: 1.5, 'line-opacity': 1 }
    }
  ]
}

interface Props {
  project: Project
  compact?: boolean
}

/** Cytoscape 관계 그래프 — 옵시디언/Neo4j 스타일 force-directed 뷰 */
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
      layout: {
        name: 'cose',
        animate: false,
        padding: 40,
        nodeRepulsion: () => 12000,
        idealEdgeLength: () => 70,
        edgeElasticity: () => 80,
        gravity: 0.3,
        numIter: 1500,
        randomize: true,
        componentSpacing: 90
      },
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 3
    })
    cyRef.current = cy

    cy.on('tap', 'node', (evt) => nav(`/p/${project.id}/i/${evt.target.id()}`))

    // 호버 → 이웃 강조, 나머지 흐리게
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target
      const neighborhood = node.closedNeighborhood()
      cy.elements().addClass('faded')
      neighborhood.removeClass('faded').addClass('highlight')
    })
    cy.on('mouseout', 'node', () => {
      cy.elements().removeClass('faded highlight')
    })

    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [items, links, project.id, nav])

  const hasNodes = (items ?? []).some((i) => i.type !== 'folder')

  return (
    <div className="relative h-full w-full bg-[#0e0e11]">
      {!hasNodes && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-[320px] -translate-x-1/2 -translate-y-1/2 text-center text-sm text-text-muted">
          아직 노드가 없습니다. 문서·캐릭터를 만들고 링크로 연결하세요.
        </div>
      )}
      <div ref={containerRef} className={`h-full w-full ${compact ? '' : ''}`} />
    </div>
  )
}
