import { useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ArrowLeft, RefreshCcw } from 'lucide-react'
import type { AiReviewResponse, ReviewAudience, ReviewFocusKey, ReviewFormat } from '@shared/aiReview'
import { REVIEW_FOCUS_KEYS } from '@shared/aiReview'
import type { Item, Project } from '@shared/types'
import { requestAiReview } from '../../lib/aiReview'
import { useProjectBoardNodes } from '../../lib/boards'
import { useItems } from '../../lib/items'
import { linkedPartCards } from './aiReviewContext'
import { AiReviewResult } from './AiReviewResult'
import { AiReviewSetup } from './AiReviewSetup'

interface AiReviewPanelProps {
  readonly editor: Editor
  readonly project: Project
  readonly item: Item
  readonly onClose: () => void
}

const DEFAULT_FOCUS: readonly ReviewFocusKey[] = ['story', 'character', 'pacing', 'prose']

export function AiReviewPanel({ editor, project, item, onClose }: AiReviewPanelProps): JSX.Element {
  const { data: nodes } = useProjectBoardNodes(project.id)
  const { data: items } = useItems(project.id)
  const [format, setFormat] = useState<ReviewFormat>('webNovel')
  const [audience, setAudience] = useState<ReviewAudience>('lightReader')
  const [focus, setFocus] = useState<readonly ReviewFocusKey[]>(DEFAULT_FOCUS)
  const [directness, setDirectness] = useState(78)
  const [referenceQuery, setReferenceQuery] = useState('')
  const [referenceDocuments, setReferenceDocuments] = useState<readonly string[]>([])
  const [additionalGuidance, setAdditionalGuidance] = useState('')
  const [result, setResult] = useState<AiReviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const docs = useMemo(
    () =>
      (items ?? [])
        .filter((candidate) => candidate.type === 'document' && candidate.id !== item.id)
        .filter((candidate) => candidate.title.toLowerCase().includes(referenceQuery.toLowerCase()))
        .slice(0, 8),
    [items, item.id, referenceQuery]
  )
  const partCards = useMemo(
    () => linkedPartCards(nodes ?? [], items ?? [], item.id),
    [nodes, items, item.id]
  )

  function toggleFocus(key: ReviewFocusKey): void {
    setFocus((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
    )
  }

  function addReference(title: string): void {
    setReferenceDocuments((current) => (current.includes(title) ? current : [...current, title]))
    setReferenceQuery('')
  }

  async function runReview(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const next = await requestAiReview({
        documentTitle: item.title,
        documentText: editor.getText(),
        format,
        audience,
        focus: focus.length > 0 ? [...focus] : [...REVIEW_FOCUS_KEYS],
        directness,
        partCards,
        referenceDocuments: [...referenceDocuments],
        additionalGuidance
      })
      setResult(next)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI 리뷰를 생성하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/20" role="dialog" aria-modal="true">
      <div className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col border-l border-border bg-bg shadow-[var(--shadow)]">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <button type="button" className="icon-btn" title="닫기" onClick={onClose}>
            <ArrowLeft size={16} />
          </button>
          <h2 className="text-base font-semibold">AI 리뷰</h2>
          {result && (
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs hover:bg-bg-hover"
              disabled={loading}
              onClick={() => void runReview()}
            >
              <RefreshCcw size={13} />
              다시 분석
            </button>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <AiReviewSetup
            format={format}
            audience={audience}
            focus={focus}
            directness={directness}
            partCards={partCards}
            referenceQuery={referenceQuery}
            referenceDocuments={referenceDocuments}
            docs={docs}
            additionalGuidance={additionalGuidance}
            error={error}
            loading={loading}
            onFormatChange={setFormat}
            onAudienceChange={setAudience}
            onFocusToggle={toggleFocus}
            onDirectnessChange={setDirectness}
            onReferenceQueryChange={setReferenceQuery}
            onReferenceAdd={addReference}
            onReferenceRemove={(title) =>
              setReferenceDocuments((current) => current.filter((entry) => entry !== title))
            }
            onAdditionalGuidanceChange={setAdditionalGuidance}
            onReview={() => void runReview()}
          />

          {result && <AiReviewResult result={result} />}
        </div>
      </div>
    </div>
  )
}
