begin;
\ir _helpers.psql
select plan(21);

select tests.create_user('owner-a@landak.test') as owner_a \gset
select tests.create_user('reviewer-a@landak.test') as reviewer_a \gset
select tests.create_user('owner-b@landak.test') as owner_b \gset
select tests.create_user('admin@landak.test') as admin_id \gset
select tests.make_platform_admin(:'admin_id');
select gen_random_uuid() as org_a \gset
select gen_random_uuid() as org_b \gset
select gen_random_uuid() as apiary_a \gset
select gen_random_uuid() as hive_a \gset
select gen_random_uuid() as hive_gone \gset

select tests.authenticate_as(:'owner_a');
select public.create_organization(:'org_a', 'Finca A');
select code from public.create_invite(:'org_a', 'reviewer') \gset
select public.create_invite(:'org_a', 'reviewer', 'Pendiente');
insert into public.apiaries (id, organization_id, name) values (:'apiary_a', :'org_a', 'Vallecito 1');
insert into public.hives (id, organization_id, apiary_id, name, qr_code) values
  (:'hive_a', :'org_a', :'apiary_a', 'C-01', 'AAAAAAAAAA'),
  (:'hive_gone', :'org_a', :'apiary_a', 'C-02', 'AAAAAAAAAB');
update public.hives set deleted_at = now() where id = :'hive_gone';
insert into public.inspections (id, organization_id, hive_id, inspected_at, source) values (gen_random_uuid(), :'org_a', :'hive_a', now(), 'manual');
insert into storage.objects (bucket_id, name, owner_id, metadata)
values ('hive-photos', format('%s/%s/%s.jpg', :'org_a', :'hive_a', gen_random_uuid()), :'owner_a', '{"size": 1000}');
select tests.authenticate_as(:'reviewer_a');
select public.accept_invite(:'code');
select tests.authenticate_as(:'owner_b');
select public.create_organization(:'org_b', 'Miel 100% pura');
select gen_random_uuid() as org_gone \gset
select gen_random_uuid() as apiary_gone \gset
select gen_random_uuid() as hive_closed \gset
select gen_random_uuid() as photo_gone \gset
select public.create_organization(:'org_gone', 'Cerrada');
insert into public.apiaries (id, organization_id, name) values (:'apiary_gone', :'org_gone', 'Vieja');
insert into public.hives (id, organization_id, apiary_id, name, qr_code) values
  (:'hive_closed', :'org_gone', :'apiary_gone', 'V-01', 'AAAAAAAAAC');
insert into public.inspections (id, organization_id, hive_id, inspected_at, source)
values (gen_random_uuid(), :'org_gone', :'hive_closed', now(), 'manual');
insert into public.hive_events (id, organization_id, hive_id, type, occurred_at)
values (gen_random_uuid(), :'org_gone', :'hive_closed', 'feeding', now());
insert into public.photos (id, organization_id, hive_id, storage_path, taken_at)
values (:'photo_gone', :'org_gone', :'hive_closed', format('%s/%s/%s.jpg', :'org_gone', :'hive_closed', :'photo_gone'), now());
update public.organizations set deleted_at = now() where id = :'org_gone';

-- Not an admin
select tests.authenticate_as(:'owner_a');
select throws_ok('select public.admin_stats()', 'P0001', 'Solo administradores de la plataforma.', 'an owner cannot call admin RPCs');
select tests.authenticate_as(:'reviewer_a');
select throws_ok(
  'select * from public.admin_list_organizations()', 'P0001', 'Solo administradores de la plataforma.', 'nor can a reviewer'
);

-- Admin
select tests.authenticate_as(:'admin_id');
select is((public.admin_stats() ->> 'organizations')::integer, 2, 'stats count organizations');
select is((public.admin_stats() ->> 'users')::integer, 4, 'stats count users');
select is((public.admin_stats() ->> 'hives_active')::integer, 1, 'a soft-deleted hive is not counted');
select is((public.admin_stats() ->> 'inspections_30d')::integer, 1, 'stats count recent inspections');
select is((public.admin_stats() ->> 'reviewers')::integer, 1, 'stats count reviewers');
select is((public.admin_stats() ->> 'apiaries')::integer, 1, 'a deleted organization''s apiaries are not counted');
select is((public.admin_stats() ->> 'events_30d')::integer, 0, 'nor its events');
select is((public.admin_stats() ->> 'photos')::integer, 0, 'nor its photos');
select ok((public.admin_stats() ->> 'storage_bytes')::bigint >= 1000, 'stats sum the bytes stored in hive-photos');

select is(
  (select name from public.admin_list_organizations('  OWNER-A@ ')), 'Finca A',
  'search finds an organization by its owner''s email, trimmed and ignoring case'
);
select is(
  (select array_agg(name) from public.admin_list_organizations('%')), array['Miel 100% pura'],
  'a % in the search is literal'
);
select is((select count(*) from public.admin_list_organizations(null, 0)), 1::bigint, 'p_limit is clamped to at least one');
select is((select total_count from public.admin_list_organizations(null, 1)), 3::bigint, 'total_count is the unpaged count');
select is(
  (select name from public.admin_list_organizations() limit 1), 'Finca A',
  'organizations with recent inspections come first'
);
select is(
  (select members from public.admin_list_organizations('Finca A')), 2,
  'the list counts members'
);

select is(
  jsonb_array_length(public.admin_organization_summary(:'org_a') -> 'pending_invites'), 1,
  'the summary lists only pending invites'
);
select is(
  (public.admin_organization_summary(:'org_a') -> 'apiaries' -> 0 ->> 'hives_total')::integer, 1,
  'the summary leaves soft-deleted hives out'
);

select is(
  (select organizations -> 0 ->> 'role' from public.admin_list_users('reviewer-a')), 'reviewer',
  'users list their organizations and roles'
);
select is(
  (select organizations -> 0 ->> 'deleted_at' from public.admin_list_users('owner-b')) is not null, true,
  'a membership says when its organization is deleted'
);

select * from finish();
rollback;
