-- Trigger argument: the timestamptz or date column. Phone clocks drift, so up to one day ahead is accepted.
create function private.check_not_future()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) ->> tg_argv[0])::timestamptz > now() + interval '1 day' then
    raise exception 'La fecha no puede ser futura.' using errcode = 'P0001', detail = 'future_date';
  end if;
  return new;
end;
$$;

revoke execute on function private.check_not_future() from public;

create table public.inspections (
  id uuid primary key,
  organization_id uuid not null references public.organizations,
  hive_id uuid not null references public.hives,
  inspected_at timestamptz not null,
  inspected_by uuid not null default auth.uid() references public.profiles,
  source text not null
    constraint inspections_source_check check (source in ('manual', 'voice')),
  transcript text
    constraint inspections_transcript_check check (char_length(transcript) <= 10000),
  population_strength smallint
    constraint inspections_population_strength_check check (population_strength between 1 and 5),
  temperament smallint
    constraint inspections_temperament_check check (temperament between 1 and 5),
  queen_seen text
    constraint inspections_queen_seen_check check (queen_seen in ('yes', 'no', 'not_checked')),
  eggs_seen text
    constraint inspections_eggs_seen_check check (eggs_seen in ('yes', 'no', 'not_checked')),
  larvae_seen text
    constraint inspections_larvae_seen_check check (larvae_seen in ('yes', 'no', 'not_checked')),
  queen_cells text
    constraint inspections_queen_cells_check check (queen_cells in ('none', 'swarm', 'supersedure', 'not_checked')),
  brood_frames smallint
    constraint inspections_brood_frames_check check (brood_frames between 0 and 40),
  honey_frames smallint
    constraint inspections_honey_frames_check check (honey_frames between 0 and 40),
  pollen_frames smallint
    constraint inspections_pollen_frames_check check (pollen_frames between 0 and 40),
  brood_pattern text
    constraint inspections_brood_pattern_check check (brood_pattern in ('compact', 'spotty', 'not_checked')),
  stores text
    constraint inspections_stores_check check (stores in ('low', 'ok', 'high', 'not_checked')),
  varroa_method text
    constraint inspections_varroa_method_check check (
      varroa_method in ('alcohol_wash', 'sugar_roll', 'sticky_board', 'visual')
    ),
  varroa_count integer
    constraint inspections_varroa_count_check check (varroa_count >= 0),
  varroa_sample_size integer
    constraint inspections_varroa_sample_size_check check (varroa_sample_size > 0),
  pests text[]
    constraint inspections_pests_check check (
      pests <@ array['wax_moth', 'small_hive_beetle', 'ants', 'wasps', 'mice', 'other']
    ),
  disease_signs text[]
    constraint inspections_disease_signs_check check (
      disease_signs <@ array['chalkbrood', 'sacbrood', 'foulbrood_signs', 'deformed_wings', 'dysentery', 'dead_bees', 'other']
    ),
  weather text
    constraint inspections_weather_check check (weather in ('sunny', 'cloudy', 'rain', 'windy')),
  temperature_c numeric(4, 1)
    constraint inspections_temperature_c_check check (temperature_c between -20 and 60),
  attention_level text
    constraint inspections_attention_level_check check (attention_level in ('none', 'soon', 'urgent')),
  planned_actions text[]
    constraint inspections_planned_actions_check check (
      planned_actions <@ array[
        'feed', 'treat', 'change_queen', 'add_super', 'remove_super', 'harvest', 'split', 'merge', 'move', 'check_queen', 'other'
      ]
    ),
  next_inspection_on date,
  notes text
    constraint inspections_notes_check check (char_length(notes) <= 4000),
  created_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- A count needs its method; washes and rolls also need how many bees were sampled.
  constraint inspections_varroa_check check (
    (varroa_count is null) = (varroa_method is null)
    and (varroa_sample_size is null or varroa_method is not null)
    and (varroa_method not in ('alcohol_wash', 'sugar_roll') or varroa_sample_size is not null)
  )
);

create index inspections_sync_idx on public.inspections (organization_id, updated_at);
create index inspections_hive_idx on public.inspections (hive_id, inspected_at desc) where deleted_at is null;

-- Checked only when inspected_by is set or changes, so a removed member's past inspections stay editable.
create function private.check_inspector()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.inspected_by is not distinct from old.inspected_by then
    return new;
  end if;
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = new.organization_id and m.user_id = new.inspected_by
  ) then
    raise exception 'La persona que revisó no pertenece a esta organización.'
      using errcode = 'P0001', detail = 'not_member';
  end if;
  return new;
end;
$$;

revoke execute on function private.check_inspector() from public;

create trigger inspections_10_set_timestamps before insert or update on public.inspections
  for each row execute function private.set_timestamps();
create trigger inspections_20_force_author before insert or update on public.inspections
  for each row execute function private.force_author();
create trigger inspections_30_check_hive before insert or update on public.inspections
  for each row execute function private.check_parent('hives', 'hive_id');
create trigger inspections_40_check_inspector before insert or update on public.inspections
  for each row execute function private.check_inspector();
create trigger inspections_50_check_date before insert or update of inspected_at on public.inspections
  for each row execute function private.check_not_future('inspected_at');

alter table public.inspections enable row level security;
revoke all on public.inspections from anon, authenticated;
grant select, insert, update on public.inspections to authenticated;

create policy inspections_select on public.inspections for select to authenticated
  using (organization_id in (select private.my_organization_ids()) or (select private.is_platform_admin()));

create policy inspections_insert_member on public.inspections for insert to authenticated
  with check (private.is_member(organization_id));

create policy inspections_update_owner_or_author on public.inspections for update to authenticated
  using (
    private.has_role(organization_id, 'owner')
    or (created_by = (select auth.uid()) and private.is_member(organization_id))
  )
  with check (private.is_member(organization_id));
