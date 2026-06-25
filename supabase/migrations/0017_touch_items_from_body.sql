create or replace function public.touch_item_from_body()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.items
  set updated_at = now()
  where id = new.item_id;

  update public.projects
  set updated_at = now()
  where id = new.project_id;

  return new;
end $$;

drop trigger if exists documents_touch_item on public.documents;
create trigger documents_touch_item
  after update on public.documents
  for each row execute function public.touch_item_from_body();

drop trigger if exists sheets_touch_item on public.sheets;
create trigger sheets_touch_item
  after update on public.sheets
  for each row execute function public.touch_item_from_body();
