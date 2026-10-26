-- A4 review R6: a deleted hive keeps its history, and clients hide it; admin counts of inspections and events
-- now skip it too, so the dashboard, the beekeeper list and the beekeeper page agree.

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  -- Deleting an organization does not cascade, so its apiaries, hives and history would still be counted.
  v_orgs uuid[];
begin
  perform private.require_platform_admin();
  v_orgs := array(select o.id from public.organizations o where o.deleted_at is null);
  return jsonb_build_object(
    'organizations', cardinality(v_orgs),
    'users', (select count(*) from public.profiles),
    'apiaries', (select count(*) from public.apiaries a where a.deleted_at is null and a.organization_id = any(v_orgs)),
    'hives_active', (
      select count(*) from public.hives h
      where h.deleted_at is null and h.status = 'active' and h.organization_id = any(v_orgs)
    ),
    'hives_total', (select count(*) from public.hives h where h.deleted_at is null and h.organization_id = any(v_orgs)),
    'inspections_30d', (
      select count(*) from public.inspections i
      join public.hives h on h.id = i.hive_id and h.deleted_at is null
      where i.deleted_at is null and i.inspected_at > now() - interval '30 days' and i.organization_id = any(v_orgs)
    ),
    'events_30d', (
      select count(*) from public.hive_events e
      join public.hives h on h.id = e.hive_id and h.deleted_at is null
      where e.deleted_at is null and e.occurred_at > now() - interval '30 days' and e.organization_id = any(v_orgs)
    ),
    'photos', (select count(*) from public.photos p where p.deleted_at is null and p.organization_id = any(v_orgs)),
    -- What the free tier counts: main files, thumbnails and orphans, deleted organizations included.
    'storage_bytes', (
      select coalesce(sum((o.metadata ->> 'size')::bigint), 0) from storage.objects o where o.bucket_id = 'hive-photos'
    ),
    'reviewers', (
      select count(distinct m.user_id) from public.organization_members m
      where m.role = 'reviewer' and m.organization_id = any(v_orgs)
    )
  );
end;
$$;

create or replace function public.admin_list_organizations(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  name text,
  deleted_at timestamptz,
  owner_emails text[],
  members integer,
  apiaries integer,
  hives_active integer,
  inspections_30d integer,
  last_inspection_at timestamptz,
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
    o.id,
    o.name,
    o.deleted_at,
    array(
      select p.email from public.organization_members m join public.profiles p on p.id = m.user_id
      where m.organization_id = o.id and m.role = 'owner' order by p.email
    ),
    (select count(*)::integer from public.organization_members m where m.organization_id = o.id),
    (select count(*)::integer from public.apiaries a where a.organization_id = o.id and a.deleted_at is null),
    (
      select count(*)::integer from public.hives h
      where h.organization_id = o.id and h.deleted_at is null and h.status = 'active'
    ),
    (
      select count(*)::integer from public.inspections i
      join public.hives h on h.id = i.hive_id and h.deleted_at is null
      where i.organization_id = o.id and i.deleted_at is null and i.inspected_at > now() - interval '30 days'
    ),
    (
      select max(i.inspected_at) from public.inspections i
      join public.hives h on h.id = i.hive_id and h.deleted_at is null
      where i.organization_id = o.id and i.deleted_at is null
    ),
    o.created_at,
    count(*) over ()
  from public.organizations o
  where v_pattern is null
    or o.name ilike v_pattern
    or exists (
      select 1 from public.organization_members m join public.profiles p on p.id = m.user_id
      where m.organization_id = o.id and m.role = 'owner' and p.email ilike v_pattern
    )
  order by 9 desc nulls last, 2, 1
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

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
          'user_id', m.user_id, 'email', p.email, 'display_name', p.display_name, 'role', m.role, 'joined_at', m.created_at
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
