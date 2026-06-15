import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export function Login(): JSX.Element {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setNotice('가입 완료. 메일 확인이 필요할 수 있어요. 이제 로그인하세요.')
        setMode('signin')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-bg">
      <form
        onSubmit={submit}
        className="w-[340px] rounded-app border border-border bg-bg-elev p-8 shadow-[var(--shadow)]"
      >
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">wrighting</h1>
        <p className="mb-6 text-sm text-text-muted">한국어 소설 집필 워크스페이스</p>

        <label className="mb-1 block text-xs text-text-muted">이메일</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elev-2 px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="you@example.com"
        />

        <label className="mb-1 block text-xs text-text-muted">비밀번호</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elev-2 px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="••••••••"
        />

        {error && <p className="mb-3 text-xs text-danger">{error}</p>}
        {notice && <p className="mb-3 text-xs text-ok">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[var(--radius-sm)] bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {mode === 'signin' ? '로그인' : '가입하기'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
          }}
          className="mt-3 w-full text-center text-xs text-text-muted hover:text-text"
        >
          {mode === 'signin' ? '계정이 없으신가요? 가입하기' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </form>
    </div>
  )
}
