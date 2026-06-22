-- Claude Code 하네스(에이전트·스킬) 지침 관리
-- 각 작품을 클로드코드 하네스로 집필하므로, 앱에서 에이전트(.claude/agents/*.md)와
-- 스킬(.claude/skills/<name>/SKILL.md) 지침을 관리한다. Supabase가 진실원본이고,
-- 데스크톱에서 로컬 .claude/ 로 내보내면 Claude Code가 그대로 읽는다.
--
-- 범위: project_id IS NULL 이면 공용(모든 작품 기본), 값이 있으면 해당 작품 전용.
-- 작품의 실효 세트 = 공용 + 작품 전용(같은 name 은 작품 전용이 공용을 덮어씀, 앱에서 계산).
-- (재실행 안전: 모든 구문 idempotent)

-- ── 에이전트 ───────────────────────────────────────────────────────────
create table if not exists public.harness_agents (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,  -- null = 공용
  name text not null,                       -- 슬러그 = 파일명 (예: prose-writer)
  description text not null default '',     -- frontmatter description
  model text,                               -- sonnet | opus | haiku | null(상속)
  body text not null default '',            -- frontmatter 아래 마크다운 본문
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists harness_agents_owner_idx on public.harness_agents(owner);
create index if not exists harness_agents_project_idx on public.harness_agents(project_id);
create unique index if not exists harness_agents_name_uniq
  on public.harness_agents(owner, project_id, name) nulls not distinct;
drop trigger if exists harness_agents_touch on public.harness_agents;
create trigger harness_agents_touch before update on public.harness_agents
  for each row execute function public.touch_updated_at();

-- ── 스킬 ───────────────────────────────────────────────────────────────
create table if not exists public.harness_skills (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,  -- null = 공용
  name text not null,                       -- 슬러그 = 스킬 디렉터리명 (예: webnovel-prose)
  description text not null default '',     -- SKILL.md frontmatter description
  body text not null default '',            -- SKILL.md frontmatter 아래 본문
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists harness_skills_owner_idx on public.harness_skills(owner);
create index if not exists harness_skills_project_idx on public.harness_skills(project_id);
create unique index if not exists harness_skills_name_uniq
  on public.harness_skills(owner, project_id, name) nulls not distinct;
drop trigger if exists harness_skills_touch on public.harness_skills;
create trigger harness_skills_touch before update on public.harness_skills
  for each row execute function public.touch_updated_at();

-- ── RLS (소유자 본인만) ────────────────────────────────────────────────
alter table public.harness_agents enable row level security;
alter table public.harness_skills enable row level security;

drop policy if exists harness_agents_owner on public.harness_agents;
create policy harness_agents_owner on public.harness_agents
  for all using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists harness_skills_owner on public.harness_skills;
create policy harness_skills_owner on public.harness_skills
  for all using (owner = auth.uid()) with check (owner = auth.uid());

-- ── Realtime (다기기 동기화) — 이미 추가됐으면 무시 ────────────────────
do $$ begin
  alter publication supabase_realtime add table public.harness_agents;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.harness_skills;
exception when duplicate_object then null; end $$;
