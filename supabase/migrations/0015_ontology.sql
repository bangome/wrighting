-- C안: 온톨로지 보강
-- 1. 복선(foreshadow) ↔ 항목 FK — 복선을 특정 항목(인물·사물 등)에 귀속
-- 2. 링크 관계 술어(rel) taxonomy 6종 확장

-- ── 1. foreshadow.item_id ────────────────────────────────────────────────
alter table public.foreshadow
  add column if not exists item_id uuid references public.items(id) on delete set null;

create index if not exists foreshadow_item_idx on public.foreshadow(item_id);

-- ── 2. links.rel taxonomy 확장 ───────────────────────────────────────────
-- 기존: relation | plant | payoff | ref | parent (5종)
-- 추가: causes | opposes | allies | transforms | precedes | symbolizes (6종)
alter table public.links drop constraint if exists links_rel_check;
alter table public.links add constraint links_rel_check check (
  rel in (
    -- 자동 생성 (auto=true)
    'ref',       -- 본문 멘션 자동 링크
    'parent',    -- 트리 상하관계
    -- 복선
    'plant',     -- 복선 심기
    'payoff',    -- 복선 회수
    -- 일반 관계
    'relation',  -- 기본 관계 (라벨로 구체화)
    -- 인과·시간
    'causes',    -- A가 B의 직접 원인
    'precedes',  -- A 이후 B 발생 (시간적 선후)
    -- 캐릭터·서사 역학
    'opposes',   -- 대립·갈등
    'allies',    -- 동맹·협력
    'transforms',-- A가 B의 변화/성장 계기
    -- 상징·모티프
    'symbolizes' -- A가 B를 상징·표상
  )
);
