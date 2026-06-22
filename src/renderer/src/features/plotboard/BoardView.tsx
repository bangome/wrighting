import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes
} from '@xyflow/react'
import type { Item, Project } from '@shared/types'
import {
  useAddBoardEdge,
  useAddBoardNode,
  useBoardEdges,
  useBoardNodes,
  useDeleteBoardEdge,
  useDeleteBoardNode,
  useUpdateBoardNode
} from '../../lib/boards'
import { useItems, useUpdateItem } from '../../lib/items'
import { useUi } from '../../store/ui'
import { CardNode, type CardData } from './CardNode'
import { RefNode, type RefData } from './RefNode'
import { ShapeNode, type ShapeData } from './ShapeNode'
import { CanvasToolbar } from './CanvasToolbar'
import { PlotBoard } from './PlotBoard'

function Inner({ project, item }: { project: Project; item: Item }): JSX.Element {
  const { data: srvNodes } = useBoardNodes(item.id)
  const { data: srvEdges } = useBoardEdges(item.id)
  const { data: items } = useItems(project.id)
  const addNode = useAddBoardNode(item.id, project.id)
  const updateNode = useUpdateBoardNode(item.id)
  const deleteNode = useDeleteBoardNode(item.id)
  const addEdgeM = useAddBoardEdge(item.id, project.id)
  const deleteEdgeM = useDeleteBoardEdge(item.id)
  const updateItem = useUpdateItem(project.id)
  const openTab = useUi((s) => s.openTab)
  const theme = useUi((s) => s.theme)
  const nav = useNavigate()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const nodeTypes = useMemo<NodeTypes>(
    () => ({ card: CardNode, ref: RefNode, shape: ShapeNode }),
    []
  )

  const itemsById = useMemo(
    () => new Map((items ?? []).map((i) => [i.id, i])),
    [items]
  )

  // 서버 → RF 노드 동기화 (id 집합이 바뀔 때 재구성, 위치는 서버 기준)
  useEffect(() => {
    if (!srvNodes) return
    setNodes(
      srvNodes.map((n): Node => {
        if (n.kind === 'ref') {
          return {
            id: n.id,
            type: 'ref',
            position: { x: n.x, y: n.y },
            data: {
              item: n.ref_item_id ? itemsById.get(n.ref_item_id) ?? null : null,
              onOpen: () => {
                if (!n.ref_item_id) return
                openTab(n.ref_item_id)
                nav(`/p/${project.id}/i/${n.ref_item_id}`)
              },
              onSave: (patch: { title?: string; synopsis?: string | null }) => {
                if (n.ref_item_id) updateItem.mutate({ id: n.ref_item_id, patch })
              },
              onDelete: () => deleteNode.mutate(n.id)
            } as RefData
          }
        }
        if (n.kind === 'shape') {
          return {
            id: n.id,
            type: 'shape',
            position: { x: n.x, y: n.y },
            width: n.w,
            height: n.h,
            style: { width: n.w, height: n.h },
            data: {
              shape: n.shape ?? 'rectangle',
              title: n.title ?? '',
              color: n.color,
              onSave: (patch: { title?: string; color?: string | null }) =>
                updateNode.mutate({
                  id: n.id,
                  patch: {
                    title: patch.title ?? n.title ?? '',
                    color: patch.color !== undefined ? patch.color : n.color
                  }
                }),
              onResize: ({ w, h }: { w: number; h: number }) =>
                updateNode.mutate({ id: n.id, patch: { w, h } }),
              onDelete: () => deleteNode.mutate(n.id)
            } as ShapeData
          }
        }
        return {
          id: n.id,
          type: 'card',
          position: { x: n.x, y: n.y },
          data: {
            title: n.title ?? '',
            body: n.body ?? '',
            color: n.color,
            onSave: (patch: Partial<CardData>) =>
              updateNode.mutate({
                id: n.id,
                patch: {
                  title: patch.title ?? n.title ?? '',
                  body: patch.body ?? n.body ?? '',
                  color: patch.color !== undefined ? patch.color : n.color
                }
              }),
            onDelete: () => deleteNode.mutate(n.id)
          } as CardData
        }
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srvNodes, itemsById])

  useEffect(() => {
    if (!srvEdges) return
    setEdges(
      srvEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label ?? undefined }))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srvEdges])

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((eds) => addEdge(conn, eds))
      if (conn.source && conn.target)
        addEdgeM.mutate({ source: conn.source, target: conn.target })
    },
    [addEdgeM, setEdges]
  )

  // 새 노드를 겹치지 않게 살짝 어긋난 위치에 배치
  const nextPos = useCallback(
    () => ({
      x: 80 + Math.round((nodes.length % 4) * 60),
      y: 80 + Math.round(nodes.length * 30)
    }),
    [nodes.length]
  )

  const usedRefIds = useMemo(
    () =>
      new Set(
        (srvNodes ?? [])
          .filter((n) => n.kind === 'ref' && n.ref_item_id)
          .map((n) => n.ref_item_id as string)
      ),
    [srvNodes]
  )

  function handleAddCard(): void {
    void addNode.mutateAsync({ ...nextPos() })
  }

  function handleAddShape(shape: string): void {
    void addNode.mutateAsync({
      ...nextPos(),
      kind: 'shape',
      shape,
      title: '',
      w: 180,
      h: 120
    })
  }

  function handleAddRef(refItemId: string): void {
    void addNode.mutateAsync({
      ...nextPos(),
      kind: 'ref',
      ref_item_id: refItemId,
      title: itemsById.get(refItemId)?.title ?? ''
    })
  }

  return (
    <div className="relative h-full w-full">
      <CanvasToolbar
        items={items ?? []}
        usedRefIds={usedRefIds}
        onAddCard={handleAddCard}
        onAddShape={handleAddShape}
        onAddRef={handleAddRef}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={(_e, node) =>
          updateNode.mutate({ id: node.id, patch: { x: node.position.x, y: node.position.y } })
        }
        onEdgesDelete={(deleted) => deleted.forEach((e) => deleteEdgeM.mutate(e.id))}
        fitView
        proOptions={{ hideAttribution: true }}
        colorMode={theme}
      >
        <Background gap={20} color="var(--border)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

/**
 * 플롯보드(plot)=막/단계 레인 카드 보드, 캔버스(canvas)=자유 배치 관계 보드(React Flow).
 */
export function BoardView({
  project,
  item,
  mode
}: {
  project: Project
  item: Item
  mode: 'plot' | 'canvas'
}): JSX.Element {
  if (mode === 'plot') return <PlotBoard project={project} item={item} />
  return (
    <ReactFlowProvider>
      <Inner project={project} item={item} />
    </ReactFlowProvider>
  )
}
