-- B6 review: stats count only live organizations' rows; memberships say when their organization is deleted.

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
      where i.deleted_at is null and i.inspected_at > now() - interval '30 days' and i.organization_id = any(v_orgs)
    ),
    'events_30d', (
      select count(*) from public.hive_events e
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

create or replace function public.admin_list_users(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  display_name text,
  is_platform_admin boolean,
  organizations jsonb,
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
    p.id,
    p.email,
    p.display_name,
    p.is_platform_admin,
    coalesce((
      select jsonb_agg(
        jsonb_build_object('id', o.id, 'name', o.name, 'role', m.role, 'deleted_at', o.deleted_at) order by o.name
      )
      from public.organization_members m join public.organizations o on o.id = m.organization_id
      where m.user_id = p.id
    ), '[]'::jsonb),
    p.created_at,
    count(*) over ()
  from public.profiles p
  where v_pattern is null or p.email ilike v_pattern or p.display_name ilike v_pattern
  order by 6 desc, 1
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
