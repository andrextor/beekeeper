create table public.hive_events (
  id uuid primary key,
  organization_id uuid not null references public.organizations,
  hive_id uuid not null references public.hives,
  inspection_id uuid references public.inspections,
  type text not null
    constraint hive_events_type_check check (
      type in (
        'note', 'feeding', 'treatment', 'queen_change', 'harvest', 'split', 'merge', 'transfer', 'swarm', 'loss', 'qr_relabel'
      )
    ),
  occurred_at timestamptz not null,
  -- Shapes per type live in docs/api.md and the app's Zod schemas; the database checks only the envelope and notes.
  details jsonb not null default '{}'
    constraint hive_events_details_check check (
      jsonb_typeof(details) = 'object'
      and pg_column_size(details) <= 8192
      and (
        type <> 'note'
        or (jsonb_typeof(details -> 'text') = 'string' and char_length(details ->> 'text') between 1 and 2000)
      )
    ),
  created_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index hive_events_sync_idx on public.hive_events (organization_id, updated_at);
create index hive_events_hive_idx on public.hive_events (hive_id, occurred_at desc) where deleted_at is null;

-- The linked inspection must be of the same hive (hence the same organization) and not deleted; re-checked
-- like check_parent when the link or the hive changes, or the event is restored.
create function private.check_event_inspection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hive_id uuid;
  v_deleted_at timestamptz;
begin
  if new.inspection_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
    and new.inspection_id is not distinct from old.inspection_id
    and new.hive_id is not distinct from old.hive_id
    and not (old.deleted_at is not null and new.deleted_at is null) then
    return new;
  end if;

  select i.hive_id, i.deleted_at into v_hive_id, v_deleted_at
  from public.inspections i where i.id = new.inspection_id for share;

  if v_hive_id is distinct from new.hive_id or v_deleted_at is not null then
    raise exception 'El registro relacionado no existe, fue eliminado o es de otra organización.'
      using errcode = 'P0001', detail = 'parent_mismatch';
  end if;
  return new;
end;
$$;

revoke execute on function private.check_event_inspection() from public;

create trigger hive_events_10_set_timestamps before insert or update on public.hive_events
  for each row execute function private.set_timestamps();
create trigger hive_events_20_force_author before insert or update on public.hive_events
  for each row execute function private.force_author();
create trigger hive_events_30_check_hive before insert or update on public.hive_events
  for each row execute function private.check_parent('hives', 'hive_id');
create trigger hive_events_40_check_inspection before insert or update on public.hive_events
  for each row execute function private.check_event_inspection();
create trigger hive_events_50_check_date before insert or update of occurred_at on public.hive_events
  for each row execute function private.check_not_future('occurred_at');

alter table public.hive_events enable row level security;
revoke all on public.hive_events from anon, authenticated;
grant select, insert, update on public.hive_events to authenticated;

create policy hive_events_select on public.hive_events for select to authenticated
  using (organization_id in (select private.my_organization_ids()) or (select private.is_platform_admin()));

create policy hive_events_insert_member on public.hive_events for insert to authenticated
  with check (private.is_member(organization_id));

create policy hive_events_update_owner_or_author on public.hive_events for update to authenticated
  using (
    private.has_role(organization_id, 'owner')
    or (created_by = (select auth.uid()) and private.is_member(organization_id))
  )
  with check (private.is_member(organization_id));
