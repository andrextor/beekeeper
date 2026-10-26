insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hive-photos', 'hive-photos', false, 5242880, array['image/jpeg']);

-- A lowercase uuid, or null (not a cast error) for anything else.
create function private.as_uuid(p_text text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case when p_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p_text::uuid end;
$$;

create function private.path_org(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select private.as_uuid(split_part(p_name, '/', 1));
$$;

create function private.path_hive(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select private.as_uuid(split_part(p_name, '/', 2));
$$;

-- {organization_id}/{hive_id}/{photo_id}.jpg or .thumb.jpg, by a member, into a live hive of that organization.
-- security invoker: members already read their own hives (B5 review F7).
create function private.can_upload_photo(p_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select p_name ~ '^[^/]+/[^/]+/[^/]+\.jpg$'
    and private.as_uuid(regexp_replace(split_part(p_name, '/', 3), '(\.thumb)?\.jpg$', '')) is not null
    and coalesce(private.is_member(private.path_org(p_name)), false)
    and exists (
      select 1 from public.hives h
      where h.id = private.path_hive(p_name)
        and h.organization_id = private.path_org(p_name)
        and h.deleted_at is null
    );
$$;

revoke execute on function
  private.as_uuid(text), private.path_org(text), private.path_hive(text), private.can_upload_photo(text)
from public;
grant execute on function
  private.as_uuid(text), private.path_org(text), private.path_hive(text), private.can_upload_photo(text)
to authenticated;

create policy hive_photos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'hive-photos'
    and (private.path_org(name) in (select private.my_organization_ids()) or (select private.is_platform_admin()))
  );

create policy hive_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'hive-photos' and private.can_upload_photo(name));

-- Retries upload with upsert, which updates the uploader's own object; it can never land outside an allowed path,
-- and only until the photos row exists: after that the file is history (B5 review F2).
-- No delete policy: history is never hard-deleted by the app.
create policy hive_photos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'hive-photos'
    and owner_id = (select auth.uid())::text
    and private.can_upload_photo(name)
    and not exists (select 1 from public.photos p where p.storage_path = replace(name, '.thumb.jpg', '.jpg'))
  )
  with check (bucket_id = 'hive-photos' and private.can_upload_photo(name));
