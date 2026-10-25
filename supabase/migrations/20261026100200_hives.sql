create table public.hives (
  id uuid primary key,
  organization_id uuid not null references public.organizations,
  apiary_id uuid not null references public.apiaries,
  name text not null
    constraint hives_name_check check (char_length(name) between 1 and 40 and name = btrim(name)),
  qr_code text not null
    constraint hives_qr_code_check check (qr_code ~ '^[0-9A-HJKMNP-TV-Z]{10}$'),
  hive_type text
    constraint hives_hive_type_check check (
      hive_type in ('langstroth', 'dadant', 'top_bar', 'warre', 'nucleus', 'rustic', 'other')
    ),
  brood_boxes smallint
    constraint hives_brood_boxes_check check (brood_boxes between 0 and 5),
  supers smallint
    constraint hives_supers_check check (supers between 0 and 10),
  colony_origin text
    constraint hives_colony_origin_check check (
      colony_origin in ('swarm_capture', 'split', 'package', 'nucleus_purchase', 'colony_purchase', 'unknown')
    ),
  colony_started_on date,
  bee_race text
    constraint hives_bee_race_check check (char_length(bee_race) <= 60),
  queen_year smallint
    constraint hives_queen_year_check check (queen_year between 2000 and 2100),
  queen_marked boolean,
  queen_color text
    constraint hives_queen_color_check check (queen_color in ('white', 'yellow', 'red', 'green', 'blue')),
  queen_origin text
    constraint hives_queen_origin_check check (queen_origin in ('own_rearing', 'purchased', 'natural', 'unknown')),
  status text not null default 'active'
    constraint hives_status_check check (status in ('active', 'inactive', 'dead', 'absconded', 'merged', 'sold')),
  notes text
    constraint hives_notes_check check (char_length(notes) <= 2000),
  created_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- A deleted hive frees its code, so its printed label can go on a new colony.
create unique index hives_qr_code_key on public.hives (qr_code) where deleted_at is null;
-- Beekeepers number hives per site (C-01 in every apiary).
create unique index hives_apiary_name_key on public.hives (apiary_id, lower(name)) where deleted_at is null;
create index hives_sync_idx on public.hives (organization_id, updated_at);
create index hives_apiary_id_idx on public.hives (apiary_id) where deleted_at is null;

-- A start date in the future is a typo; checked in a trigger because a check constraint cannot depend on today.
create function private.check_hive_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.colony_started_on > current_date + 1 then
    raise exception 'La fecha de inicio de la colonia no puede ser futura.'
      using errcode = 'P0001', detail = 'future_date';
  end if;
  return new;
end;
$$;

revoke execute on function private.check_hive_dates() from public;

create trigger hives_10_set_timestamps before insert or update on public.hives
  for each row execute function private.set_timestamps();
create trigger hives_20_force_author before insert or update on public.hives
  for each row execute function private.force_author();
create trigger hives_30_check_apiary before insert or update on public.hives
  for each row execute function private.check_parent('apiaries', 'apiary_id');
create trigger hives_40_check_dates before insert or update of colony_started_on on public.hives
  for each row execute function private.check_hive_dates();

-- An apiary is soft-deleted only once it holds no hive (whatever its status): children of a deleted
-- parent would break check_parent and disappear from every list.
create function private.check_apiary_empty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The update already holds this apiary's row lock; check_parent reads it `for share`, so a hive
  -- inserted or moved here concurrently either commits first (and is seen) or waits and then fails.
  if new.deleted_at is not null and old.deleted_at is null
    and exists (select 1 from public.hives h where h.apiary_id = new.id and h.deleted_at is null) then
    raise exception 'El apiario todavía tiene colmenas. Muévelas o elimínalas primero.'
      using errcode = 'P0001', detail = 'apiary_not_empty';
  end if;
  return new;
end;
$$;

revoke execute on function private.check_apiary_empty() from public;

create trigger apiaries_40_check_empty before update of deleted_at on public.apiaries
  for each row execute function private.check_apiary_empty();

alter table public.hives enable row level security;
revoke all on public.hives from anon, authenticated;
grant select, insert, update on public.hives to authenticated;

create policy hives_select on public.hives for select to authenticated
  using (organization_id in (select private.my_organization_ids()) or (select private.is_platform_admin()));

create policy hives_insert_owner on public.hives for insert to authenticated
  with check (private.has_role(organization_id, 'owner'));

create policy hives_update_owner on public.hives for update to authenticated
  using (private.has_role(organization_id, 'owner'))
  with check (private.has_role(organization_id, 'owner'));
