-- 상하관계(계층) 링크: 항목을 다른 항목의 하위로 옮기면 두 항목을 'parent' 링크로 연결한다.
-- from_item = 상위, to_item = 하위. auto=true 로 표시해 트리 구조와 동기화한다.
alter table public.links drop constraint if exists links_rel_check;
alter table public.links
  add constraint links_rel_check check (rel in ('relation', 'plant', 'payoff', 'ref', 'parent'));

-- 한 하위 항목에는 자동 상하관계 링크가 하나만 존재 (부모는 유일)
create unique index if not exists links_parent_child_uniq
  on public.links(to_item)
  where rel = 'parent' and auto = true;
