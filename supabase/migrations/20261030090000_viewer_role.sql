-- B8: a third organization role, `viewer` ("Observador"): reads the whole organization like any member, writes nothing.
-- Spec: docs/superpowers/specs/2026-10-26-backend-08-viewer-role-design.md

alter table public.organization_members drop constraint organization_members_role_check;
alter table public.organization_members
  add constraint organization_members_role_check check (role in ('owner', 'reviewer', 'viewer'));

alter table public.organization_invites drop constraint organization_invites_role_check;
alter table public.organization_invites
  add constraint organization_invites_role_check check (role in ('owner', 'reviewer', 'viewer'));

-- create_invite, set_member_role, admin_set_member_role and admin_add_member all validate through this.
create or replace function private.require_role_value(p_role text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_role is null or p_role not in ('owner', 'reviewer', 'viewer') then
    raise exception 'El rol debe ser propietario, revisor u observador.' using errcode = 'P0001', detail = 'invalid_role';
  end if;
end;
$$;

-- Who may record history (inspections, events, notes, photos): owners and reviewers. Reads stay on is_member.
create function private.can_record(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role(p_organization_id, 'owner') or private.has_role(p_organization_id, 'reviewer');
$$;

revoke execute on function private.can_record(uuid) from public;
grant execute on function private.can_record(uuid) to authenticated;

drop policy inspections_insert_member on public.inspections;
drop policy inspections_update_owner_or_author on public.inspections;

create policy inspections_insert_recorder on public.inspections for insert to authenticated
  with check (private.can_record(organization_id));

create policy inspections_update_owner_or_author on public.inspections for update to authenticated
  using (
    private.has_role(organization_id, 'owner')
    or (created_by = (select auth.uid()) and private.can_record(organization_id))
  )
  with check (private.can_record(organization_id));

drop policy hive_events_insert_member on public.hive_events;
drop policy hive_events_update_owner_or_author on public.hive_events;

create policy hive_events_insert_recorder on public.hive_events for insert to authenticated
  with check (private.can_record(organization_id));

create policy hive_events_update_owner_or_author on public.hive_events for update to authenticated
  using (
    private.has_role(organization_id, 'owner')
    or (created_by = (select auth.uid()) and private.can_record(organization_id))
  )
  with check (private.can_record(organization_id));

drop policy photos_insert_member on public.photos;
drop policy photos_update_owner_or_author on public.photos;

create policy photos_insert_recorder on public.photos for insert to authenticated
  with check (private.can_record(organization_id));

create policy photos_update_owner_or_author on public.photos for update to authenticated
  using (
    private.has_role(organization_id, 'owner')
    or (created_by = (select auth.uid()) and private.can_record(organization_id))
  )
  with check (private.can_record(organization_id));

-- {organization_id}/{hive_id}/{photo_id}.jpg or .thumb.jpg, by an owner or reviewer, into a live hive of that organization.
create or replace function private.can_upload_photo(p_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select p_name ~ '^[^/]+/[^/]+/[^/]+\.jpg$'
    and private.as_uuid(regexp_replace(split_part(p_name, '/', 3), '(\.thumb)?\.jpg$', '')) is not null
    and coalesce(private.can_record(private.path_org(p_name)), false)
    and exists (
      select 1 from public.hives h
      where h.id = private.path_hive(p_name)
        and h.organization_id = private.path_org(p_name)
        and h.deleted_at is null
    );
$$;

-- A6's account creation learns the viewer: an account that joins an existing farm as `viewer`, like a reviewer.
create or replace function public.admin_provision_member(
  p_actor_id uuid,
  p_user_id uuid,
  p_display_name text,
  p_role text,
  p_organization_id uuid,
  p_organization_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  if p_role not in ('owner', 'reviewer', 'viewer', 'admin') or p_role is null then
    raise exception 'Tipo de usuario no válido.' using errcode = 'P0001', detail = 'invalid_role';
  end if;
  -- Lock first, then check who asks (tenancy rule): an admin demoted while waiting is refused.
  if p_role in ('reviewer', 'viewer') then
    perform private.lock_organization(p_organization_id);
  end if;
  if not private.is_active_admin(p_actor_id) then
    raise exception 'Solo administradores de la plataforma.' using errcode = 'P0001', detail = 'not_platform_admin';
  end if;

  update public.profiles set display_name = btrim(p_display_name) where id = p_user_id;
  if not found then
    raise exception 'La cuenta no existe.' using errcode = 'P0001', detail = 'user_not_found';
  end if;

  if p_role = 'admin' then
    update public.profiles set is_platform_admin = true where id = p_user_id;
    return null;
  end if;

  if p_role = 'owner' then
    v_organization_id := gen_random_uuid();
    insert into public.organizations (id, name, created_by) values (v_organization_id, btrim(p_organization_name), p_user_id);
    insert into public.organization_members (organization_id, user_id, role) values (v_organization_id, p_user_id, 'owner');
    return v_organization_id;
  end if;

  if not exists (
    select 1 from public.organizations o where o.id = p_organization_id and o.deleted_at is null
  ) then
    raise exception 'Esa finca ya no existe.' using errcode = 'P0001', detail = 'organization_not_found';
  end if;
  insert into public.organization_members (organization_id, user_id, role) values (p_organization_id, p_user_id, p_role);
  return p_organization_id;
end;
$$;
