import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

/** 테이블명 → 무효화할 쿼리키 (1인 다기기 동기화) */
const TABLE_QUERY: Record<string, (projectId: string) => unknown[][]> = {
  items: (p) => [['items', p], ['items-trash', p]],
  documents: () => [],
  sheets: () => [],
  links: (p) => [['links', p]],
  labels: (p) => [['labels', p]],
  statuses: (p) => [['statuses', p]],
  tasks: (p) => [['tasks', p]],
  board_nodes: () => [],
  board_edges: () => [],
  harness_agents: (p) => [['harness_agents', p]],
  harness_skills: (p) => [['harness_skills', p]],
  harness_docs: (p) => [['harness_docs', p]],
  projects: (p) => [['projects'], ['project', p]]
}

/**
 * 현재 작품의 Postgres 변경을 구독해 다른 기기/탭의 변경을 반영한다.
 * document/sheet/board 같은 본문 테이블은 키에 id가 필요해 광범위 무효화한다.
 */
export function useRealtimeSync(projectId: string | undefined): void {
  const qc = useQueryClient()
  useEffect(() => {
    if (!projectId) return
    const channel = supabase.channel(`project:${projectId}`)

    for (const table of Object.keys(TABLE_QUERY)) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          const keys = TABLE_QUERY[table](projectId)
          for (const key of keys) qc.invalidateQueries({ queryKey: key })
          // 본문 테이블(item_id 키)은 해당 행만 무효화
          const row = (payload.new ?? payload.old) as { item_id?: string; board_item_id?: string }
          if (table === 'documents' && row?.item_id)
            qc.invalidateQueries({ queryKey: ['document', row.item_id] })
          if (table === 'sheets' && row?.item_id)
            qc.invalidateQueries({ queryKey: ['sheet', row.item_id] })
          if ((table === 'board_nodes' || table === 'board_edges') && row?.board_item_id) {
            qc.invalidateQueries({ queryKey: ['board-nodes', row.board_item_id] })
            qc.invalidateQueries({ queryKey: ['board-edges', row.board_item_id] })
          }
        }
      )
    }

    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [projectId, qc])
}
