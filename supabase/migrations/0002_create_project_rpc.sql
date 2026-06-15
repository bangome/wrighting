-- 새 작품 생성 RPC: 작품 + 기본 폴더/라벨/상태를 한 번에 스캐폴딩한다.
-- 스크린샷의 기본 트리(캐릭터·문서·플롯·리서치 자료)와 라벨·상태를 시드한다.

create or replace function public.create_project(p_title text)
returns public.projects
language plpgsql security definer set search_path = public as $$
declare
  proj public.projects;
  s_draft uuid;
begin
  insert into public.projects (owner, title)
  values (auth.uid(), coalesce(nullif(trim(p_title), ''), '제목 없는 작품'))
  returning * into proj;

  -- 기본 폴더 (루트)
  insert into public.items (project_id, type, title, icon, folder_view, sort_order) values
    (proj.id, 'folder', '캐릭터',        'users',   'grid', 0),
    (proj.id, 'folder', '문서',          'folder',  'grid', 1),
    (proj.id, 'folder', '플롯',          'route',   'list', 2),
    (proj.id, 'folder', '리서치 자료',   'archive', 'list', 3);

  -- 기본 라벨 (타임라인 색상 레인)
  insert into public.labels (project_id, name, color, sort_order) values
    (proj.id, '빨간색', '#cf6a6a', 0),
    (proj.id, '주황색', '#d6924a', 1),
    (proj.id, '노란색', '#d7b36a', 2),
    (proj.id, '초록색', '#5fae7a', 3),
    (proj.id, '파란색', '#5b8fd6', 4);

  -- 기본 상태
  insert into public.statuses (project_id, name, color, sort_order) values
    (proj.id, '구상', '#888888', 0),
    (proj.id, '초안', '#d6924a', 1),
    (proj.id, '검토', '#5b8fd6', 2),
    (proj.id, '완료됨', '#5fae7a', 3)
  returning id into s_draft;

  return proj;
end $$;
