insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hive-photos', 'hive-photos', false, 5242880, array['image/jpeg']);

-- First folder of an object name as uuid; null (not a cast error) when it is not one.
create function private.path_org(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' then left(p_name, 36)::uuid
  end;
$$;

-- {organization_id}/{hive_id}/{photo_id}.jpg or .thumb.jpg, by a member, into a live hive of that organization.
-- case, not and: Postgres does not promise to evaluate the pattern before the casts.
create function private.can_upload_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_name ~ '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/){2}[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.thumb)?\.jpg$'
    then private.is_member(left(p_name, 36)::uuid)
      and exists (
        select 1 from public.hives h
        where h.id = substr(p_name, 38, 36)::uuid
          and h.organization_id = left(p_name, 36)::uuid
          and h.deleted_at is null
      )
    else false
  end;
$$;

revoke execute on function private.path_org(text), private.can_upload_photo(text) from public;
grant execute on function private.path_org(text), private.can_upload_photo(text) to authenticated;

create policy hive_photos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'hive-photos'
    and (private.path_org(name) in (select private.my_organization_ids()) or (select private.is_platform_admin()))
  );

create policy hive_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'hive-photos' and private.can_upload_photo(name));

-- Retries upload with upsert, which updates the uploader's own object; it can never land outside an allowed path.
-- No delete policy: history is never hard-deleted by the app.
create policy hive_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'hive-photos' and owner_id = (select auth.uid())::text and private.can_upload_photo(name))
  with check (bucket_id = 'hive-photos' and private.can_upload_photo(name));
