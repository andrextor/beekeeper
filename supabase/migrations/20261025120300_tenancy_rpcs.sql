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

-- Crockford base32 without I, L, O, U. Readers type O for 0 and I or L for 1.
create function private.normalize_invite_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g')), 'OIL', '011');
$$;

create function private.hash_invite_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(private.normalize_invite_code(p_code), 'sha256'), 'hex');
$$;

-- 256 is a multiple of 32, so byte % 32 picks every symbol with the same probability.
create function private.new_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('0123456789ABCDEFGHJKMNPQRSTVWXYZ', (get_byte(b.bytes, i) % 32) + 1, 1), '' order by i)
  from (select extensions.gen_random_bytes(8) as bytes) b, generate_series(0, 7) as i;
$$;

revoke execute on function
  private.normalize_invite_code(text),
  private.hash_invite_code(text),
  private.new_invite_code()
from public;

create function public.create_invite(p_organization_id uuid, p_role text, p_label text default null)
returns table (invite_id uuid, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_label text := nullif(btrim(p_label), '');
  v_code text;
begin
  perform private.require_owner(p_organization_id);
  perform private.require_role_value(p_role);

  if char_length(v_label) > 80 then
    raise exception 'La etiqueta puede tener hasta 80 caracteres.' using errcode = 'P0001', detail = 'invalid_label';
  end if;

  v_code := private.new_invite_code();
  return query
  insert into public.organization_invites as i (organization_id, code_hash, label, role, invited_by, expires_at)
  values (p_organization_id, private.hash_invite_code(v_code), v_label, p_role, v_uid, now() + interval '7 days')
  returning i.id, substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4), i.expires_at;
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

create function public.accept_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_invite public.organization_invites;
begin
  select * into v_invite from public.organization_invites
  where code_hash = private.hash_invite_code(p_code)
    and accepted_at is null and revoked_at is null and expires_at > now()
  for update;

  -- Unknown, used, revoked and expired codes look the same, so a guess learns nothing.
  if v_invite.id is null then
    raise exception 'El código no es válido, ya se usó o venció. Pide uno nuevo al propietario.'
      using errcode = 'P0001', detail = 'invalid_code';
  end if;

  insert into public.organization_members as m (organization_id, user_id, role)
  values (v_invite.organization_id, v_uid, v_invite.role)
  on conflict (organization_id, user_id) do update
    set role = case when m.role = 'owner' or excluded.role = 'owner' then 'owner' else 'reviewer' end;

  update public.organization_invites set accepted_at = now(), accepted_by = v_uid where id = v_invite.id;
  return v_invite.organization_id;
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
  public.create_invite(uuid, text, text),
  public.revoke_invite(uuid),
  public.accept_invite(text),
  public.set_member_role(uuid, uuid, text),
  public.remove_member(uuid, uuid),
  public.my_memberships()
from public, anon;

grant execute on function
  public.create_organization(uuid, text),
  public.create_invite(uuid, text, text),
  public.revoke_invite(uuid),
  public.accept_invite(text),
  public.set_member_role(uuid, uuid, text),
  public.remove_member(uuid, uuid),
  public.my_memberships()
to authenticated;
