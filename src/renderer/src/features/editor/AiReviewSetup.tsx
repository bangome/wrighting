import {
  BookOpen,
  CircleUserRound,
  Globe2,
  Heart,
  LineChart,
  Megaphone,
  PenLine,
  Sparkles
} from 'lucide-react'
import type { AiReviewPartCard, ReviewAudience, ReviewFocusKey, ReviewFormat } from '@shared/aiReview'
import {
  REVIEW_AUDIENCE_LABEL,
  REVIEW_AUDIENCES,
  REVIEW_FOCUS_LABEL,
  REVIEW_FOCUS_KEYS,
  REVIEW_FORMAT_LABEL,
  REVIEW_FORMATS
} from '@shared/aiReview'
import type { Item } from '@shared/types'

interface AiReviewSetupProps {
  readonly format: ReviewFormat
  readonly audience: ReviewAudience
  readonly focus: readonly ReviewFocusKey[]
  readonly directness: number
  readonly partCards: readonly AiReviewPartCard[]
  readonly referenceQuery: string
  readonly referenceDocuments: readonly string[]
  readonly docs: readonly Item[]
  readonly additionalGuidance: string
  readonly error: string | null
  readonly loading: boolean
  readonly onFormatChange: (format: ReviewFormat) => void
  readonly onAudienceChange: (audience: ReviewAudience) => void
  readonly onFocusToggle: (key: ReviewFocusKey) => void
  readonly onDirectnessChange: (value: number) => void
  readonly onReferenceQueryChange: (value: string) => void
  readonly onReferenceAdd: (title: string) => void
  readonly onReferenceRemove: (title: string) => void
  readonly onAdditionalGuidanceChange: (value: string) => void
  readonly onReview: () => void
}

const FOCUS_ICON: Record<ReviewFocusKey, JSX.Element> = {
  story: <BookOpen size={14} />,
  character: <CircleUserRound size={14} />,
  pacing: <LineChart size={14} />,
  prose: <PenLine size={14} />,
  emotion: <Heart size={14} />,
  marketability: <Megaphone size={14} />,
  worldbuilding: <Globe2 size={14} />
}

export function selectFormat(value: string, fallback: ReviewFormat): ReviewFormat {
  return REVIEW_FORMATS.find((format) => format === value) ?? fallback
}

export function selectAudience(value: string, fallback: ReviewAudience): ReviewAudience {
  return REVIEW_AUDIENCES.find((audience) => audience === value) ?? fallback
}

export function AiReviewSetup(props: AiReviewSetupProps): JSX.Element {
  return (
    <section className="space-y-4">
      <div>
        <div className="mb-2 text-sm font-medium">문서 형식 · 대상 독자</div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={props.format}
            className="rounded-[var(--radius-sm)] border border-border bg-bg-elev px-3 py-2 text-sm outline-none"
            onChange={(event) => props.onFormatChange(selectFormat(event.target.value, props.format))}
          >
            {REVIEW_FORMATS.map((entry) => (
              <option key={entry} value={entry}>
                {REVIEW_FORMAT_LABEL[entry]}
              </option>
            ))}
          </select>
          <select
            value={props.audience}
            className="rounded-[var(--radius-sm)] border border-border bg-bg-elev px-3 py-2 text-sm outline-none"
            onChange={(event) => props.onAudienceChange(selectAudience(event.target.value, props.audience))}
          >
            {REVIEW_AUDIENCES.map((entry) => (
              <option key={entry} value={entry}>
                {REVIEW_AUDIENCE_LABEL[entry]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">짚어 줄 부분</div>
        <div className="grid grid-cols-2 gap-2">
          {REVIEW_FOCUS_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => props.onFocusToggle(key)}
              className={`flex h-10 items-center justify-between rounded-[var(--radius-sm)] border px-3 text-sm ${
                props.focus.includes(key)
                  ? 'border-border-strong bg-bg-elev text-text'
                  : 'border-border bg-bg-elev-2 text-text-faint'
              }`}
            >
              <span className="flex items-center gap-2">
                {FOCUS_ICON[key]}
                {REVIEW_FOCUS_LABEL[key]}
              </span>
              <span
                className={`h-4 w-7 rounded-full border ${
                  props.focus.includes(key) ? 'border-text bg-text' : 'border-border bg-bg'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">피드백 톤</div>
        <input
          type="range"
          min={0}
          max={100}
          value={props.directness}
          onChange={(event) => props.onDirectnessChange(Number(event.target.value))}
          className="w-full accent-[var(--text)]"
        />
        <div className="mt-1 flex justify-between text-xs text-text-faint">
          <span>부드럽게</span>
          <span>균형 있게</span>
          <span className="text-text">직설적으로</span>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-medium">
          <span>연결된 파트 카드</span>
          <span className="text-xs font-normal text-text-faint">{props.partCards.length}개 참고</span>
        </div>
        <div className="max-h-28 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] border border-border bg-bg-elev-2 p-2">
          {props.partCards.length === 0 ? (
            <p className="text-xs text-text-faint">이 문서에 연결된 파트 카드가 없습니다.</p>
          ) : (
            props.partCards.map((card) => (
              <div key={`${card.boardTitle}-${card.title}`} className="text-xs leading-relaxed">
                <span className="font-medium">{card.title}</span>
                <span className="text-text-faint"> · {card.boardTitle}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">참고 문서</div>
        <input
          value={props.referenceQuery}
          onChange={(event) => props.onReferenceQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && props.referenceQuery.trim()) props.onReferenceAdd(props.referenceQuery.trim())
          }}
          placeholder="문서를 검색해 추가..."
          className="w-full rounded-[var(--radius-sm)] border border-border bg-bg-elev px-3 py-2 text-sm outline-none placeholder:text-text-faint"
        />
        {props.referenceQuery && (
          <div className="mt-1 max-h-36 overflow-y-auto rounded-[var(--radius-sm)] border border-border bg-bg-elev py-1 text-sm shadow-[var(--shadow)]">
            {props.docs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className="block w-full truncate px-3 py-1.5 text-left hover:bg-bg-hover"
                onClick={() => props.onReferenceAdd(doc.title)}
              >
                {doc.title}
              </button>
            ))}
          </div>
        )}
        {props.referenceDocuments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {props.referenceDocuments.map((doc) => (
              <button
                key={doc}
                type="button"
                className="rounded border border-border px-2 py-0.5 text-xs text-text-muted hover:text-danger"
                onClick={() => props.onReferenceRemove(doc)}
              >
                {doc}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">추가 지시</div>
        <textarea
          value={props.additionalGuidance}
          onChange={(event) => props.onAdditionalGuidanceChange(event.target.value)}
          rows={4}
          placeholder="예: 4화 대사 톤만 집중해서 봐 줘, 시브론 B는 건드리지 마"
          className="w-full resize-none rounded-[var(--radius-sm)] border border-border bg-bg-elev px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-text-faint"
        />
      </div>

      {props.error && <p className="rounded-[var(--radius-sm)] bg-bg-elev-2 p-3 text-sm text-danger">{props.error}</p>}

      <button
        type="button"
        disabled={props.loading}
        onClick={props.onReview}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-text py-2.5 text-sm font-semibold text-bg disabled:opacity-50"
      >
        <Sparkles size={15} />
        {props.loading ? '리뷰 중...' : '리뷰 받기'}
      </button>
    </section>
  )
}
