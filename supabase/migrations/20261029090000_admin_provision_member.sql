-- A6: the second half of creating an account from the admin panel. Only the admin-create-user Edge Function
-- calls it (as service_role) right after creating the Auth user; no client role can execute it.

create function public.admin_provision_member(
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
  if not coalesce((select p.is_platform_admin from public.profiles p where p.id = p_actor_id for share), false) then
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

revoke execute on function public.admin_provision_member(uuid, uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_provision_member(uuid, uuid, text, text, uuid, text) to service_role;
