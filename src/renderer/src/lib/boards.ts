import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BoardEdge, BoardNode } from '@shared/types'
import { supabase } from './supabase'

export function useBoardNodes(boardItemId: string | undefined) {
  return useQuery({
    queryKey: ['board-nodes', boardItemId],
    enabled: !!boardItemId,
    queryFn: async (): Promise<BoardNode[]> => {
      const { data, error } = await supabase
        .from('board_nodes')
        .select('*')
        .eq('board_item_id', boardItemId!)
      if (error) throw error
      return data as BoardNode[]
    }
  })
}

/** 프로젝트 전체 플롯/캔버스 카드(group·card) — 관계 그래프에서 노드로 표시 */
export function useProjectBoardNodes(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-board-nodes', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<BoardNode[]> => {
      const { data, error } = await supabase
        .from('board_nodes')
        .select('*')
        .eq('project_id', projectId!)
        .in('kind', ['group', 'card'])
      if (error) throw error
      return data as BoardNode[]
    }
  })
}

export function useBoardEdges(boardItemId: string | undefined) {
  return useQuery({
    queryKey: ['board-edges', boardItemId],
    enabled: !!boardItemId,
    queryFn: async (): Promise<BoardEdge[]> => {
      const { data, error } = await supabase
        .from('board_edges')
        .select('*')
        .eq('board_item_id', boardItemId!)
      if (error) throw error
      return data as BoardEdge[]
    }
  })
}

export function useAddBoardNode(boardItemId: string | undefined, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<BoardNode>): Promise<BoardNode> => {
      const { data, error } = await supabase
        .from('board_nodes')
        .insert({
          board_item_id: boardItemId,
          project_id: projectId,
          kind: input.kind ?? 'card',
          x: input.x ?? 0,
          y: input.y ?? 0,
          w: input.w ?? 220,
          h: input.h ?? 120,
          title: input.title ?? '새 카드',
          body: input.body ?? '',
          color: input.color ?? null,
          ref_item_id: input.ref_item_id ?? null,
          shape: input.shape ?? null,
          lane: input.lane ?? null,
          ord: input.ord ?? 0,
          col_id: input.col_id ?? null,
          tags: input.tags ?? [],
          doc_ids: input.doc_ids ?? [],
          mention_ids: input.mention_ids ?? []
        })
        .select('*')
        .single()
      if (error) throw error
      return data as BoardNode
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board-nodes', boardItemId] })
  })
}

/** 위치만 저장(드래그 종료 시) — 리페치 없이 가볍게 */
export function useUpdateBoardNode(boardItemId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<BoardNode> }) => {
      const { error } = await supabase.from('board_nodes').update(patch).eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['board-nodes', boardItemId] })
  })
}

export function useDeleteBoardNode(boardItemId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('board_nodes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-nodes', boardItemId] })
      qc.invalidateQueries({ queryKey: ['board-edges', boardItemId] })
    }
  })
}

export function useAddBoardEdge(boardItemId: string | undefined, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { source: string; target: string; label?: string }) => {
      const { error } = await supabase.from('board_edges').insert({
        board_item_id: boardItemId,
        project_id: projectId,
        source: input.source,
        target: input.target,
        label: input.label ?? null
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board-edges', boardItemId] })
  })
}

export function useDeleteBoardEdge(boardItemId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('board_edges').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board-edges', boardItemId] })
  })
}
