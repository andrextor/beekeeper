-- A7: the platform admin fixes accounts and memberships. History is never touched: "delete" is deactivate.

alter table public.profiles add column deactivated_at timestamptz;

-- A deactivated admin keeps a valid token for up to an hour: it must not keep admin powers (reads included).
create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_platform_admin and p.deactivated_at is null from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- A farm needs an owner who can still sign in: deactivated owners do not count (B2 RPCs and A7 alike).
create or replace function private.owner_count(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.organization_members m join public.profiles p on p.id = m.user_id
  where m.organization_id = p_organization_id and m.role = 'owner' and p.deactivated_at is null;
$$;

-- Same rule for the service_role functions, which get the actor's id instead of a session.
create function private.is_active_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_platform_admin and p.deactivated_at is null from public.profiles p where p.id = p_user_id for share),
    false
  );
$$;

revoke execute on function private.is_active_admin(uuid) from public;

-- Locks every admin row, so two admins changing flags or deactivating at once cannot leave zero active admins.
create function private.lock_platform_admins()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- perform walks every row (a plain SQL function would stop at the first and lock only one).
  perform 1 from public.profiles where is_platform_admin for update;
end;
$$;

create function private.active_admin_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.profiles where is_platform_admin and deactivated_at is null;
$$;

revoke execute on function private.lock_platform_admins(), private.active_admin_count() from public;

