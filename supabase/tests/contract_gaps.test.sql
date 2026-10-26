begin;
\ir _helpers.psql
select plan(13);

select tests.create_user('owner-a@landak.test') as owner_a \gset
select tests.create_user('reviewer-a@landak.test') as reviewer_a \gset
select tests.create_user('owner-b@landak.test') as owner_b \gset
select tests.create_user('admin@landak.test') as admin_id \gset
select tests.make_platform_admin(:'admin_id');
select gen_random_uuid() as org_a \gset
select gen_random_uuid() as org_b \gset
select gen_random_uuid() as apiary_a \gset
select gen_random_uuid() as apiary_b \gset
select gen_random_uuid() as hive_a \gset
select gen_random_uuid() as hive_b \gset
select gen_random_uuid() as insp_rev \gset
select gen_random_uuid() as ev_rev \gset
select gen_random_uuid() as photo_rev \gset
select gen_random_uuid() as photo_x \gset

select tests.authenticate_as(:'owner_a');
select public.create_organization(:'org_a', 'Finca A');
select code from public.create_invite(:'org_a', 'reviewer') \gset
insert into public.apiaries (id, organization_id, name) values (:'apiary_a', :'org_a', 'Vallecito 1');
insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (:'hive_a', :'org_a', :'apiary_a', 'C-01', 'AAAAAAAAAA');
select tests.authenticate_as(:'reviewer_a');
select public.accept_invite(:'code');
insert into public.inspections (id, organization_id, hive_id, inspected_at, source) values (:'insp_rev', :'org_a', :'hive_a', now(), 'manual');
insert into public.hive_events (id, organization_id, hive_id, type, occurred_at, details)
values (:'ev_rev', :'org_a', :'hive_a', 'note', now(), '{"text": "Piquera con hormigas", "source": "text"}');
insert into public.photos (id, organization_id, hive_id, storage_path, taken_at)
values (:'photo_rev', :'org_a', :'hive_a', format('%s/%s/%s.jpg', :'org_a', :'hive_a', :'photo_rev'), now());
select tests.authenticate_as(:'owner_b');
select public.create_organization(:'org_b', 'Finca B');
insert into public.apiaries (id, organization_id, name) values (:'apiary_b', :'org_b', 'Otro');
insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (:'hive_b', :'org_b', :'apiary_b', 'B-01', 'BBBBBBBBBB');

select tests.authenticate_as(:'owner_a');
update public.hives set deleted_at = now() where id = :'hive_a';

-- The reviewer was offline while the owner deleted the hive; these are their pushes (PostgREST upserts).
select tests.authenticate_as(:'reviewer_a');
select lives_ok(
  format(
    'insert into public.photos (id, organization_id, hive_id, storage_path, taken_at, deleted_at) values (%L, %L, %L, %L, now(), now())
     on conflict (id) do update set deleted_at = excluded.deleted_at',
    :'photo_rev', :'org_a', :'hive_a', format('%s/%s/%s.jpg', :'org_a', :'hive_a', :'photo_rev')
  ),
  'a photo tombstone is accepted under a deleted hive'
);
select throws_ok(
  format(
    'insert into public.hive_events (id, organization_id, hive_id, type, occurred_at, details) values (%L, %L, %L, %L, now(), %L)
     on conflict (id) do update set details = excluded.details',
    :'ev_rev', :'org_a', :'hive_a', 'note', '{"text": "Corregida", "source": "text"}'
  ),
  'P0001', 'El registro relacionado no existe, fue eliminado o es de otra organización.', 'a live edit under a deleted hive is refused'
);
select lives_ok(
  format(
    'insert into public.hive_events (id, organization_id, hive_id, type, occurred_at, details, deleted_at) values (%L, %L, %L, %L, now(), %L, now())
     on conflict (id) do update set deleted_at = excluded.deleted_at',
    :'ev_rev', :'org_a', :'hive_a', 'note', '{"text": "Piquera con hormigas", "source": "text"}'
  ),
  'an event tombstone is accepted under a deleted hive'
);
select lives_ok(
  format(
    'insert into public.inspections (id, organization_id, hive_id, inspected_at, source, deleted_at) values (%L, %L, %L, now(), %L, now())
     on conflict (id) do update set deleted_at = excluded.deleted_at',
    :'insp_rev', :'org_a', :'hive_a', 'manual'
  ),
  'an inspection tombstone is accepted under a deleted hive'
);
select throws_ok(
  format('update public.photos set deleted_at = null where id = %L', :'photo_rev'),
  'P0001', 'El registro relacionado no existe, fue eliminado o es de otra organización.', 'a child is not restored under a deleted hive'
);
select throws_ok(
  format(
    'insert into public.photos (id, organization_id, hive_id, storage_path, taken_at, deleted_at) values (%L, %L, %L, %L, now(), now())',
    :'photo_x', :'org_a', :'hive_b', format('%s/%s/%s.jpg', :'org_a', :'hive_b', :'photo_x')
  ),
  'P0001', 'El registro relacionado no existe, fue eliminado o es de otra organización.', 'a tombstone still cannot point at another organization''s hive'
);

select tests.authenticate_as(:'owner_a');
select lives_ok(
  format('update public.organizations set deleted_at = now() where id = %L', :'org_a'),
  'the owner soft-deletes their organization'
);
select is(
  (select count(*) from public.apiaries where organization_id = :'org_a'), 0::bigint,
  'the owner no longer reads the apiaries of a deleted organization'
);
select throws_ok(
  format('insert into public.apiaries (id, organization_id, name) values (%L, %L, %L)', gen_random_uuid(), :'org_a', 'Nuevo'),
  '42501', null, 'nobody writes into a deleted organization'
);
select throws_ok(
  format('select * from public.create_invite(%L, %L)', :'org_a', 'reviewer'),
  'P0001', 'La organización fue eliminada.', 'owner RPCs still say the organization was deleted'
);

select tests.authenticate_as(:'reviewer_a');
select is(
  (select count(*) from public.hives where organization_id = :'org_a')
    + (select count(*) from public.inspections where organization_id = :'org_a')
    + (select count(*) from public.hive_events where organization_id = :'org_a')
    + (select count(*) from public.photos where organization_id = :'org_a'),
  0::bigint,
  'a reviewer no longer reads the hives, inspections, events or photos of a deleted organization'
);

select tests.authenticate_as(:'admin_id');
select is(
  (select count(*) from public.apiaries where organization_id = :'org_a'), 1::bigint,
  'the platform admin still reads a deleted organization'
);
select isnt(
  (select deleted_at from public.organizations where id = :'org_a'), null,
  'the organization is soft-deleted'
);

select * from finish();
rollback;
