export function Placeholder({ title, hint }: { title: string; hint?: string }): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="text-sm text-text-muted">{hint ?? '곧 제공됩니다.'}</p>
    </div>
  )
}
