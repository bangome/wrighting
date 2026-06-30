import type { AiReviewResponse } from '@shared/aiReview'

function ScoreBar({ label, score, reason }: { label: string; score: number; reason: string }): JSX.Element {
  const pct = Math.max(0, Math.min(100, (score / 5) * 100))
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-text-muted">{label}</span>
        <span className="tabular-nums text-text-faint">{score.toFixed(1)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg-active">
        <div className="h-full rounded-full bg-text" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs leading-relaxed text-text-faint">{reason}</p>
    </div>
  )
}

function ReviewSection({
  title,
  body,
  evidence,
  suggestions
}: {
  title: string
  body: string
  evidence: readonly string[]
  suggestions: readonly string[]
}): JSX.Element {
  return (
    <section className="border-t border-border pt-4">
      <h3 className="mb-2 text-base font-semibold">{title}</h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{body}</p>
      {evidence.length > 0 && (
        <div className="mt-3 rounded-[var(--radius-sm)] bg-bg-elev-2 p-3 text-sm leading-relaxed">
          {evidence.map((entry) => (
            <p key={entry} className="border-l-2 border-border-strong pl-3 text-text-muted">
              {entry}
            </p>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-text-muted">
          {suggestions.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function AiReviewResult({ result }: { result: AiReviewResponse }): JSX.Element {
  return (
    <section className="mt-6 space-y-5">
      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">리뷰 점수</h3>
          <span className="text-lg font-semibold tabular-nums">{result.overallScore.toFixed(1)}</span>
        </div>
        <div className="space-y-3">
          {result.scores.map((score) => (
            <ScoreBar key={score.key} label={score.label} score={score.score} reason={score.reason} />
          ))}
        </div>
      </div>
      <ReviewSection title="전반적인 피드백" body={result.summary} evidence={[]} suggestions={[]} />
      <ReviewSection title="대상 독자 반응" body={result.audienceRead} evidence={[]} suggestions={[]} />
      {result.strengths.map((section) => (
        <ReviewSection key={section.title} {...section} />
      ))}
      {result.risks.map((section) => (
        <ReviewSection key={section.title} {...section} />
      ))}
      <section className="border-t border-border pt-4">
        <h3 className="mb-2 text-base font-semibold">수정 순서</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-text-muted">
          {result.revisionPlan.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ol>
      </section>
      {result.partCardNotes.length > 0 && (
        <ReviewSection
          title="파트 카드 연결 점검"
          body={result.partCardNotes.join('\n')}
          evidence={[]}
          suggestions={[]}
        />
      )}
    </section>
  )
}
