import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const url = process.env.WRIGHTING_SUPABASE_URL ?? process.env.SUPABASE_URL
const key = process.env.WRIGHTING_SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error(
    'wrighting-mcp: WRIGHTING_SUPABASE_URL / WRIGHTING_SUPABASE_SERVICE_KEY 가 필요합니다. .env 를 확인하세요.'
  )
  process.exit(1)
}

/** 설정 시 공용 하네스·프로젝트 목록을 이 소유자로 한정 (단일 사용자면 null) */
export const OWNER: string | null = process.env.WRIGHTING_OWNER_ID || null

/** Service role 클라이언트 — RLS 우회. 세션 영속화 없음(헤드리스). */
export const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
})
