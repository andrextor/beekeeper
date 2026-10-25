create table public.apiaries (
  id uuid primary key,
  organization_id uuid not null references public.organizations,
  name text not null
    constraint apiaries_name_check check (char_length(name) between 1 and 80 and name = btrim(name)),
  farm_name text
    constraint apiaries_farm_name_check check (char_length(farm_name) <= 80),
  place text
    constraint apiaries_place_check check (char_length(place) <= 120),
  latitude numeric(9, 6)
    constraint apiaries_latitude_check check (latitude between -90 and 90),
  longitude numeric(9, 6)
    constraint apiaries_longitude_check check (longitude between -180 and 180),
  altitude_m integer
    constraint apiaries_altitude_m_check check (altitude_m between -100 and 6000),
  flora_notes text
    constraint apiaries_flora_notes_check check (char_length(flora_notes) <= 2000),
  water_source text
    constraint apiaries_water_source_check check (char_length(water_source) <= 200),
  notes text
    constraint apiaries_notes_check check (char_length(notes) <= 2000),
  created_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint apiaries_coordinates_check check ((latitude is null) = (longitude is null))
);

create unique index apiaries_org_name_key on public.apiaries (organization_id, lower(name))
  where deleted_at is null;
create index apiaries_sync_idx on public.apiaries (organization_id, updated_at);

create trigger apiaries_set_timestamps before insert or update on public.apiaries
  for each row execute function private.set_timestamps();
create trigger apiaries_force_author before insert or update on public.apiaries
  for each row execute function private.force_author();

alter table public.apiaries enable row level security;
revoke all on public.apiaries from anon, authenticated;
grant select, insert, update on public.apiaries to authenticated;

create policy apiaries_select on public.apiaries for select to authenticated
  using (organization_id in (select private.my_organization_ids()) or (select private.is_platform_admin()));

create policy apiaries_insert_owner on public.apiaries for insert to authenticated
  with check (private.has_role(organization_id, 'owner'));

create policy apiaries_update_owner on public.apiaries for update to authenticated
  using (private.has_role(organization_id, 'owner'))
  with check (private.has_role(organization_id, 'owner'));
