begin;
\ir _helpers.psql
select plan(9);

select tests.create_user('owner-a@landak.test') as owner_a \gset
select tests.create_user('owner-b@landak.test') as owner_b \gset
select tests.create_user('admin@landak.test') as admin_id \gset
select gen_random_uuid() as org_a \gset
select gen_random_uuid() as org_b \gset
select tests.make_platform_admin(:'admin_id');

select tests.authenticate_as(:'owner_a');
select public.create_organization(:'org_a', 'Finca A');
select * from public.create_invite(:'org_a', 'reviewer');
select tests.authenticate_as(:'owner_b');
select public.create_organization(:'org_b', 'Finca B');

select tests.authenticate_as(:'admin_id');
select is((select count(*) from public.organizations), 2::bigint, 'the admin reads every organization');
select is((select count(*) from public.organization_members), 2::bigint, 'and every membership');
select is((select count(*) from public.organization_invites), 1::bigint, 'and every invite');
select is((select count(*) from public.profiles), 3::bigint, 'and every profile');

update public.organizations set name = 'Cambiada' where id = :'org_a';
select is((select name from public.organizations where id = :'org_a'), 'Finca A', 'the admin cannot rename an organization');
select throws_ok(
  format('select * from public.create_invite(%L, %L)', :'org_a', 'reviewer'),
  'P0001', 'Solo el propietario de la organización puede hacer esto.', 'the admin cannot invite'
);
select is((select count(*) from public.my_memberships()), 0::bigint, 'the admin is a member of nothing');

select tests.authenticate_as(:'owner_a');
select throws_ok(
  format('update public.profiles set is_platform_admin = true where id = %L', :'owner_a'),
  '42501', null, 'nobody can grant themselves the admin flag'
);
update public.profiles set display_name = 'Ana' where id = :'owner_a';
select is((select display_name from public.profiles where id = :'owner_a'), 'Ana', 'a user can set their display name');

select * from finish();
rollback;
