begin;
\ir _helpers.psql
select plan(12);

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
select gen_random_uuid() as hive_a2 \gset
select gen_random_uuid() as hive_b \gset
select gen_random_uuid() as photo_id \gset
select format('%s/%s/%s.jpg', :'org_a', :'hive_a', :'photo_id') as path_a \gset

select tests.authenticate_as(:'owner_a');
select public.create_organization(:'org_a', 'Finca A');
select code from public.create_invite(:'org_a', 'reviewer') \gset
insert into public.apiaries (id, organization_id, name) values (:'apiary_a', :'org_a', 'Vallecito 1');
insert into public.hives (id, organization_id, apiary_id, name, qr_code) values
  (:'hive_a', :'org_a', :'apiary_a', 'C-01', 'AAAAAAAAAA'),
  (:'hive_a2', :'org_a', :'apiary_a', 'C-02', 'AAAAAAAAAB');
update public.hives set deleted_at = now() where id = :'hive_a2';
select tests.authenticate_as(:'reviewer_a');
select public.accept_invite(:'code');
select tests.authenticate_as(:'owner_b');
select public.create_organization(:'org_b', 'Finca B');
insert into public.apiaries (id, organization_id, name) values (:'apiary_b', :'org_b', 'Loma B');
insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (:'hive_b', :'org_b', :'apiary_b', 'B-01', 'BBBBBBBBBB');

-- The Storage API inserts the object row as the signed-in user; these statements do the same.
select tests.authenticate_as(:'reviewer_a');
select lives_ok(
  format('insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)', 'hive-photos', :'path_a', :'reviewer_a'),
  'a member uploads a photo into a hive of their organization'
);
select lives_ok(
  format('insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)', 'hive-photos', replace(:'path_a', '.jpg', '.thumb.jpg'), :'reviewer_a'),
  'and its thumbnail'
);
select throws_ok(
  format('insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)', 'hive-photos', format('%s/%s/%s.jpg', :'org_b', :'hive_b', gen_random_uuid()), :'reviewer_a'),
  '42501', null, 'nobody uploads into another organization''s folder'
);
select throws_ok(
  format('insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)', 'hive-photos', format('%s/%s/%s.jpg', :'org_a', :'hive_b', gen_random_uuid()), :'reviewer_a'),
  '42501', null, 'nor into a hive of another organization under their own folder'
);
select throws_ok(
  format('insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)', 'hive-photos', format('%s/%s/%s.jpg', :'org_a', :'hive_a2', gen_random_uuid()), :'reviewer_a'),
  '42501', null, 'nor into a deleted hive'
);
select throws_ok(
  format('insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)', 'hive-photos', 'no-es-uuid/foto.jpg', :'reviewer_a'),
  '42501', null, 'a name that is not a uuid path is refused without a cast error'
);
select throws_ok(
  format('insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)', 'hive-photos', format('%s/%s/%s.png', :'org_a', :'hive_a', gen_random_uuid()), :'reviewer_a'),
  '42501', null, 'only .jpg and .thumb.jpg names are accepted'
);
select throws_ok(
  format('update storage.objects set name = %L where name = %L', format('%s/%s/%s.jpg', :'org_b', :'hive_b', :'photo_id'), :'path_a'),
  '42501', null, 'an uploader cannot move their file into another organization'
);
insert into public.photos (id, organization_id, hive_id, storage_path, taken_at) values (:'photo_id', :'org_a', :'hive_a', :'path_a', now());
update storage.objects set metadata = '{"replaced": true}' where name = :'path_a';
select is(
  (select metadata ->> 'replaced' from storage.objects where name = :'path_a'), null,
  'once the photos row exists the file cannot be replaced'
);

select tests.authenticate_as(:'owner_b');
select is((select count(*) from storage.objects where bucket_id = 'hive-photos'), 0::bigint, 'another organization cannot see A''s files');

select tests.authenticate_as(:'admin_id');
-- Scoped to org A: files uploaded by hand in Studio would otherwise change the count.
select is(
  (select count(*) from storage.objects where bucket_id = 'hive-photos' and name like :'org_a' || '/%'), 2::bigint,
  'the platform admin sees every file'
);
select throws_ok(
  format('insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)', 'hive-photos', format('%s/%s/%s.jpg', :'org_a', :'hive_a', gen_random_uuid()), :'admin_id'),
  '42501', null, 'the platform admin cannot upload'
);

select * from finish();
rollback;
