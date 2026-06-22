-- 플롯보드 데이터형 컬럼(막) + 리치 파트 카드 필드
-- 컬럼(막)은 kind='group' 노드로 저장하고(title=컬럼 제목, body=부제, ord=순서),
-- 파트 카드(kind='card')는 col_id 로 소속 컬럼을 참조한다. 컬럼 삭제 시 카드도 함께 삭제.

alter table public.board_nodes
  add column if not exists col_id uuid references public.board_nodes(id) on delete cascade;

-- 카드 부가 필드: 태그 / 연결 문서 / 언급(멘션) 항목
alter table public.board_nodes
  add column if not exists tags text[] not null default '{}';
alter table public.board_nodes
  add column if not exists doc_ids uuid[] not null default '{}';
alter table public.board_nodes
  add column if not exists mention_ids uuid[] not null default '{}';

create index if not exists board_nodes_col_idx on public.board_nodes(col_id);
