import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** 렌더 중 예외를 잡아 화면에 표시한다 (깨진 UI 대신 원인 노출). */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error): void {
    console.error('[wrighting] render error:', error)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <h2 className="text-lg font-semibold text-danger">화면을 표시하는 중 오류가 발생했습니다</h2>
          <pre className="max-w-[600px] overflow-auto rounded-app border border-border bg-bg-elev p-4 text-left text-xs text-text-muted">
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            className="rounded-[var(--radius-sm)] bg-accent px-4 py-1.5 text-sm text-white"
            onClick={() => this.setState({ error: null })}
          >
            다시 시도
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
