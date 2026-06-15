import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // 설정 누락 시 빠르게 알린다 (.env 참고)
  console.error(
    'Supabase 환경변수가 없습니다. .env 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 설정하세요.'
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
