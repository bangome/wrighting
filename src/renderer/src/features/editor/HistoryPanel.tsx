import { useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Clock, History, Plus, RotateCcw, X } from 'lucide-react'
import type { Item, Project, RichDoc, Snapshot } from '@shared/types'
import {
  AUTO_LABEL,
  PRE_RESTORE_LABEL,
  useCreateSnapshot,
  useSnapshots
} from '../../lib/snapshots'
import { diffLines, diffStats, richDocToText } from '../../lib/diff'

function fmt(ts: string): string {
  return new Date(ts).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function HistoryPanel({
  editor,
  project,
  item,
  onClose
}: {
  editor: Editor
  project: Project
  item: Item
  onClose: () => void
}): JSX.Element {
  const { data: snapshots } = useSnapshots(item.id)
  const createSnapshot = useCreateSnapshot(item.id)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState(false)

  // 모달이 열린 시점의 현재 본문(평문) — 비교 기준
  const currentText = useMemo(() => richDocToText(editor.getJSON() as RichDoc), [editor])

  const list = snapshots ?? []
  const selected = list.find((s) => s.id === selectedId) ?? null

  const diff = useMemo(() => {
    if (!selected) return null
    return diffLines(richDocToText(selected.content), currentText)
  }, [selected, currentText])
  const stats = diff ? diffStats(diff) : null

  function saveNow(): void {
    createSnapshot.mutate({
      projectId: project.id,
      content: editor.getJSON() as RichDoc,
      label: undefined
    })
  }

  function restore(snap: Snapshot): void {
    // 복원 전 현재 상태를 자동 백업해 되돌릴 수 있게 한다.
    createSnapshot.mutate({
      projectId: project.id,
      content: editor.getJSON() as RichDoc,
      label: PRE_RESTORE_LABEL
    })
    editor.commands.setContent((snap.content as object) ?? '', { emitUpdate: true })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative flex h-[78vh] w-[920px] max-w-[94vw] flex-col overflow-hidden rounded-app border border-border bg-bg-elev shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <History size={16} className="text-text-muted" />
          <span className="text-sm font-semibold">문서 기록</span>
          <span className="text-xs text-text-faint">{list.length}개 버전</span>
          <button
            className="ml-auto flex items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1 text-xs hover:bg-bg-hover"
            onClick={saveNow}
          >
            <Plus size={13} /> 지금 기록
          </button>
          <button className="icon-btn" title="닫기" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* 버전 목록 */}
          <div className="w-64 shrink-0 overflow-y-auto border-r border-border py-1.5">
            {list.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-text-faint">
                저장된 기록이 없습니다.
                <br />
                작성하면 자동으로 쌓입니다.
              </p>
            ) : (
              list.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedId(s.id)
                    setConfirmRestore(false)
                  }}
                  className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition ${
                    s.id === selectedId ? 'bg-bg-active' : 'hover:bg-bg-hover'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} className="text-text-faint" />
                    {fmt(s.created_at)}
                  </span>
                  <span className="text-xs text-text-faint">
                    {s.label === AUTO_LABEL || s.label == null
                      ? '자동'
                      : s.label === PRE_RESTORE_LABEL
                        ? '복원 전 백업'
                        : s.label}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* 비교 뷰 */}
          <div className="flex min-w-0 flex-1 flex-col">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-text-faint">
                왼쪽에서 버전을 선택하면 현재 문서와 비교합니다.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-xs">
                  <span className="text-text-muted">
                    <b className="text-text">{fmt(selected.created_at)}</b> 버전 ↔ 현재 문서
                  </span>
                  {stats && (
                    <span className="flex items-center gap-2">
                      <span className="text-ok">+{stats.added}</span>
                      <span className="text-danger">−{stats.removed}</span>
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {confirmRestore ? (
                      <>
                        <span className="text-text-faint">이 버전으로 되돌릴까요?</span>
                        <button
                          className="rounded-[var(--radius-sm)] bg-accent px-2.5 py-1 text-xs text-white"
                          onClick={() => restore(selected)}
                        >
                          복원
                        </button>
                        <button
                          className="rounded-[var(--radius-sm)] border border-border px-2.5 py-1 text-xs hover:bg-bg-hover"
                          onClick={() => setConfirmRestore(false)}
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <button
                        className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1 text-xs hover:bg-bg-hover"
                        onClick={() => setConfirmRestore(true)}
                      >
                        <RotateCcw size={13} /> 이 버전으로 복원
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
                  {diff && diff.length > 0 ? (
                    diff.map((line, idx) => (
                      <div
                        key={idx}
                        className={
                          line.type === 'add'
                            ? 'bg-ok/10 text-ok'
                            : line.type === 'del'
                              ? 'bg-danger/10 text-danger line-through decoration-danger/40'
                              : 'text-text-muted'
                        }
                      >
                        <span className="mr-2 select-none text-text-faint">
                          {line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '}
                        </span>
                        {line.text || ' '}
                      </div>
                    ))
                  ) : (
                    <p className="text-text-faint">현재 문서와 동일합니다.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
