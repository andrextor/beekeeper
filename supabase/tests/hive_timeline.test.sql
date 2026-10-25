begin;
\ir _helpers.psql
select plan(8);

select tests.create_user('owner-a@landak.test') as owner_a \gset
select tests.create_user('reviewer-a@landak.test') as reviewer_a \gset
select tests.create_user('owner-b@landak.test') as owner_b \gset
select tests.create_user('admin@landak.test') as admin_id \gset
select tests.make_platform_admin(:'admin_id');
select gen_random_uuid() as org_a \gset
select gen_random_uuid() as org_b \gset
select gen_random_uuid() as apiary_a \gset
select gen_random_uuid() as hive_a \gset

-- Fixed ids: inspection 02 and event 03 share a timestamp, so their order (id desc) is known.
\set ins0 'e0000000-0000-4000-8000-000000000001'
\set ins1 'e0000000-0000-4000-8000-000000000002'
\set ev_same 'e0000000-0000-4000-8000-000000000003'
\set ev1 'e0000000-0000-4000-8000-000000000004'
\set ev_deleted 'e0000000-0000-4000-8000-000000000005'

select tests.authenticate_as(:'owner_a');
select public.create_organization(:'org_a', 'Finca A');
select code from public.create_invite(:'org_a', 'reviewer') \gset
insert into public.apiaries (id, organization_id, name) values (:'apiary_a', :'org_a', 'Vallecito 1');
insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (:'hive_a', :'org_a', :'apiary_a', 'C-01', 'AAAAAAAAAA');
insert into public.inspections (id, organization_id, hive_id, inspected_at, source) values
  (:'ins0', :'org_a', :'hive_a', '2026-01-10 10:00+00', 'manual'),
  (:'ins1', :'org_a', :'hive_a', '2026-01-12 10:00+00', 'manual');
insert into public.hive_events (id, organization_id, hive_id, inspection_id, type, occurred_at, details) values
  (:'ev_same', :'org_a', :'hive_a', :'ins1', 'feeding', '2026-01-12 10:00+00', '{"feed": "sugar_syrup", "amount": 2, "unit": "l"}'),
  (:'ev1', :'org_a', :'hive_a', null, 'note', '2026-01-11 10:00+00', '{"text": "Mucha actividad en la piquera", "source": "text"}'),
  (:'ev_deleted', :'org_a', :'hive_a', null, 'note', '2026-01-13 10:00+00', '{"text": "Borrada", "source": "text"}');
update public.hive_events set deleted_at = now() where id = :'ev_deleted';

select tests.authenticate_as(:'reviewer_a');
select public.accept_invite(:'code');
select tests.authenticate_as(:'owner_b');
select public.create_organization(:'org_b', 'Finca B');

select tests.authenticate_as(:'reviewer_a');
select results_eq(
  format('select kind, id from public.hive_timeline(%L)', :'hive_a'),
  format(
    'values (%L, %L::uuid), (%L, %L::uuid), (%L, %L::uuid), (%L, %L::uuid)',
    'event', :'ev_same', 'inspection', :'ins1', 'event', :'ev1', 'inspection', :'ins0'
  ),
  'inspections and events are merged newest first, deleted rows left out'
);
select results_eq(
  format('select id from public.hive_timeline(%L, null, null, 2)', :'hive_a'),
  format('values (%L::uuid), (%L::uuid)', :'ev_same', :'ins1'),
  'the first page holds p_limit items'
);
select results_eq(
  format('select id from public.hive_timeline(%L, %L, %L, 2)', :'hive_a', '2026-01-12 10:00+00', :'ins1'),
  format('values (%L::uuid), (%L::uuid)', :'ev1', :'ins0'),
  'the (at, id) cursor continues after the last item without skipping or repeating a shared timestamp'
);
select results_eq(
  format('select id from public.hive_timeline(%L, %L, null, 10)', :'hive_a', '2026-01-12 10:00+00'),
  format('values (%L::uuid), (%L::uuid)', :'ev1', :'ins0'),
  'without p_before_id the cursor is strictly before p_before'
);
select is(
  (select data ->> 'type' from public.hive_timeline(:'hive_a') where id = :'ev1'),
  'note',
  'data carries the full row'
);
select is((select count(*) from public.hive_timeline(:'hive_a', null, null, 0)), 1::bigint, 'p_limit is clamped to at least one');

select tests.authenticate_as(:'owner_b');
select is((select count(*) from public.hive_timeline(:'hive_a')), 0::bigint, 'another organization gets an empty timeline');

select tests.authenticate_as(:'admin_id');
select is((select count(*) from public.hive_timeline(:'hive_a')), 4::bigint, 'the platform admin reads any timeline');

select * from finish();
rollback;
