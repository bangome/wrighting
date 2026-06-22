import React from 'react'
import ReactDOM from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './lib/auth'
import { queryClient, queryPersister, persistMaxAge } from './lib/query'
import { applyTheme, useUi } from './store/ui'
import './index.css'

// 테마 부트스트랩 (system이면 매체 쿼리 추종)
applyTheme(useUi.getState().theme)
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (useUi.getState().theme === 'system') applyTheme('system')
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: persistMaxAge }}
    >
      <AuthProvider>
        <HashRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </HashRouter>
      </AuthProvider>
    </PersistQueryClientProvider>
  </React.StrictMode>
)
