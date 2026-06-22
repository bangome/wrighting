-- 시트 하위 종류 확장: event(이벤트) / worldview(세계관) / other(기타) 추가.
-- 기존 'concept'(개념)은 구버전 호환을 위해 유지한다.
-- items.sheet_subtype 의 인라인 CHECK 제약(items_sheet_subtype_check)을 교체.

alter table public.items drop constraint if exists items_sheet_subtype_check;
alter table public.items add constraint items_sheet_subtype_check
  check (sheet_subtype in (
    'character','place','item','organization','concept','event','worldview','other'
  ));
