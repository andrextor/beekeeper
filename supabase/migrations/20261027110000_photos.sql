create table public.photos (
  id uuid primary key,
  organization_id uuid not null references public.organizations,
  hive_id uuid not null references public.hives,
  inspection_id uuid references public.inspections,
  -- The path is what storage policies authorize, so it is derived from the row, never free text.
  -- It contains the id, so it is unique without an index of its own.
  storage_path text not null,
  taken_at timestamptz not null,
  width integer
    constraint photos_width_check check (width between 1 and 10000),
  height integer
    constraint photos_height_check check (height between 1 and 10000),
  bytes integer
    constraint photos_bytes_check check (bytes between 1 and 5242880),
  caption text
    constraint photos_caption_check check (char_length(caption) <= 300),
  created_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint photos_storage_path_check check (
    storage_path = organization_id::text || '/' || hive_id::text || '/' || id::text || '.jpg'
  )
);

create index photos_sync_idx on public.photos (organization_id, updated_at);
create index photos_hive_idx on public.photos (hive_id, taken_at desc, id desc) where deleted_at is null;

-- Shared by inspections (linked events stay on its hive) and photos (the file path holds the hive).
create function private.check_fixed_hive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.hive_id is distinct from old.hive_id then
    raise exception 'Un registro no puede cambiar de colmena.' using errcode = 'P0001', detail = 'immutable_column';
  end if;
  return new;
end;
$$;

revoke execute on function private.check_fixed_hive() from public;

-- 25: an immutability error wins over the parent check at 30 (B5 review F1).
drop trigger inspections_40_fixed_hive on public.inspections;
create trigger inspections_25_fixed_hive before update on public.inspections
  for each row execute function private.check_fixed_hive();
drop function private.check_inspection_hive();

-- Notes, events and photos recorded during an inspection go with it. security definer: a reviewer deleting
-- their own inspection also hides linked rows written by others. Restoring the inspection restores none.
create function private.delete_inspection_children()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.hive_events set deleted_at = new.deleted_at
  where inspection_id = new.id and deleted_at is null;
  update public.photos set deleted_at = new.deleted_at
  where inspection_id = new.id and deleted_at is null;
  return null;
end;
$$;

revoke execute on function private.delete_inspection_children() from public;

drop trigger inspections_70_delete_events on public.inspections;
create trigger inspections_70_delete_children after update of deleted_at on public.inspections
  for each row when (old.deleted_at is null and new.deleted_at is not null)
  execute function private.delete_inspection_children();
drop function private.delete_inspection_events();

create trigger photos_10_set_timestamps before insert or update on public.photos
  for each row execute function private.set_timestamps();
create trigger photos_20_force_author before insert or update on public.photos
  for each row execute function private.force_author();
create trigger photos_25_fixed_hive before update on public.photos
  for each row execute function private.check_fixed_hive();
create trigger photos_30_check_hive before insert or update on public.photos
  for each row execute function private.check_parent('hives', 'hive_id');
create trigger photos_50_check_inspection before insert or update on public.photos
  for each row execute function private.check_parent('inspections', 'inspection_id', 'hive_id');
create trigger photos_60_check_date before insert or update of taken_at on public.photos
  for each row execute function private.check_not_future('taken_at');

alter table public.photos enable row level security;
revoke all on public.photos from anon, authenticated;
grant select, insert, update on public.photos to authenticated;

create policy photos_select on public.photos for select to authenticated
  using (organization_id in (select private.my_organization_ids()) or (select private.is_platform_admin()));

create policy photos_insert_member on public.photos for insert to authenticated
  with check (private.is_member(organization_id));

create policy photos_update_owner_or_author on public.photos for update to authenticated
  using (
    private.has_role(organization_id, 'owner')
    or (created_by = (select auth.uid()) and private.is_member(organization_id))
  )
  with check (private.is_member(organization_id));
