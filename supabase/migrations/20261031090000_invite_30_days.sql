-- Invite codes last 30 days instead of 7: the invited person often installs the app days later.
-- Codes already issued keep their expiry. Plan: docs/superpowers/plans/ok-2026-10-26-invite-30-days.md

create or replace function public.create_invite(p_organization_id uuid, p_role text, p_label text default null)
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
  values (p_organization_id, private.hash_invite_code(v_code), v_label, p_role, v_uid, now() + interval '30 days')
  returning i.id, substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4), i.expires_at;
end;
$$;
