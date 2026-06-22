import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import type { Item, Link, Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { useLinks } from '../../lib/links'
import { useUi } from '../../store/ui'

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

function buildElements(items: Item[], links: Link[], focusId?: string): ElementDefinition[] {
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

  // focus 모드: 현재 항목 + 직접 연결된 이웃만 (ego 그래프)
  const focused = !!focusId && shown.has(focusId)
  let inScope = shown
  if (focused) {
    const ego = new Set<string>([focusId!])
    for (const l of links) {
      if (l.from_item === focusId && shown.has(l.to_item)) ego.add(l.to_item)
      if (l.to_item === focusId && shown.has(l.from_item)) ego.add(l.from_item)
    }
    inScope = ego
  }

  for (const it of items) {
    if (!inScope.has(it.id)) continue
    els.push({
      data: {
        id: it.id,
        label: it.title,
        type: nodeType(it),
        itemType: it.type,
        degree: degree.get(it.id) ?? 0,
        focus: focused && it.id === focusId ? 1 : 0
      }
    })
  }
  for (const l of links) {
    if (!valid.has(l.from_item) || !valid.has(l.to_item)) continue
    if (!inScope.has(l.from_item) || !inScope.has(l.to_item)) continue
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

/** 현재 테마의 CSS 변수 값을 읽는다 (그래프는 캔버스라 CSS 상속이 안 돼 직접 주입) */
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

interface ThemeColors {
  label: string
  outline: string
  edge: string
  highlight: string
  nodeBase: string
}

function readThemeColors(): ThemeColors {
  return {
    label: cssVar('--text-muted', '#9a9aa4'),
    outline: cssVar('--bg', '#0e0e11'),
    edge: cssVar('--border-strong', '#34343d'),
    highlight: cssVar('--text', '#e7e7ea'),
    nodeBase: cssVar('--text-faint', '#6b6b74')
  }
}

function styles(c: ThemeColors): cytoscape.StylesheetCSS[] {
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
        color: c.label,
        // 연결 수에 비례해 노드 크기 가변 (옵시디언 방식)
        width: 'mapData(degree, 0, 12, 12, 40)',
        height: 'mapData(degree, 0, 12, 12, 40)',
        'background-color': c.nodeBase,
        'border-width': 0,
        // 라벨은 노드 '아래' + 테마 배경색 외곽선으로 가독성 확보
        'font-size': '11px',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        'text-wrap': 'ellipsis',
        'text-max-width': '280px',
        'text-outline-color': c.outline,
        'text-outline-width': 2,
        'transition-property': 'opacity, background-color, border-width',
        'transition-duration': 0.15
      }
    },
    ...colorSelectors,
    // 현재 문서(focus) 노드 강조
    {
      selector: 'node[focus = 1]',
      css: { 'border-width': 3, 'border-color': c.highlight, width: 30, height: 30 }
    },
    {
      selector: 'edge',
      css: {
        width: 1,
        'curve-style': 'straight',
        'line-color': c.edge,
        'line-opacity': 0.8,
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
    // 상하관계(트리 계층): 상위→하위 방향 화살표
    {
      selector: 'edge[rel = "parent"]',
      css: {
        'line-color': c.highlight,
        width: 1.5,
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': c.highlight,
        'arrow-scale': 0.8
      }
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
      css: { 'border-width': 2, 'border-color': c.highlight, color: c.highlight }
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
  /** 지정 시 해당 항목 + 직접 연결된 이웃만(ego 그래프) 표시·강조 */
  focusId?: string
}

/** Cytoscape 관계 그래프 — 옵시디언/Neo4j 스타일 force-directed 뷰 */
export function RelationGraph({ project, compact, focusId }: Props): JSX.Element {
  const nav = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)
  const { data: items } = useItems(project.id)
  const { data: links } = useLinks(project.id)
  const theme = useUi((s) => s.theme)

  useEffect(() => {
    if (!containerRef.current || !items) return
    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(items, links ?? [], focusId),
      style: styles(readThemeColors()),
      layout: {
        name: 'cose',
        animate: false,
        fit: true,
        padding: 40,
        // 노드를 현재 영역에 알맞게 모으도록: 반발력↓·중력↑·이상 길이↓
        nodeRepulsion: () => 9000,
        idealEdgeLength: () => 80,
        edgeElasticity: () => 80,
        gravity: 0.55,
        numIter: 2500,
        randomize: true,
        componentSpacing: 90
      },
      wheelSensitivity: 0.5,
      minZoom: 0.1,
      maxZoom: 3
    })
    cyRef.current = cy

    const FIT_PADDING = 40
    // 첫 화면 줌 범위: 너무 확대(라벨이 과도하게 큼)도, 너무 축소(라벨이 숨겨짐)도 방지.
    //  - 상한: 작은 그래프가 과확대되는 것 방지
    //  - 하한: 큰 그래프도 글씨가 보일 만큼은 확대된 상태로 시작 (hideBelow 위)
    const INIT_MAX_ZOOM = 1.0
    const INIT_MIN_ZOOM = 0.6

    // 라벨 크기를 줌에 '역방향'으로: 화면상 px = K/zoom (clamp).
    //  - 확대(zoom↑) → 화면 텍스트 작아짐(너무 커지지 않음)
    //  - 축소(zoom↓) → 화면 텍스트 커지다가, 임계점(겹침) 아래에선 숨김
    const LABEL = { k: 11, minPx: 7, maxPx: 15, hideBelow: 0.4 }
    const applyLabels = (): void => {
      const z = cy.zoom()
      const screenPx = Math.min(LABEL.maxPx, Math.max(LABEL.minPx, LABEL.k / z))
      cy.batch(() => {
        cy.nodes().style({
          'font-size': screenPx / z,
          'text-opacity': z < LABEL.hideBelow ? 0 : 1
        })
      })
    }

    // 뷰포트 중앙에 맞추되 초기 줌을 [MIN, MAX]로 clamp → 첫 화면 가독성 확보.
    //  - 상한 초과(작은 그래프) → 줄여서 과확대 방지
    //  - 하한 미만(큰 그래프)   → 키워서 글씨가 보이게 (영역을 다 못 담더라도 가독성 우선)
    const fitView = (): void => {
      cy.fit(undefined, FIT_PADDING)
      const z = cy.zoom()
      const clamped = Math.min(INIT_MAX_ZOOM, Math.max(INIT_MIN_ZOOM, z))
      if (clamped !== z) {
        cy.zoom(clamped)
        cy.center()
      }
      applyLabels()
    }

    cy.on('layoutstop', fitView)
    cy.on('zoom', applyLabels)
    cy.ready(fitView)

    // 컨테이너 크기가 0→실측으로 바뀌는 초기 레이스/리사이즈에 대응
    const ro = new ResizeObserver(() => {
      cy.resize()
      fitView()
    })
    ro.observe(containerRef.current)

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
      ro.disconnect()
      cy.destroy()
      cyRef.current = null
    }
  }, [items, links, project.id, nav, theme, focusId])

  const hasNodes = (items ?? []).some((i) => i.type !== 'folder')

  return (
    <div className="relative h-full w-full bg-bg">
      {!hasNodes && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-[320px] -translate-x-1/2 -translate-y-1/2 text-center text-sm text-text-muted">
          아직 노드가 없습니다. 문서·캐릭터를 만들고 링크로 연결하세요.
        </div>
      )}
      <div ref={containerRef} className={`h-full w-full ${compact ? '' : ''}`} />
    </div>
  )
}
