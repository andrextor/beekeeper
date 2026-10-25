-- security invoker: RLS on inspections, hive_events and profiles decides what each caller sees.
create function public.hive_timeline(
  p_hive_id uuid,
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 30
)
returns table (kind text, id uuid, at timestamptz, created_by uuid, author_name text, data jsonb)
language sql
stable
security invoker
set search_path = ''
as $$
  with bounds as (
    select
      least(greatest(coalesce(p_limit, 30), 1), 100) as page_size,
      coalesce(p_before, 'infinity'::timestamptz) as before_at,
      coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid) as before_id
  ),
  items as (
    (
      select 'inspection' as kind, i.id, i.inspected_at as at, i.created_by, to_jsonb(i) as data
      from public.inspections i, bounds b
      where i.hive_id = p_hive_id and i.deleted_at is null and (i.inspected_at, i.id) < (b.before_at, b.before_id)
      order by i.inspected_at desc, i.id desc
      limit (select page_size from bounds)
    )
    union all
    (
      select 'event', e.id, e.occurred_at, e.created_by, to_jsonb(e)
      from public.hive_events e, bounds b
      where e.hive_id = p_hive_id and e.deleted_at is null and (e.occurred_at, e.id) < (b.before_at, b.before_id)
      order by e.occurred_at desc, e.id desc
      limit (select page_size from bounds)
    )
  )
  select t.kind, t.id, t.at, t.created_by, p.display_name, t.data
  from items t
  left join public.profiles p on p.id = t.created_by
  order by t.at desc, t.id desc
  limit (select page_size from bounds);
$$;

revoke execute on function public.hive_timeline(uuid, timestamptz, uuid, integer) from public;
grant execute on function public.hive_timeline(uuid, timestamptz, uuid, integer) to authenticated;

-- A hive's open tasks are the planned actions of its latest inspection; older ones are history.
create view public.hive_open_tasks with (security_invoker = true) as
select distinct on (i.hive_id) i.hive_id, i.organization_id, i.planned_actions, i.inspected_at
from public.inspections i
join public.hives h on h.id = i.hive_id and h.deleted_at is null
where i.deleted_at is null
order by i.hive_id, i.inspected_at desc, i.created_at desc;

revoke all on public.hive_open_tasks from anon, authenticated;
grant select on public.hive_open_tasks to authenticated;
