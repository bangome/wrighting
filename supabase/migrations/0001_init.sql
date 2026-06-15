-- wrighting 초기 스키마
-- 모든 사용자 데이터는 RLS로 소유자(auth.uid())에게만 노출된다.
-- 1인 다기기 동기화 모델: Postgres가 단일 진실원본, 충돌은 문서 단위 last-write-wins.

-- ── 확장 ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── 공통: updated_at 자동 갱신 트리거 ────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── profiles ─────────────────────────────────────────────────────────
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 신규 가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── projects ─────────────────────────────────────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null default '제목 없는 작품',
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_idx on public.projects(owner);
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- ── labels / statuses ────────────────────────────────────────────────
create table public.labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  color text not null default '#888888',
  sort_order int not null default 0
);
create index labels_project_idx on public.labels(project_id);

create table public.statuses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  color text not null default '#888888',
  sort_order int not null default 0
);
create index statuses_project_idx on public.statuses(project_id);

-- ── items (바인더 트리 통합 노드) ────────────────────────────────────
create table public.items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.items(id) on delete cascade,
  type text not null check (type in ('folder','document','sheet','plotboard','canvas')),
  sheet_subtype text check (sheet_subtype in ('character','place','item','organization','concept')),
  title text not null default '제목 없음',
  icon text,
  synopsis text,
  label_id uuid references public.labels(id) on delete set null,
  status_id uuid references public.statuses(id) on delete set null,
  folder_view text check (folder_view in ('grid','list','corkboard','timeline')),
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_project_idx on public.items(project_id);
create index items_parent_idx on public.items(parent_id);
create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

-- ── documents / sheets (아이템 본문, 1:1) ────────────────────────────
create table public.documents (
  item_id uuid primary key references public.items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  content jsonb,
  text_plain text not null default '',
  word_count int not null default 0,
  char_count int not null default 0,
  updated_at timestamptz not null default now()
);
create trigger documents_touch before update on public.documents
  for each row execute function public.touch_updated_at();

create table public.sheets (
  item_id uuid primary key references public.items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  attributes jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  body jsonb,
  updated_at timestamptz not null default now()
);
create trigger sheets_touch before update on public.sheets
  for each row execute function public.touch_updated_at();

-- ── boards (플롯보드/캔버스) ──────────────────────────────────────────
create table public.board_nodes (
  id uuid primary key default gen_random_uuid(),
  board_item_id uuid not null references public.items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'card' check (kind in ('card','group','ref')),
  x double precision not null default 0,
  y double precision not null default 0,
  w double precision not null default 220,
  h double precision not null default 120,
  title text,
  body text,
  color text,
  ref_item_id uuid references public.items(id) on delete set null
);
create index board_nodes_board_idx on public.board_nodes(board_item_id);

create table public.board_edges (
  id uuid primary key default gen_random_uuid(),
  board_item_id uuid not null references public.items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source uuid not null references public.board_nodes(id) on delete cascade,
  target uuid not null references public.board_nodes(id) on delete cascade,
  label text
);
create index board_edges_board_idx on public.board_edges(board_item_id);

-- ── links (관계·백링크·복선) ──────────────────────────────────────────
create table public.links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_item uuid not null references public.items(id) on delete cascade,
  to_item uuid not null references public.items(id) on delete cascade,
  rel text not null default 'relation' check (rel in ('relation','plant','payoff','ref')),
  label text,
  created_at timestamptz not null default now()
);
create index links_project_idx on public.links(project_id);
create index links_from_idx on public.links(from_item);
create index links_to_idx on public.links(to_item);

-- ── foreshadow (복선 원장) ────────────────────────────────────────────
create table public.foreshadow (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null,
  content text,
  reveal_at text,
  status text not null default 'hidden' check (status in ('hidden','hinted','paid'))
);
create index foreshadow_project_idx on public.foreshadow(project_id);

-- ── tasks (작업) ──────────────────────────────────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  title text not null default '',
  done boolean not null default false,
  due_date date,
  scheduled_at date,
  bucket text not null default 'inbox' check (bucket in ('inbox','today','upcoming')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index tasks_project_idx on public.tasks(project_id);

-- ── snapshots (문서 기록) ─────────────────────────────────────────────
create table public.snapshots (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  content jsonb,
  label text,
  created_at timestamptz not null default now()
);
create index snapshots_item_idx on public.snapshots(item_id);

-- ── RLS ───────────────────────────────────────────────────────────────
-- 소유자 판정 헬퍼: 해당 project가 현재 사용자 소유인지
create or replace function public.owns_project(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects p where p.id = pid and p.owner = auth.uid());
$$;

alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.labels        enable row level security;
alter table public.statuses      enable row level security;
alter table public.items         enable row level security;
alter table public.documents     enable row level security;
alter table public.sheets        enable row level security;
alter table public.board_nodes   enable row level security;
alter table public.board_edges   enable row level security;
alter table public.links         enable row level security;
alter table public.foreshadow    enable row level security;
alter table public.tasks         enable row level security;
alter table public.snapshots     enable row level security;

-- profiles: 본인만
create policy profiles_self on public.profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- projects: 소유자만
create policy projects_owner on public.projects
  for all using (owner = auth.uid()) with check (owner = auth.uid());

-- project_id 기반 테이블: owns_project 로 일괄 적용
do $$
declare t text;
begin
  foreach t in array array[
    'labels','statuses','items','documents','sheets',
    'board_nodes','board_edges','links','foreshadow','tasks','snapshots'
  ] loop
    execute format(
      'create policy %1$s_owner on public.%1$s for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));',
      t
    );
  end loop;
end $$;

-- ── Realtime ──────────────────────────────────────────────────────────
-- 다기기 동기화를 위해 변경 사항을 브로드캐스트
alter publication supabase_realtime add table
  public.projects, public.items, public.documents, public.sheets,
  public.labels, public.statuses, public.board_nodes, public.board_edges,
  public.links, public.foreshadow, public.tasks, public.snapshots;
