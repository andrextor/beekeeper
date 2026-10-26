begin;
\ir _helpers.psql
select plan(10);

select tests.create_user('owner-a@landak.test') as owner_a \gset
select tests.create_user('reviewer-a@landak.test') as reviewer_a \gset
select tests.create_user('owner-b@landak.test') as owner_b \gset
select tests.create_user('admin@landak.test') as admin_id \gset
select tests.make_platform_admin(:'admin_id');
select gen_random_uuid() as org_a \gset
select gen_random_uuid() as org_b \gset
select gen_random_uuid() as apiary_a \gset
select gen_random_uuid() as hive_a \gset
select gen_random_uuid() as hive_a2 \gset
select gen_random_uuid() as insp_a \gset
select gen_random_uuid() as photo_rev \gset
select gen_random_uuid() as photo_owner \gset

select tests.authenticate_as(:'owner_a');
select public.create_organization(:'org_a', 'Finca A');
select code from public.create_invite(:'org_a', 'reviewer') \gset
insert into public.apiaries (id, organization_id, name) values (:'apiary_a', :'org_a', 'Vallecito 1');
insert into public.hives (id, organization_id, apiary_id, name, qr_code) values
  (:'hive_a', :'org_a', :'apiary_a', 'C-01', 'AAAAAAAAAA'),
  (:'hive_a2', :'org_a', :'apiary_a', 'C-02', 'AAAAAAAAAB');
insert into public.inspections (id, organization_id, hive_id, inspected_at, source) values (:'insp_a', :'org_a', :'hive_a', now(), 'manual');
insert into public.photos (id, organization_id, hive_id, storage_path, taken_at)
values (:'photo_owner', :'org_a', :'hive_a', format('%s/%s/%s.jpg', :'org_a', :'hive_a', :'photo_owner'), now());
select tests.authenticate_as(:'reviewer_a');
select public.accept_invite(:'code');
select tests.authenticate_as(:'owner_b');
select public.create_organization(:'org_b', 'Finca B');

select tests.authenticate_as(:'reviewer_a');
select lives_ok(
  format(
    'insert into public.photos (id, organization_id, hive_id, inspection_id, storage_path, taken_at, width, height, bytes) values (%L, %L, %L, %L, %L, now(), 1600, 1200, 250000)',
    :'photo_rev', :'org_a', :'hive_a', :'insp_a', format('%s/%s/%s.jpg', :'org_a', :'hive_a', :'photo_rev')
  ),
  'a reviewer records a photo linked to an inspection'
);
select throws_ok(
  format(
    'insert into public.photos (id, organization_id, hive_id, storage_path, taken_at) values (%L, %L, %L, %L, now())',
    gen_random_uuid(), :'org_a', :'hive_a', format('%s/%s/otra.jpg', :'org_a', :'hive_a')
  ),
  '23514', null, 'a storage_path that does not match the row is refused'
);
select gen_random_uuid() as photo_x \gset
select throws_ok(
  format(
    'insert into public.photos (id, organization_id, hive_id, inspection_id, storage_path, taken_at) values (%L, %L, %L, %L, %L, now())',
    :'photo_x', :'org_a', :'hive_a2', :'insp_a', format('%s/%s/%s.jpg', :'org_a', :'hive_a2', :'photo_x')
  ),
  'P0001', 'El registro relacionado no existe o es de otra organización.', 'a photo cannot link an inspection of another hive'
);
select throws_ok(
  format(
    'update public.photos set hive_id = %L, storage_path = %L where id = %L',
    :'hive_a2', format('%s/%s/%s.jpg', :'org_a', :'hive_a2', :'photo_rev'), :'photo_rev'
  ),
  'P0001', 'Un registro no puede cambiar de colmena.', 'a photo cannot move to another hive'
);
select throws_ok(
  format(
    'insert into public.photos (id, organization_id, hive_id, storage_path, taken_at) values (%L, %L, %L, %L, now() + interval ''3 days'')',
    :'photo_x', :'org_a', :'hive_a', format('%s/%s/%s.jpg', :'org_a', :'hive_a', :'photo_x')
  ),
  'P0001', 'La fecha no puede ser futura.', 'a photo taken days in the future is refused'
);
update public.photos set caption = 'Del revisor' where id = :'photo_owner';
select is((select caption from public.photos where id = :'photo_owner'), null, 'a reviewer cannot edit the owner''s photo');

select tests.authenticate_as(:'owner_b');
select is((select count(*) from public.photos), 0::bigint, 'another organization sees none of A''s photos');

select tests.authenticate_as(:'admin_id');
select is((select count(*) from public.photos), 2::bigint, 'the platform admin reads every photo');
select throws_ok(
  format(
    'insert into public.photos (id, organization_id, hive_id, storage_path, taken_at) values (%L, %L, %L, %L, now())',
    :'photo_x', :'org_a', :'hive_a', format('%s/%s/%s.jpg', :'org_a', :'hive_a', :'photo_x')
  ),
  '42501', null, 'the platform admin cannot write'
);

select tests.authenticate_as(:'owner_a');
update public.inspections set deleted_at = now() where id = :'insp_a';
select isnt((select deleted_at from public.photos where id = :'photo_rev'), null, 'deleting an inspection deletes its linked photos');

select * from finish();
rollback;
