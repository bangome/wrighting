-- 작품 표지 이미지용 스토리지 버킷 + RLS 정책
-- 표지 파일명 = 작품 id (projects.cover_path 에 저장). 공개 버킷이라 getPublicUrl 로 표시.

-- 1) 버킷 (공개 읽기)
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do update set public = true;

-- 2) RLS 정책 (재실행 안전하게 먼저 제거)
drop policy if exists "covers read" on storage.objects;
drop policy if exists "covers insert" on storage.objects;
drop policy if exists "covers update" on storage.objects;
drop policy if exists "covers delete" on storage.objects;

-- 공개 읽기 (public 버킷)
create policy "covers read" on storage.objects
  for select using (bucket_id = 'covers');

-- 쓰기/수정/삭제: 파일명(=작품 id)의 작품 소유자만
create policy "covers insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and public.owns_project((name)::uuid));

create policy "covers update" on storage.objects
  for update to authenticated
  using (bucket_id = 'covers' and public.owns_project((name)::uuid))
  with check (bucket_id = 'covers' and public.owns_project((name)::uuid));

create policy "covers delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and public.owns_project((name)::uuid));
