import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import { Filter, FileText, Layers, Columns3, Folder, SquareStack, StickyNote, Check } from 'lucide-react'
import type { BoardNode, Item, Link, Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { useLinks } from '../../lib/links'
import { useProjectBoardNodes } from '../../lib/boards'
import { useUi, GRAPH_CATEGORIES, type GraphCategory } from '../../store/ui'

/** 아이템 종류별 노드 색상 */
const NODE_COLORS: Record<string, string> = {
  document: '#5b8fd6',
  sheet: '#5fae7a', // 필터 메뉴 아이콘용(노드 타입은 sheet-* 사용)
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
  canvas: '#cf6a6a',
  'plot-card': '#d98c5f',
  'plot-part-card': '#c9a96a'
}

/** 필터 메뉴 항목별 아이콘 */
const CATEGORY_ICON: Record<GraphCategory, typeof FileText> = {
  document: FileText,
  sheet: Layers,
  plotboard: Columns3,
  folder: Folder,
  'plot-card': SquareStack,
  'plot-part-card': StickyNote
}

/** board 노드 그래프 id 접두사 (아이템 id 와 구분) */
const BN = 'bn:'

function nodeType(item: Item): string {
  if (item.type === 'sheet') return `sheet-${item.sheet_subtype ?? 'character'}`
  return item.type
}

/** 아이템 → 필터 카테고리 (노트는 문서로 취급) */
function itemCategory(it: Item): GraphCategory | null {
  switch (it.type) {
    case 'document':
    case 'notes':
      return 'document'
    case 'sheet':
      return 'sheet'
    case 'plotboard':
    case 'canvas':
      return 'plotboard'
    case 'folder':
      return 'folder'
    default:
      return null
  }
}

/** board 노드 → 필터 카테고리 (막=플롯 카드, 카드=플롯 파트 카드) */
function boardCategory(n: BoardNode): GraphCategory | null {
  if (n.kind === 'group') return 'plot-card'
  if (n.kind === 'card') return 'plot-part-card'
  return null
}

function buildElements(
  items: Item[],
  links: Link[],
  boardNodes: BoardNode[],
  filter: Record<GraphCategory, boolean>,
  focusId?: string
): ElementDefinition[] {
  // 카테고리 필터를 통과한 표시 대상
  const shownItems = new Set<string>()
  for (const it of items) {
    const cat = itemCategory(it)
    if (cat && filter[cat]) shownItems.add(it.id)
  }
  const shownBoard = new Set<string>()
  const boardNodeById = new Map(boardNodes.map((n) => [n.id, n]))
  for (const n of boardNodes) {
    const cat = boardCategory(n)
    if (cat && filter[cat]) shownBoard.add(n.id)
  }

  // focus 모드: 현재 아이템 + 직접 연결 이웃(아이템)으로 한정
  let focusItems: Set<string> | null = null
  if (focusId && shownItems.has(focusId)) {
    const ego = new Set<string>([focusId])
    for (const l of links) {
      if (l.from_item === focusId && shownItems.has(l.to_item)) ego.add(l.to_item)
      if (l.to_item === focusId && shownItems.has(l.from_item)) ego.add(l.from_item)
    }
    focusItems = ego
  }
  const itemVisible = (id: string): boolean =>
    shownItems.has(id) && (!focusItems || focusItems.has(id))
  const boardVisible = (n: BoardNode): boolean => {
    if (!shownBoard.has(n.id)) return false
    if (!focusItems) return true
    // focus 모드에선 focus 범위의 보드/항목과 연관된 카드만
    if (n.board_item_id && focusItems.has(n.board_item_id)) return true
    return [...(n.doc_ids ?? []), ...(n.mention_ids ?? [])].some((id) => focusItems!.has(id))
  }

  const edges: ElementDefinition[] = []
  const degree = new Map<string, number>()
  const addEdge = (id: string, source: string, target: string, rel: string, label = ''): void => {
    edges.push({ data: { id, source, target, rel, label } })
    degree.set(source, (degree.get(source) ?? 0) + 1)
    degree.set(target, (degree.get(target) ?? 0) + 1)
  }

  // 1) 아이템-아이템 링크
  for (const l of links) {
    if (!itemVisible(l.from_item) || !itemVisible(l.to_item)) continue
    addEdge(`e:${l.id}`, l.from_item, l.to_item, l.rel, l.label ?? '')
  }
  // 2) 플롯 카드/파트 카드 — 포함(컬럼·보드) + 참조(문서·언급) 엣지
  for (const n of boardNodes) {
    if (!boardVisible(n)) continue
    const gid = BN + n.id
    const col = n.col_id ? boardNodeById.get(n.col_id) : null
    if (col && shownBoard.has(col.id) && boardVisible(col)) {
      addEdge(`c:${n.id}`, BN + col.id, gid, 'contains')
    } else if (n.board_item_id && itemVisible(n.board_item_id)) {
      addEdge(`c:${n.id}`, n.board_item_id, gid, 'contains')
    }
    for (const tid of [...(n.doc_ids ?? []), ...(n.mention_ids ?? [])]) {
      if (itemVisible(tid)) addEdge(`m:${n.id}:${tid}`, gid, tid, 'ref')
    }
  }

  // 노드 생성 (degree 반영)
  const nodes: ElementDefinition[] = []
  for (const it of items) {
    if (!itemVisible(it.id)) continue
    nodes.push({
      data: {
        id: it.id,
        label: it.title,
        type: nodeType(it),
        itemType: it.type,
        degree: degree.get(it.id) ?? 0,
        focus: focusItems && it.id === focusId ? 1 : 0
      }
    })
  }
  for (const n of boardNodes) {
    if (!boardVisible(n)) continue
    const gid = BN + n.id
    nodes.push({
      data: {
        id: gid,
        label: n.title || (n.kind === 'group' ? '막' : '파트 카드'),
        type: n.kind === 'group' ? 'plot-card' : 'plot-part-card',
        itemType: 'board',
        boardItemId: n.board_item_id,
        degree: degree.get(gid) ?? 0,
        focus: 0
      }
    })
  }
  return [...nodes, ...edges]
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
    // 플롯 카드·파트 카드는 사각형으로 구분
    {
      selector: 'node[itemType = "board"]',
      css: { shape: 'round-rectangle' }
    },
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
    // 포함(보드→카드, 컬럼→파트 카드): 점선·옅게
    {
      selector: 'edge[rel = "contains"]',
      css: { 'line-color': c.edge, 'line-style': 'dotted', 'line-opacity': 0.5 }
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
  const { data: boardNodes } = useProjectBoardNodes(project.id)
  const theme = useUi((s) => s.theme)
  const graphFilter = useUi((s) => s.graphFilter)
  const toggleGraphCategory = useUi((s) => s.toggleGraphCategory)
  const setAllGraphCategories = useUi((s) => s.setAllGraphCategories)
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !items) return
    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(items, links ?? [], boardNodes ?? [], graphFilter, focusId),
      style: styles(readThemeColors()),
      // 레이아웃은 아래에서 라벨 크기를 반영해 수동 실행 (preset = 자동 배치 안 함)
      layout: { name: 'preset' },
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

    // 라벨이 겹치지 않도록: 레이아웃 동안 노드 크기를 라벨 폭만큼 부풀려
    // cose 의 겹침 회피(nodeOverlap)가 라벨 공간까지 확보하게 한 뒤, 끝나면 원래 크기로 복원.
    const labelBox = (label: string): { w: number; h: number } => {
      // 한글/혼합 라벨 폭 근사(글자당 ~9px), 16~280px 클램프 + 좌우 여백
      const w = Math.min(280, Math.max(16, (label?.length ?? 0) * 9))
      return { w: w + 20, h: 38 }
    }
    const inflateNodes = (): void =>
      cy.batch(() =>
        cy.nodes().forEach((n) => {
          const { w, h } = labelBox(n.data('label'))
          n.style({ width: w, height: h })
        })
      )
    const restoreNodes = (): void =>
      cy.batch(() =>
        cy.nodes().forEach((n) => {
          n.removeStyle('width height')
        })
      )

    cy.on('layoutstop', () => {
      restoreNodes()
      fitView()
    })
    cy.on('zoom', applyLabels)

    const runLayout = (): void => {
      inflateNodes()
      cy.layout({
        name: 'cose',
        animate: false,
        fit: false,
        padding: FIT_PADDING,
        // 라벨 포함 크기를 반영해 충분히 벌림 (겹침 회피↑·반발력↑·이상 길이↑)
        nodeOverlap: 24,
        nodeRepulsion: () => 16000,
        idealEdgeLength: () => 120,
        edgeElasticity: () => 70,
        gravity: 0.3,
        numIter: 3000,
        randomize: true,
        componentSpacing: 130
      }).run()
    }
    cy.ready(runLayout)

    // 컨테이너 크기가 0→실측으로 바뀌는 초기 레이스/리사이즈에 대응
    const ro = new ResizeObserver(() => {
      cy.resize()
      fitView()
    })
    ro.observe(containerRef.current)

    // 노드 클릭 → 해당 항목으로 이동 (플롯 카드는 소속 보드로)
    cy.on('tap', 'node', (evt) => {
      const d = evt.target.data()
      const target = d.itemType === 'board' ? d.boardItemId : evt.target.id()
      if (target) nav(`/p/${project.id}/i/${target}`)
    })

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
  }, [items, links, boardNodes, graphFilter, project.id, nav, theme, focusId])

  const hasNodes = (items ?? []).length > 0 || (boardNodes ?? []).length > 0

  return (
    <div className="relative h-full w-full bg-bg">
      {!hasNodes && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-[320px] -translate-x-1/2 -translate-y-1/2 text-center text-sm text-text-muted">
          아직 노드가 없습니다. 문서·캐릭터를 만들고 링크로 연결하세요.
        </div>
      )}

      {/* 분류 필터 — 전체 그래프 뷰에서만 */}
      {!compact && (
        <div className="absolute right-3 top-3 z-10">
          <button
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-2.5 py-1.5 text-xs text-text-muted shadow-[var(--shadow)] hover:text-text"
            onClick={() => setFilterOpen((o) => !o)}
            title="분류 필터"
          >
            <Filter size={13} /> 분류
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-52 rounded-app border border-border bg-bg-elev py-1.5 shadow-[var(--shadow)]">
                {GRAPH_CATEGORIES.map(({ key, label }) => {
                  const Icon = CATEGORY_ICON[key]
                  const on = graphFilter[key]
                  return (
                    <button
                      key={key}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-bg-hover"
                      onClick={() => toggleGraphCategory(key)}
                    >
                      <Check size={14} className={on ? 'text-text' : 'opacity-0'} />
                      <Icon size={15} className="text-text-muted" style={{ color: NODE_COLORS[key] }} />
                      <span className={`flex-1 ${on ? '' : 'text-text-faint'}`}>{label}</span>
                    </button>
                  )
                })}
                <div className="my-1 border-t border-border" />
                <button
                  className="w-full px-3 py-1.5 text-left text-sm text-text-muted hover:bg-bg-hover hover:text-text"
                  onClick={() => setAllGraphCategories(true)}
                >
                  모두 선택
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm text-text-muted hover:bg-bg-hover hover:text-text"
                  onClick={() => setAllGraphCategories(false)}
                >
                  선택 해제
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
