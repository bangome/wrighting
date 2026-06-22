import { useCallback, useEffect, useMemo } from 'react'
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
import { Plus } from 'lucide-react'
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
import { CardNode, type CardData } from './CardNode'
import { LaneBoard } from './LaneBoard'

function Inner({ project, item }: { project: Project; item: Item }): JSX.Element {
  const { data: srvNodes } = useBoardNodes(item.id)
  const { data: srvEdges } = useBoardEdges(item.id)
  const addNode = useAddBoardNode(item.id, project.id)
  const updateNode = useUpdateBoardNode(item.id)
  const deleteNode = useDeleteBoardNode(item.id)
  const addEdgeM = useAddBoardEdge(item.id, project.id)
  const deleteEdgeM = useDeleteBoardEdge(item.id)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const nodeTypes = useMemo<NodeTypes>(() => ({ card: CardNode }), [])

  // 서버 → RF 노드 동기화 (id 집합이 바뀔 때 재구성, 위치는 서버 기준)
  useEffect(() => {
    if (!srvNodes) return
    setNodes(
      srvNodes.map((n) => ({
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
      }))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srvNodes])

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

  async function handleAdd(): Promise<void> {
    await addNode.mutateAsync({
      x: 80 + Math.round((nodes.length % 4) * 60),
      y: 80 + Math.round(nodes.length * 30)
    })
  }

  return (
    <div className="relative h-full w-full">
      <button
        onClick={() => void handleAdd()}
        className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-3 py-1.5 text-sm shadow-[var(--shadow)] hover:border-border-strong"
      >
        <Plus size={15} /> 카드 추가
      </button>
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
        colorMode="dark"
      >
        <Background gap={20} color="#2a2a30" />
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
  if (mode === 'plot') return <LaneBoard project={project} item={item} />
  return (
    <ReactFlowProvider>
      <Inner project={project} item={item} />
    </ReactFlowProvider>
  )
}
