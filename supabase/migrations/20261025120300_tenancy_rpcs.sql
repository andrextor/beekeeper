create function private.require_owner(p_organization_id uuid)
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
end;
$$;

create function private.require_role_value(p_role text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_role is null or p_role not in ('owner', 'reviewer') then
    raise exception 'El rol debe ser propietario o revisor.' using errcode = 'P0001', detail = 'invalid_role';
  end if;
end;
$$;

-- Serializes membership changes of one organization so two owners cannot demote or remove each other at once.
create function private.lock_organization(p_organization_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select null::void from public.organizations where id = p_organization_id for update;
$$;

create function private.owner_count(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.organization_members
  where organization_id = p_organization_id and role = 'owner';
$$;

revoke execute on function
  private.require_owner(uuid),
  private.require_role_value(text),
  private.lock_organization(uuid),
  private.owner_count(uuid)
from public;

grant execute on function
  private.require_owner(uuid),
  private.require_role_value(text),
  private.lock_organization(uuid),
  private.owner_count(uuid)
to authenticated;

create function public.create_organization(p_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_name text := btrim(p_name);
begin
  if v_name is null or char_length(v_name) not between 1 and 120 then
    raise exception 'El nombre debe tener entre 1 y 120 caracteres.' using errcode = 'P0001', detail = 'invalid_name';
  end if;

  if exists (select 1 from public.organizations where id = p_id) then
    if private.has_role(p_id, 'owner') then
      return p_id;
    end if;
    raise exception 'Ese identificador ya está en uso.' using errcode = 'P0001', detail = 'id_taken';
  end if;

  insert into public.organizations (id, name, created_by) values (p_id, v_name, v_uid);
  insert into public.organization_members (organization_id, user_id, role) values (p_id, v_uid, 'owner');
  return p_id;
end;
$$;

create function public.invite_member(p_organization_id uuid, p_email text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_email text := lower(btrim(p_email));
  v_invite_id uuid;
begin
  perform private.require_owner(p_organization_id);
  perform private.require_role_value(p_role);

  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Escribe un correo válido.' using errcode = 'P0001', detail = 'invalid_email';
  end if;

  if exists (
    select 1 from public.organization_members m
    join public.profiles p on p.id = m.user_id
    where m.organization_id = p_organization_id and p.email = v_email
  ) then
    raise exception 'Esa persona ya es miembro de la organización.' using errcode = 'P0001', detail = 'already_member';
  end if;

  select id into v_invite_id from public.organization_invites
  where organization_id = p_organization_id and email = v_email and accepted_at is null and revoked_at is null;

  if v_invite_id is not null then
    return v_invite_id;
  end if;

  insert into public.organization_invites (organization_id, email, role, invited_by)
  values (p_organization_id, v_email, p_role, v_uid)
  returning id into v_invite_id;
  return v_invite_id;
end;
$$;

create function public.revoke_invite(p_invite_id uuid)
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
  where id = p_invite_id and accepted_at is null and revoked_at is null;

  if v_organization_id is null then
    raise exception 'La invitación ya no está pendiente.' using errcode = 'P0001', detail = 'invite_not_pending';
  end if;

  perform private.require_owner(v_organization_id);
  update public.organization_invites set revoked_at = now() where id = p_invite_id;
end;
$$;

create function public.accept_my_invites()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_email text;
  v_confirmed_at timestamptz;
begin
  select lower(u.email), u.email_confirmed_at into v_email, v_confirmed_at from auth.users u where u.id = v_uid;

  -- Without a confirmed email anyone could sign up with the invited address and take the access.
  if v_confirmed_at is null then
    raise exception 'Confirma tu correo para aceptar invitaciones.' using errcode = 'P0001', detail = 'email_not_confirmed';
  end if;

  return query
  with accepted as (
    update public.organization_invites i
    set accepted_at = now(), accepted_by = v_uid
    where i.email = v_email and i.accepted_at is null and i.revoked_at is null
    returning i.organization_id, i.role
  ),
  joined as (
    insert into public.organization_members as m (organization_id, user_id, role)
    select a.organization_id, v_uid, a.role from accepted a
    on conflict (organization_id, user_id) do update
      set role = case when m.role = 'owner' or excluded.role = 'owner' then 'owner' else 'reviewer' end
    returning m.organization_id
  )
  select j.organization_id from joined j;
end;
$$;

create function public.set_member_role(p_organization_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_role text;
begin
  perform private.require_user();
  perform private.require_owner(p_organization_id);
  perform private.require_role_value(p_role);
  perform private.lock_organization(p_organization_id);

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

create function public.remove_member(p_organization_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_current_role text;
begin
  if p_user_id <> v_uid and not private.has_role(p_organization_id, 'owner') then
    raise exception 'No tienes permiso para quitar a esta persona.' using errcode = 'P0001', detail = 'not_allowed';
  end if;

  perform private.lock_organization(p_organization_id);

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

create function public.my_memberships()
returns table (organization_id uuid, organization_name text, role text)
language sql
stable
set search_path = ''
as $$
  select m.organization_id, o.name, m.role
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = (select auth.uid()) and o.deleted_at is null
  order by o.name;
$$;

revoke execute on function
  public.create_organization(uuid, text),
  public.invite_member(uuid, text, text),
  public.revoke_invite(uuid),
  public.accept_my_invites(),
  public.set_member_role(uuid, uuid, text),
  public.remove_member(uuid, uuid),
  public.my_memberships()
from public, anon;

grant execute on function
  public.create_organization(uuid, text),
  public.invite_member(uuid, text, text),
  public.revoke_invite(uuid),
  public.accept_my_invites(),
  public.set_member_role(uuid, uuid, text),
  public.remove_member(uuid, uuid),
  public.my_memberships()
to authenticated;
