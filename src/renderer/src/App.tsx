import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Login } from './routes/Login'
import { Library } from './routes/Library'
import { Workspace } from './routes/Workspace'

function Splash(): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-text-faint">불러오는 중…</div>
  )
}

function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const { session, loading } = useAuth()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App(): JSX.Element {
  const { session, loading } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <Splash /> : session ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Library />
          </RequireAuth>
        }
      />
      <Route
        path="/p/:projectId/*"
        element={
          <RequireAuth>
            <Workspace />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
