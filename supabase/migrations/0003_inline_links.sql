-- 단계 1: 본문 인라인 멘션이 생성하는 링크 추적
-- 멘션(@/[[)으로 자동 생성된 링크는 auto=true 로 표시해
-- 사용자가 수동으로 추가한 '관계' 링크와 구분하고, 멘션 삭제 시 동기화한다.
alter table public.links add column if not exists auto boolean not null default false;
