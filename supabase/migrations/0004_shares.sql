-- 단계 2: 문서 공유 링크
-- 소유자가 문서별 공개 토큰을 발급한다. 공개 읽기는 RLS를 우회하는
-- security definer RPC(get_shared_document)로만 가능하며, 테이블 직접 접근은 소유자로 제한한다.

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index shares_project_idx on public.shares(project_id);
create unique index shares_item_idx on public.shares(item_id);

alter table public.shares enable row level security;
create policy shares_owner on public.shares
  for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));

-- 공개 읽기: 토큰으로 제목+본문만 노출 (만료 검사 포함)
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
