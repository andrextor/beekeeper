begin;
\ir _helpers.psql
select plan(21);

select tests.create_user('owner-a@landak.test') as owner_a \gset
select tests.create_user('viewer-a@landak.test') as viewer_a \gset
select tests.create_user('owner-b@landak.test') as owner_b \gset
select tests.create_user('admin@landak.test') as admin_id \gset
select tests.create_user('new-viewer@landak.test') as new_viewer \gset
select tests.make_platform_admin(:'admin_id');
select gen_random_uuid() as org_a \gset
select gen_random_uuid() as org_b \gset
select gen_random_uuid() as apiary_a \gset
select gen_random_uuid() as hive_a \gset
select gen_random_uuid() as insp_owner \gset
select gen_random_uuid() as photo_owner \gset

-- Finca A with one of everything, recorded by its owner.
select tests.authenticate_as(:'owner_a');
select public.create_organization(:'org_a', 'Finca A');
select code from public.create_invite(:'org_a', 'viewer') \gset
insert into public.apiaries (id, organization_id, name) values (:'apiary_a', :'org_a', 'Vallecito 1');
insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (:'hive_a', :'org_a', :'apiary_a', 'C-01', 'AAAAAAAAAA');
insert into public.inspections (id, organization_id, hive_id, inspected_at, source, population_strength)
values (:'insp_owner', :'org_a', :'hive_a', now(), 'manual', 4);
insert into public.hive_events (id, organization_id, hive_id, type, occurred_at, details)
values (gen_random_uuid(), :'org_a', :'hive_a', 'note', now(), '{"text": "Piquera limpia", "source": "text"}');
insert into public.photos (id, organization_id, hive_id, storage_path, taken_at)
values (:'photo_owner', :'org_a', :'hive_a', format('%s/%s/%s.jpg', :'org_a', :'hive_a', :'photo_owner'), now());

select tests.authenticate_as(:'owner_b');
select public.create_organization(:'org_b', 'Finca B');

-- The viewer joins with a code.
select tests.authenticate_as(:'viewer_a');
select is(public.accept_invite(:'code'), :'org_a'::uuid, 'a viewer code joins the farm');
select is(
  (select role from public.organization_members where organization_id = :'org_a' and user_id = :'viewer_a'),
  'viewer', 'as a viewer'
);

-- Reads the whole farm, and only that farm.
select is((select count(*) from public.organizations), 1::bigint, 'a viewer sees only their farm');
select is((select count(*) from public.hives), 1::bigint, 'and its hives');
select is((select count(*) from public.inspections), 1::bigint, 'and its inspections');
select is((select count(*) from public.hive_events), 1::bigint, 'and its events and notes');
select is((select count(*) from public.photos), 1::bigint, 'and its photos');
select is((select count(*) from public.organization_members where organization_id = :'org_a'), 2::bigint, 'and its people');

-- Writes nothing.
select throws_ok(
  format('insert into public.inspections (id, organization_id, hive_id, inspected_at, source) values (%L, %L, %L, now(), %L)', gen_random_uuid(), :'org_a', :'hive_a', 'manual'),
  '42501', null, 'a viewer cannot record an inspection'
);
select throws_ok(
  format('insert into public.hive_events (id, organization_id, hive_id, type, occurred_at, details) values (%L, %L, %L, %L, now(), %L)', gen_random_uuid(), :'org_a', :'hive_a', 'note', '{"text": "Hola", "source": "text"}'),
  '42501', null, 'nor a note or event'
);
select throws_ok(
  format('insert into public.photos (id, organization_id, hive_id, storage_path, taken_at) values (%L, %L, %L, %L, now())', gen_random_uuid(), :'org_a', :'hive_a', format('%s/%s/%s.jpg', :'org_a', :'hive_a', gen_random_uuid())),
  '42501', null, 'nor a photo row'
);
select throws_ok(
  format('insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)', 'hive-photos', format('%s/%s/%s.jpg', :'org_a', :'hive_a', gen_random_uuid()), :'viewer_a'),
  '42501', null, 'nor a photo file'
);
select throws_ok(
  format('insert into public.apiaries (id, organization_id, name) values (%L, %L, %L)', gen_random_uuid(), :'org_a', 'Otro'),
  '42501', null, 'nor an apiary'
);
update public.inspections set population_strength = 1 where id = :'insp_owner';
select is((select population_strength from public.inspections where id = :'insp_owner'), 4::smallint, 'nor edit an inspection');
select throws_ok(
  format('select * from public.create_invite(%L, %L)', :'org_a', 'viewer'),
  'P0001', 'Solo el propietario de la organización puede hacer esto.', 'nor invite'
);

-- The owner moves people between the three roles.
select tests.authenticate_as(:'owner_a');
select lives_ok(
  format('select public.set_member_role(%L, %L, %L)', :'org_a', :'viewer_a', 'reviewer'),
  'the owner makes the viewer a reviewer'
);
select tests.authenticate_as(:'viewer_a');
select lives_ok(
  format('insert into public.inspections (id, organization_id, hive_id, inspected_at, source) values (%L, %L, %L, now(), %L)', gen_random_uuid(), :'org_a', :'hive_a', 'manual'),
  'who then records'
);
select tests.authenticate_as(:'owner_a');
select lives_ok(
  format('select public.set_member_role(%L, %L, %L)', :'org_a', :'viewer_a', 'viewer'),
  'and back to viewer'
);
select throws_ok(
  format('select * from public.create_invite(%L, %L)', :'org_a', 'auditor'),
  'P0001', 'El rol debe ser propietario, revisor u observador.', 'an unknown role is refused'
);

-- The platform admin creates and moves viewers too.
reset role;
select is(
  public.admin_provision_member(:'admin_id', :'new_viewer', 'Vera', 'viewer', :'org_a', null),
  :'org_a'::uuid, 'the admin creates an account as viewer of a farm'
);
select tests.authenticate_as(:'admin_id');
select lives_ok(
  format('select public.admin_set_member_role(%L, %L, %L)', :'org_a', :'new_viewer', 'reviewer'),
  'and changes a viewer''s role'
);

select * from finish();
rollback;
