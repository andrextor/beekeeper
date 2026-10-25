-- Fixes from docs/superpowers/audits/2026-10-26-b2-code-review.md.

-- F1: code_hash is a sha256 of a 40-bit code, reversible offline, so no client may read it.
revoke select on public.organization_invites from authenticated;
grant select (id, organization_id, label, role, invited_by, created_at, expires_at, accepted_at, accepted_by, revoked_at)
  on public.organization_invites to authenticated;

-- F7: policies take set-returning helpers inside (select …), so Postgres evaluates them once per query, not per row.
create function private.my_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id from public.organization_members m where m.user_id = (select auth.uid());
$$;

create function private.co_member_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct theirs.user_id
  from public.organization_members mine
  join public.organization_members theirs on theirs.organization_id = mine.organization_id
  where mine.user_id = (select auth.uid());
$$;

revoke execute on function private.my_organization_ids(), private.co_member_ids() from public;
grant execute on function private.my_organization_ids(), private.co_member_ids() to authenticated;

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or id in (select private.co_member_ids())
    or (select private.is_platform_admin())
  );

drop policy organizations_select on public.organizations;
create policy organizations_select on public.organizations for select to authenticated
  using (id in (select private.my_organization_ids()) or (select private.is_platform_admin()));

drop policy organization_members_select on public.organization_members;
create policy organization_members_select on public.organization_members for select to authenticated
  using (organization_id in (select private.my_organization_ids()) or (select private.is_platform_admin()));

drop policy organization_invites_select on public.organization_invites;
create policy organization_invites_select on public.organization_invites for select to authenticated
  using (private.has_role(organization_id, 'owner') or (select private.is_platform_admin()));

-- Replaced by the set-returning helpers above; nothing references them any more.
drop function private.can_read(uuid);
drop function private.shares_org(uuid);

-- F8: helpers called only from security definer RPCs run as the function owner; clients need no execute on them.
revoke execute on function
  private.require_user(),
  private.require_owner(uuid),
  private.require_role_value(text),
  private.lock_organization(uuid),
  private.owner_count(uuid)
from authenticated;

-- F4: a soft-deleted organization accepts no owner action.
create or replace function private.require_owner(p_organization_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_role(p_organization_id, 'owner') then
    raise exception 'Solo el propietario de la organización puede hacer esto.'
      using errcode = 'P0001', detail = 'not_owner';
  end if;
  if exists (select 1 from public.organizations where id = p_organization_id and deleted_at is not null) then
    raise exception 'La organización fue eliminada.' using errcode = 'P0001', detail = 'organization_deleted';
  end if;
end;
$$;

-- F5: insert-then-check, so a duplicate or parallel retry returns the id instead of a raw 23505.
create or replace function public.create_organization(p_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_name text := btrim(p_name);
begin
  if p_id is null then
    raise exception 'Falta el identificador de la organización.' using errcode = 'P0001', detail = 'invalid_id';
  end if;
  if v_name is null or char_length(v_name) not between 1 and 120 then
    raise exception 'El nombre debe tener entre 1 y 120 caracteres.' using errcode = 'P0001', detail = 'invalid_name';
  end if;

  insert into public.organizations (id, name, created_by) values (p_id, v_name, v_uid)
  on conflict (id) do nothing;

  if found then
    insert into public.organization_members (organization_id, user_id, role) values (p_id, v_uid, 'owner');
    return p_id;
  end if;

  if private.has_role(p_id, 'owner') then
    return p_id;
  end if;
  raise exception 'Ese identificador ya está en uso.' using errcode = 'P0001', detail = 'id_taken';
end;
$$;

-- F2: lock the invite and re-check it is pending, so a revoke racing an accept cannot report success on an accepted invite.
create or replace function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  perform private.require_user();

  select organization_id into v_organization_id from public.organization_invites
  where id = p_invite_id and accepted_at is null and revoked_at is null
  for update;

  if v_organization_id is null then
    raise exception 'La invitación ya no está pendiente.' using errcode = 'P0001', detail = 'invite_not_pending';
  end if;

  perform private.require_owner(v_organization_id);
  update public.organization_invites set revoked_at = now() where id = p_invite_id;
end;
$$;

-- F4 + F6: a deleted organization's codes are invalid, and membership changes take the organization lock.
create or replace function public.accept_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_invite public.organization_invites;
begin
  select i.* into v_invite from public.organization_invites i
  join public.organizations o on o.id = i.organization_id and o.deleted_at is null
  where i.code_hash = private.hash_invite_code(p_code)
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
  for update of i;

  -- Unknown, used, revoked, expired and deleted-organization codes look the same, so a guess learns nothing.
  if v_invite.id is null then
    raise exception 'El código no es válido, ya se usó o venció. Pide uno nuevo al propietario.'
      using errcode = 'P0001', detail = 'invalid_code';
  end if;

  perform private.lock_organization(v_invite.organization_id);

  insert into public.organization_members as m (organization_id, user_id, role)
  values (v_invite.organization_id, v_uid, v_invite.role)
  on conflict (organization_id, user_id) do update
    set role = case when m.role = 'owner' or excluded.role = 'owner' then 'owner' else 'reviewer' end;

  update public.organization_invites set accepted_at = now(), accepted_by = v_uid where id = v_invite.id;
  return v_invite.organization_id;
end;
$$;

-- F3: take the lock before authorizing, so a caller demoted while waiting is refused.
create or replace function public.set_member_role(p_organization_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_role text;
begin
  perform private.require_user();
  perform private.require_role_value(p_role);
  perform private.lock_organization(p_organization_id);
  perform private.require_owner(p_organization_id);

  select role into v_current_role from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id;

  if v_current_role is null then
    raise exception 'Esa persona no es miembro de la organización.' using errcode = 'P0001', detail = 'not_member';
  end if;

  if v_current_role = 'owner' and p_role <> 'owner' and private.owner_count(p_organization_id) = 1 then
    raise exception 'La organización debe tener al menos un propietario.' using errcode = 'P0001', detail = 'last_owner';
  end if;

  update public.organization_members set role = p_role
  where organization_id = p_organization_id and user_id = p_user_id;
end;
$$;

create or replace function public.remove_member(p_organization_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_current_role text;
begin
  perform private.lock_organization(p_organization_id);

  if p_user_id <> v_uid and not private.has_role(p_organization_id, 'owner') then
    raise exception 'No tienes permiso para quitar a esta persona.' using errcode = 'P0001', detail = 'not_allowed';
  end if;

  select role into v_current_role from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id;

  if v_current_role is null then
    raise exception 'Esa persona no es miembro de la organización.' using errcode = 'P0001', detail = 'not_member';
  end if;

  if v_current_role = 'owner' and private.owner_count(p_organization_id) = 1 then
    raise exception 'La organización debe tener al menos un propietario.' using errcode = 'P0001', detail = 'last_owner';
  end if;

  delete from public.organization_members where organization_id = p_organization_id and user_id = p_user_id;
end;
$$;
