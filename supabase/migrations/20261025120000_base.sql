-- Schema for helpers that policies call; PostgREST does not expose it.
create schema private;

grant usage on schema private to authenticated;

-- Server-owned timestamps: a client value is never kept. On update created_at
-- silently keeps its old value, so an idempotent upsert retry never fails.
create function private.set_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Inicia sesión para continuar.' using errcode = 'P0001', detail = 'not_signed_in';
  end if;
  return v_uid;
end;
$$;

revoke execute on function private.require_user() from public;
grant execute on function private.require_user() to authenticated;
