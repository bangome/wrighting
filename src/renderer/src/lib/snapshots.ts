import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import type { RichDoc, Snapshot } from '@shared/types'
import { supabase } from './supabase'
import { richDocToText } from './diff'

/** 자동 기록 라벨 — 이 값이면 사용자가 직접 저장한 게 아니라 자동 생성된 버전 */
export const AUTO_LABEL = '자동 기록'
/** 복원 직전 안전 백업 라벨 */
export const PRE_RESTORE_LABEL = '복원 전 자동저장'
/** 자동 기록 최소 간격 (ms) */
const AUTO_INTERVAL_MS = 3 * 60 * 1000

export function useSnapshots(itemId: string | undefined) {
  return useQuery({
    queryKey: ['snapshots', itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from('snapshots')
        .select('*')
        .eq('item_id', itemId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Snapshot[]
    }
  })
}

export function useCreateSnapshot(itemId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { projectId: string; content: RichDoc; label?: string }) => {
      const { error } = await supabase.from('snapshots').insert({
        item_id: itemId,
        project_id: input.projectId,
        content: input.content,
        label: input.label ?? null
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snapshots', itemId] })
  })
}

/**
 * 자동 버전 기록 훅. 본문이 저장될 때마다 `maybeSnapshot(content)`를 호출하면,
 * 마지막 기록 이후 일정 시간이 지났고 내용이 실제로 바뀐 경우에만 새 버전을 만든다.
 * 디바운스 저장과 함께 호출되어 사용자 개입 없이 기록이 쌓인다.
 */
export function useAutoSnapshot(itemId: string | undefined, projectId: string) {
  const { data: snapshots } = useSnapshots(itemId)
  const createSnapshot = useCreateSnapshot(itemId)
  // 직전에 기록한 텍스트를 기억해, 같은 세션에서 중복 기록을 막는다.
  const lastTextRef = useRef<string | null>(null)

  return useCallback(
    (content: RichDoc): void => {
      if (!itemId) return
      const latest = snapshots?.[0]
      const nowText = richDocToText(content)

      // 마지막 자동 기록 이후 충분한 시간이 지났는지
      const lastAt = latest ? new Date(latest.created_at).getTime() : 0
      const enoughTimePassed = Date.now() - lastAt >= AUTO_INTERVAL_MS

      // 직전 기록(서버 최신본 또는 이번 세션에서 만든 것)과 내용이 다른지
      const prevText = lastTextRef.current ?? (latest ? richDocToText(latest.content) : '')
      const changed = nowText !== prevText && nowText.trim().length > 0

      if (!enoughTimePassed || !changed) return

      lastTextRef.current = nowText
      createSnapshot.mutate({ projectId, content, label: AUTO_LABEL })
    },
    [itemId, projectId, snapshots, createSnapshot]
  )
}
