-- Shared by every domain table (apiaries, hives, inspections, events, photos).

-- The author is the signed-in user; server-side writes (seed, maintenance) must name one explicitly.
-- On update created_by silently keeps its value (idempotent upserts resend the row), while a change
-- of organization_id is refused: moving a row between organizations would bypass every policy.
create function private.force_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
    elsif new.created_by is null then
      raise exception 'Falta el autor del registro.' using errcode = 'P0001', detail = 'missing_author';
    end if;
  else
    new.created_by := old.created_by;
    if new.organization_id is distinct from old.organization_id then
      raise exception 'Un registro no puede cambiar de organización.' using errcode = 'P0001', detail = 'immutable_column';
    end if;
  end if;
  return new;
end;
$$;

-- Trigger arguments: parent table, foreign key column. The parent must exist in the same organization
-- and not be soft-deleted. Skipped for a null foreign key (optional parent) and for an update that keeps
-- the parent and does not restore the row. The parent is read `for share`, so a concurrent soft delete of
-- the parent waits for this transaction and then sees the new child (and the other way round).
-- ponytail: to_jsonb + dynamic SQL per row; fine at pilot volume, per-table functions if pushes get heavy.
create function private.check_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_id uuid := (to_jsonb(new) ->> tg_argv[1])::uuid;
  v_parent_org uuid;
  v_parent_deleted_at timestamptz;
begin
  if v_parent_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
    and v_parent_id is not distinct from (to_jsonb(old) ->> tg_argv[1])::uuid
    and not (old.deleted_at is not null and new.deleted_at is null) then
    return new;
  end if;

  execute format('select organization_id, deleted_at from public.%I where id = $1 for share', tg_argv[0])
    into v_parent_org, v_parent_deleted_at
    using v_parent_id;

  if v_parent_org is distinct from new.organization_id or v_parent_deleted_at is not null then
    raise exception 'El registro relacionado no existe, fue eliminado o es de otra organización.'
      using errcode = 'P0001', detail = 'parent_mismatch';
  end if;
  return new;
end;
$$;

revoke execute on function private.force_author(), private.check_parent() from public;
