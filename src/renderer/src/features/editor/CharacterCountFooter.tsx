import {
  characterCountModeLabel,
  type CharacterCountMode
} from '../../lib/count'

interface Props {
  mode: CharacterCountMode
  displayedCount: number
  goal: number
  goalCount: number
  dirty: boolean
  onModeChange: (mode: CharacterCountMode) => void
}

export function CharacterCountFooter({
  mode,
  displayedCount,
  goal,
  goalCount,
  dirty,
  onModeChange
}: Props): JSX.Element {
  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-1.5 text-xs text-text-faint">
      <div
        className="inline-flex shrink-0 overflow-hidden rounded-[6px] border border-border"
        aria-label="글자수 표시 기준"
      >
        <button
          type="button"
          onClick={() => onModeChange('without-space')}
          className={`px-2 py-0.5 transition ${
            mode === 'without-space' ? 'bg-bg-active text-text' : 'text-text-faint hover:bg-bg-hover hover:text-text-muted'
          }`}
        >
          공백 제외
        </button>
        <button
          type="button"
          onClick={() => onModeChange('with-space')}
          className={`border-l border-border px-2 py-0.5 transition ${
            mode === 'with-space' ? 'bg-bg-active text-text' : 'text-text-faint hover:bg-bg-hover hover:text-text-muted'
          }`}
        >
          공백 포함
        </button>
      </div>
      <span>
        {characterCountModeLabel(mode)} {displayedCount.toLocaleString()}자
      </span>
      {goal > 0 && (
        <span className={goalCount >= goal ? 'text-ok' : ''}>
          목표 {goal.toLocaleString()}자 · {Math.round((goalCount / goal) * 100)}%
        </span>
      )}
      <span className="ml-auto">{dirty ? '저장 중…' : '저장됨'}</span>
    </div>
  )
}
