import type { DragEvent } from 'react'
import type { Pane } from '../../store/ui'

/** 탭 드래그 전용 MIME — 바인더 트리 등 다른 드래그와 구분한다 */
const MIME = 'application/x-wrighting-tab'

export interface TabDrag {
  id: string
  pane: Pane
}

export function setTabDragData(e: DragEvent, payload: TabDrag): void {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData(MIME, JSON.stringify(payload))
  e.dataTransfer.setData('text/plain', payload.id)
}

/** drop 시점에만 호출(dragover에서는 dataTransfer 값을 읽을 수 없음) */
export function getTabDragData(e: DragEvent): TabDrag | null {
  const raw = e.dataTransfer.getData(MIME)
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as TabDrag
    if (v && typeof v.id === 'string' && (v.pane === 'main' || v.pane === 'split')) return v
    return null
  } catch {
    return null
  }
}

/** dragover에서 탭 드래그인지 판별(값은 못 읽고 type만 확인 가능) */
export function hasTabDrag(e: DragEvent): boolean {
  return e.dataTransfer.types.includes(MIME)
}
