-- 캔버스 확장: 도형(kind='shape') 노드 + 도형 종류 컬럼
-- ref(기존 문서/시트 참조 카드)는 0001에서 이미 허용됨. 여기서는 'shape'를 추가한다.
-- shape 컬럼: 'rectangle' | 'ellipse' | 'diamond' | 'roundRect' (kind='shape'일 때만 의미).

alter table public.board_nodes
  drop constraint if exists board_nodes_kind_check;

alter table public.board_nodes
  add constraint board_nodes_kind_check
  check (kind in ('card', 'group', 'ref', 'shape'));

alter table public.board_nodes
  add column if not exists shape text;
