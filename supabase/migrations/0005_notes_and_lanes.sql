-- 단계 3: 노트 파일 타입 + 플롯보드 막/단계 레인

-- #6 노트 타입 추가 (items.type CHECK 갱신)
alter table public.items drop constraint if exists items_type_check;
alter table public.items add constraint items_type_check
  check (type in ('folder','document','sheet','plotboard','canvas','notes'));

-- #4 플롯보드 막/단계 레인: 카드의 단계(lane)와 레인 내 순서(ord)
alter table public.board_nodes add column if not exists lane int;
alter table public.board_nodes add column if not exists ord int not null default 0;
