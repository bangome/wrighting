-- 하네스 변경 이력 (지침·에이전트·스킬)
-- 본문(body)에 변경 이력을 섞으면 Claude Code가 매번 읽어 토큰을 낭비하므로,
-- 이력은 이 테이블에만 append-only 로 쌓고 .claude/ 로는 절대 내보내지 않는다.
-- target_id 는 원본 행 id(삭제돼도 이력은 남아야 하므로 FK 없이 보관).

create table public.harness_history (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,  -- null = 공용 범위
  target_kind text not null check (target_kind in ('doc', 'agent', 'skill', 'bundle')),
  target_id uuid,                            -- 원본 행 id (삭제 후엔 dangling 허용)
  target_name text not null default '',      -- 항목 이름(에이전트/스킬 슬러그, 지침은 CLAUDE.md)
  action text not null check (action in ('create', 'update', 'delete', 'import')),
  summary text not null default '',          -- 사람이 읽는 변경 요약
  snapshot text,                             -- 변경 시점 본문 스냅샷(되돌리기용). null 가능
  created_at timestamptz not null default now()
);

create index harness_history_owner_idx on public.harness_history(owner);
create index harness_history_target_idx on public.harness_history(target_id);
create index harness_history_project_idx on public.harness_history(project_id);

alter table public.harness_history enable row level security;

create policy harness_history_owner on public.harness_history
  for all using (owner = auth.uid()) with check (owner = auth.uid());

alter publication supabase_realtime add table public.harness_history;
