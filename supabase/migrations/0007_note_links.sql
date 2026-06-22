-- 노트 전용 연결: 노트(items.type='notes')가 특정 항목(문서·플롯보드 등)에 묶일 수 있도록
-- linked_item_id 추가. null이면 '그냥 작성된 노트'(독립 노트). 대상 삭제 시 독립 노트로 강등.

alter table public.items
  add column if not exists linked_item_id uuid references public.items(id) on delete set null;

create index if not exists items_linked_idx on public.items(linked_item_id);
