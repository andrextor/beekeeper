-- B7: gaps found by the mobile specs (docs/superpowers/specs/2026-10-25-backend-07-api-gaps-design.md).

-- BEFORE INSERT fires on every upsert, so this check runs on each push even when the row exists. A soft-deleted
-- parent still takes a soft-deleted child (a tombstone pushed after someone else deleted the parent); the
-- matched column is checked either way. A deleted parent gets its own detail so clients can tell it from a
-- broken link (parent_mismatch, a bug worth surfacing).
create or replace function private.check_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_id uuid := (to_jsonb(new) ->> tg_argv[1])::uuid;
  v_match text := coalesce(tg_argv[2], 'organization_id');
  v_parent_value text;
  v_parent_deleted_at timestamptz;
begin
  if v_parent_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
    and v_parent_id is not distinct from (to_jsonb(old) ->> tg_argv[1])::uuid
    and (to_jsonb(new) ->> v_match) is not distinct from (to_jsonb(old) ->> v_match)
    and not (old.deleted_at is not null and new.deleted_at is null) then
    return new;
  end if;

  execute format('select %I::text, deleted_at from public.%I where id = $1 for share', v_match, tg_argv[0])
    into v_parent_value, v_parent_deleted_at
    using v_parent_id;

  if v_parent_value is distinct from (to_jsonb(new) ->> v_match) then
    raise exception 'El registro relacionado no existe o es de otra organización.'
      using errcode = 'P0001', detail = 'parent_mismatch';
  end if;
  if v_parent_deleted_at is not null and new.deleted_at is null then
    raise exception 'El registro relacionado fue eliminado.' using errcode = 'P0001', detail = 'parent_deleted';
  end if;
  return new;
end;
$$;

-- Memberships of a soft-deleted organization grant nothing. The rule lives only in my_organization_ids; the
-- other helpers go through it. They are stable, so inside the owner's own soft-delete update they still see
-- the organization as live and the update passes.
create or replace function private.my_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id and o.deleted_at is null
  where m.user_id = (select auth.uid());
$$;

create or replace function private.is_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_organization_id in (select private.my_organization_ids());
$$;

create or replace function private.has_role(p_organization_id uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.role = p_role
      and p_organization_id in (select private.my_organization_ids())
  );
$$;

create or replace function private.co_member_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct m.user_id
  from public.organization_members m
  where m.organization_id in (select private.my_organization_ids());
$$;

-- has_role no longer sees a deleted organization, so its owners are told so before the generic refusal.
create or replace function private.require_owner(p_organization_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.organizations o
    join public.organization_members m on m.organization_id = o.id
    where o.id = p_organization_id and o.deleted_at is not null
      and m.user_id = (select auth.uid()) and m.role = 'owner'
  ) then
    raise exception 'La organización fue eliminada.' using errcode = 'P0001', detail = 'organization_deleted';
  end if;
  if not private.has_role(p_organization_id, 'owner') then
    raise exception 'Solo el propietario de la organización puede hacer esto.'
      using errcode = 'P0001', detail = 'not_owner';
  end if;
end;
$$;