create function public.admin_set_display_name(p_user_id uuid, p_display_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(p_display_name);
begin
  perform private.require_platform_admin();
  if v_name is null or char_length(v_name) not between 1 and 80 then
    raise exception 'El nombre debe tener entre 1 y 80 caracteres.' using errcode = 'P0001', detail = 'invalid_name';
  end if;
  update public.profiles set display_name = v_name where id = p_user_id;
  if not found then
    raise exception 'La cuenta no existe.' using errcode = 'P0001', detail = 'user_not_found';
  end if;
end;
$$;

-- Shared by the three membership RPCs: lock first, then who asks, then the farm.
create function private.admin_lock_organization(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.lock_organization(p_organization_id);
  perform private.require_platform_admin();
  if not exists (
    select 1 from public.organizations o where o.id = p_organization_id and o.deleted_at is null
  ) then
    raise exception 'Esa finca ya no existe.' using errcode = 'P0001', detail = 'organization_not_found';
  end if;
end;
$$;

revoke execute on function private.admin_lock_organization(uuid) from public;

create function public.admin_set_member_role(p_organization_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_role text;
begin
  perform private.require_role_value(p_role);
  perform private.admin_lock_organization(p_organization_id);

  select role into v_current_role from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id;
  if v_current_role is null then
    raise exception 'Esa persona no es miembro de la finca.' using errcode = 'P0001', detail = 'not_member';
  end if;
  if v_current_role = 'owner' and p_role <> 'owner' and private.owner_count(p_organization_id) = 1 then
    raise exception 'La finca debe tener al menos un propietario.' using errcode = 'P0001', detail = 'last_owner';
  end if;

  update public.organization_members set role = p_role
  where organization_id = p_organization_id and user_id = p_user_id;
end;
$$;

create function public.admin_add_member(p_organization_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_role_value(p_role);
  perform private.admin_lock_organization(p_organization_id);
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'La cuenta no existe.' using errcode = 'P0001', detail = 'user_not_found';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (p_organization_id, p_user_id, p_role)
  on conflict (organization_id, user_id) do nothing;
  if not found then
    raise exception 'Ya pertenece a esa finca.' using errcode = 'P0001', detail = 'already_member';
  end if;
end;
$$;

create function public.admin_remove_member(p_organization_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_role text;
begin
  perform private.admin_lock_organization(p_organization_id);

  select role into v_current_role from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id;
  if v_current_role is null then
    raise exception 'Esa persona no es miembro de la finca.' using errcode = 'P0001', detail = 'not_member';
  end if;
  if v_current_role = 'owner' and private.owner_count(p_organization_id) = 1 then
    raise exception 'La finca debe tener al menos un propietario.' using errcode = 'P0001', detail = 'last_owner';
  end if;

  delete from public.organization_members where organization_id = p_organization_id and user_id = p_user_id;
end;
$$;

create function public.admin_set_platform_admin(p_user_id uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.lock_platform_admins();
  perform private.require_platform_admin();
  if p_value is null then
    raise exception 'Falta el valor.' using errcode = 'P0001', detail = 'invalid_value';
  end if;
  if not p_value and p_user_id = auth.uid() then
    raise exception 'No puedes quitarte tu propio permiso de administrador.' using errcode = 'P0001', detail = 'own_admin';
  end if;

  update public.profiles set is_platform_admin = p_value where id = p_user_id;
  if not found then
    raise exception 'La cuenta no existe.' using errcode = 'P0001', detail = 'user_not_found';
  end if;
  if private.active_admin_count() = 0 then
    raise exception 'Debe quedar al menos un administrador activo.' using errcode = 'P0001', detail = 'last_admin';
  end if;
end;
$$;

-- Only the admin-update-user Edge Function calls this (service_role), next to the Auth ban it mirrors.
create function public.admin_set_deactivated(p_actor_id uuid, p_user_id uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Lock order: the farms the user owns, then every admin; checks come after the locks.
  if p_value then
    perform private.lock_organization(m.organization_id)
    from public.organization_members m where m.user_id = p_user_id and m.role = 'owner'
    order by m.organization_id;
  end if;
  perform private.lock_platform_admins();
  if not private.is_active_admin(p_actor_id) then
    raise exception 'Solo administradores de la plataforma.' using errcode = 'P0001', detail = 'not_platform_admin';
  end if;
  if p_value and p_user_id = p_actor_id then
    raise exception 'No puedes desactivar tu propia cuenta.' using errcode = 'P0001', detail = 'own_account';
  end if;
  if p_value and exists (
    select 1 from public.organization_members m join public.organizations o on o.id = m.organization_id
    where m.user_id = p_user_id and m.role = 'owner' and o.deleted_at is null
      and private.owner_count(m.organization_id) = 1
  ) then
    raise exception 'Es el único propietario activo de una finca. Agrega otro propietario antes.'
      using errcode = 'P0001', detail = 'last_owner';
  end if;

  update public.profiles set deactivated_at = case when p_value then coalesce(deactivated_at, now()) end
  where id = p_user_id;
  if not found then
    raise exception 'La cuenta no existe.' using errcode = 'P0001', detail = 'user_not_found';
  end if;
  if private.active_admin_count() = 0 then
    raise exception 'Debe quedar al menos un administrador activo.' using errcode = 'P0001', detail = 'last_admin';
  end if;
end;
$$;

revoke execute on function
  public.admin_set_display_name(uuid, text),
  public.admin_set_member_role(uuid, uuid, text),
  public.admin_add_member(uuid, uuid, text),
  public.admin_remove_member(uuid, uuid),
  public.admin_set_platform_admin(uuid, boolean),
  public.admin_set_deactivated(uuid, uuid, boolean)
from public, anon, authenticated;
grant execute on function
  public.admin_set_display_name(uuid, text),
  public.admin_set_member_role(uuid, uuid, text),
  public.admin_add_member(uuid, uuid, text),
  public.admin_remove_member(uuid, uuid),
  public.admin_set_platform_admin(uuid, boolean)
to authenticated;
grant execute on function public.admin_set_deactivated(uuid, uuid, boolean) to service_role;

-- A6's account creation: a deactivated admin cannot create accounts either.
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
  if p_role not in ('owner', 'reviewer', 'admin') or p_role is null then
    raise exception 'Tipo de usuario no válido.' using errcode = 'P0001', detail = 'invalid_role';
  end if;
  -- Lock first, then check who asks (tenancy rule): an admin demoted while waiting is refused.
  if p_role = 'reviewer' then
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
  insert into public.organization_members (organization_id, user_id, role) values (p_organization_id, p_user_id, 'reviewer');
  return p_organization_id;
end;
$$;

-- The lists show who is deactivated. The return type changes, so admin_list_users is dropped and re-created.
drop function public.admin_list_users(text, integer, integer);

create function public.admin_list_users(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  display_name text,
  is_platform_admin boolean,
  deactivated_at timestamptz,
  organizations jsonb,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_pattern text := private.like_pattern(p_search);
begin
  perform private.require_platform_admin();
  return query
  select
    p.id,
    p.email,
    p.display_name,
    p.is_platform_admin,
    p.deactivated_at,
    coalesce((
      select jsonb_agg(
        jsonb_build_object('id', o.id, 'name', o.name, 'role', m.role, 'deleted_at', o.deleted_at) order by o.name
      )
      from public.organization_members m join public.organizations o on o.id = m.organization_id
      where m.user_id = p.id
    ), '[]'::jsonb),
    p.created_at,
    count(*) over ()
  from public.profiles p
  where v_pattern is null or p.email ilike v_pattern or p.display_name ilike v_pattern
  order by 7 desc, 1
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.admin_list_users(text, integer, integer) from public;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;

create or replace function public.admin_organization_summary(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_organization jsonb;
begin
  perform private.require_platform_admin();

  select jsonb_build_object('id', o.id, 'name', o.name, 'created_at', o.created_at, 'deleted_at', o.deleted_at)
  into v_organization
  from public.organizations o where o.id = p_organization_id;

  if v_organization is null then
    return null;
  end if;

  return jsonb_build_object(
    'organization', v_organization,
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', m.user_id, 'email', p.email, 'display_name', p.display_name, 'role', m.role,
          'joined_at', m.created_at, 'deactivated_at', p.deactivated_at
        ) order by m.role, p.email
      )
      from public.organization_members m join public.profiles p on p.id = m.user_id
      where m.organization_id = p_organization_id
    ), '[]'::jsonb),
    -- Explicit columns: code_hash is never granted.
    'pending_invites', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', i.id, 'label', i.label, 'role', i.role, 'created_at', i.created_at, 'expires_at', i.expires_at)
        order by i.created_at desc
      )
      from public.organization_invites i
      where i.organization_id = p_organization_id
        and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    ), '[]'::jsonb),
    'apiaries', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'hives_active', (
            select count(*) from public.hives h where h.apiary_id = a.id and h.deleted_at is null and h.status = 'active'
          ),
          'hives_total', (select count(*) from public.hives h where h.apiary_id = a.id and h.deleted_at is null),
          'last_inspection_at', (
            select max(i.inspected_at) from public.inspections i join public.hives h on h.id = i.hive_id
            where h.apiary_id = a.id and h.deleted_at is null and i.deleted_at is null
          )
        ) order by a.name
      )
      from public.apiaries a
      where a.organization_id = p_organization_id and a.deleted_at is null
    ), '[]'::jsonb)
  );
end;
$$;
