-- 메인 하네스 지침: 프로젝트 루트의 CLAUDE.md
-- 에이전트·스킬과 달리 작품당 하나(루트 단일 파일)인 싱글톤이라 별도 테이블로 둔다.
-- 범위는 동일: project_id IS NULL 이면 공용(기본 템플릿), 값이 있으면 작품 전용.
-- 실효 CLAUDE.md = 작품 전용이 있으면 그것, 없으면 공용. (앱에서 계산)
-- (재실행 안전: 모든 구문 idempotent)

create table if not exists public.harness_docs (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,  -- null = 공용
  body text not null default '',
  updated_at timestamptz not null default now()
);
create index if not exists harness_docs_owner_idx on public.harness_docs(owner);
-- (owner, project_id) 당 하나 — 공용(null)도 하나만
create unique index if not exists harness_docs_scope_uniq
  on public.harness_docs(owner, project_id) nulls not distinct;
drop trigger if exists harness_docs_touch on public.harness_docs;
create trigger harness_docs_touch before update on public.harness_docs
  for each row execute function public.touch_updated_at();

alter table public.harness_docs enable row level security;
drop policy if exists harness_docs_owner on public.harness_docs;
create policy harness_docs_owner on public.harness_docs
  for all using (owner = auth.uid()) with check (owner = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.harness_docs;
exception when duplicate_object then null; end $$;
