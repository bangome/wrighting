import { useEffect, useState } from 'react'
import type { Item, Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { documentDescendants, fetchPieces } from '../../lib/folderExport'
import type { ExportPiece } from '../export/blocks'
import { useEditorPrefs, fontStack } from '../../store/editorPrefs'

/**
 * 연속 보기 — 폴더 하위 문서를 회차(트리) 순서로 한 스크롤에 이어 읽는다(읽기 전용).
 * 회차 배열·장면 흐름·독자 시점의 읽힘을 검토하는 용도.
 */
export function ContinuousView({ project, folder }: { project: Project; folder: Item }): JSX.Element {
  const { data: items } = useItems(project.id)
  const prefs = useEditorPrefs()
  const [pieces, setPieces] = useState<ExportPiece[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const docs = documentDescendants(items ?? [], folder.id)
    fetchPieces(docs)
      .then((p) => {
        if (!cancelled) setPieces(p)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [items, folder.id])

  if (error) return <div className="p-8 text-danger">불러오지 못했습니다: {error}</div>
  if (!pieces) return <div className="p-8 text-text-faint">불러오는 중…</div>
  if (pieces.length === 0)
    return <div className="p-8 text-text-faint">이 폴더에는 문서가 없습니다.</div>

  return (
    <div
      className="mx-auto max-w-[720px] px-8 py-10"
      style={{ fontFamily: fontStack(prefs.fontFamily), lineHeight: prefs.lineHeight }}
    >
      {pieces.map((piece, i) => (
        <section key={i} className="mb-16">
          <h2 className="mb-6 border-b border-border pb-2 text-center text-xl font-bold">
            {piece.title}
          </h2>
          {piece.blocks.map((b, j) =>
            b.heading ? (
              <h3 key={j} className="mb-2 mt-4 font-semibold">
                {b.text}
              </h3>
            ) : (
              <p key={j} className="mb-3 whitespace-pre-wrap text-text">
                {b.text || ' '}
              </p>
            )
          )}
        </section>
      ))}
    </div>
  )
}
