-- ════════════════════════════════════════════════════════════════════
-- 미적용 마이그레이션 일괄 적용 (0003 + 0004 + 0005)
-- 라이브 DB가 0001만 적용된 상태라 관계(links.auto)·공유(shares)·
-- 노트/레인 기능이 깨져 있음. Supabase 대시보드 > SQL Editor 에 붙여넣고 실행.
-- 모두 멱등이라 여러 번 실행해도 안전.
-- ════════════════════════════════════════════════════════════════════

-- ── 0003: 본문 인라인 멘션 자동 링크 추적 ──────────────────────────────
alter table public.links add column if not exists auto boolean not null default false;

-- ── 0004: 문서 공유 링크 ──────────────────────────────────────────────
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists shares_project_idx on public.shares(project_id);
create unique index if not exists shares_item_idx on public.shares(item_id);

alter table public.shares enable row level security;
drop policy if exists shares_owner on public.shares;
create policy shares_owner on public.shares
  for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));

create or replace function public.get_shared_document(p_token text)
returns table(title text, content jsonb)
language sql security definer set search_path = public stable as $$
  select i.title, d.content
  from public.shares s
  join public.items i on i.id = s.item_id
  left join public.documents d on d.item_id = s.item_id
  where s.token = p_token
    and (s.expires_at is null or s.expires_at > now());
$$;
grant execute on function public.get_shared_document(text) to anon, authenticated;

-- ── 0005: 노트 타입 + 플롯보드 막/단계 레인 ───────────────────────────
alter table public.items drop constraint if exists items_type_check;
alter table public.items add constraint items_type_check
  check (type in ('folder','document','sheet','plotboard','canvas','notes'));

alter table public.board_nodes add column if not exists lane int;
alter table public.board_nodes add column if not exists ord int not null default 0;
