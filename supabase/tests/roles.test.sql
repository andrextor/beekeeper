begin;
\ir _helpers.psql
select plan(11);

select tests.create_user('owner@landak.test') as owner_id \gset
select tests.create_user('owner2@landak.test') as owner2_id \gset
select tests.create_user('reviewer@landak.test') as reviewer_id \gset
select gen_random_uuid() as org \gset

select tests.authenticate_as(:'owner_id');
select public.create_organization(:'org', 'Finca Landak');
select code as reviewer_code from public.create_invite(:'org', 'reviewer') \gset
select code as owner2_code from public.create_invite(:'org', 'owner') \gset

select tests.authenticate_as(:'reviewer_id');
select is(public.accept_invite(:'reviewer_code'), :'org'::uuid, 'the reviewer joins with the code');
select is((select role from public.organization_members where organization_id = :'org' and user_id = :'reviewer_id'), 'reviewer', 'and is a reviewer');

select throws_ok(
  format('select * from public.create_invite(%L, %L)', :'org', 'reviewer'),
  'P0001', 'Solo el propietario de la organización puede hacer esto.', 'a reviewer cannot invite'
);
select throws_ok(
  format('select public.set_member_role(%L, %L, %L)', :'org', :'reviewer_id', 'owner'),
  'P0001', 'Solo el propietario de la organización puede hacer esto.', 'a reviewer cannot change roles'
);
select throws_ok(
  format('select public.remove_member(%L, %L)', :'org', :'owner_id'),
  'P0001', 'No tienes permiso para quitar a esta persona.', 'a reviewer cannot remove others'
);

update public.organizations set name = 'Hackeada' where id = :'org';
select is((select name from public.organizations where id = :'org'), 'Finca Landak', 'a reviewer cannot rename the organization');

select lives_ok(format('select public.remove_member(%L, %L)', :'org', :'reviewer_id'), 'a reviewer can leave');
select is((select count(*) from public.organizations), 0::bigint, 'and then sees nothing');

select tests.authenticate_as(:'owner_id');
select throws_ok(
  format('select public.set_member_role(%L, %L, %L)', :'org', :'owner_id', 'reviewer'),
  'P0001', 'La organización debe tener al menos un propietario.', 'the last owner cannot step down'
);
select throws_ok(
  format('select public.remove_member(%L, %L)', :'org', :'owner_id'),
  'P0001', 'La organización debe tener al menos un propietario.', 'the last owner cannot leave'
);

select tests.authenticate_as(:'owner2_id');
select public.accept_invite(:'owner2_code');
select tests.authenticate_as(:'owner_id');
select lives_ok(
  format('select public.set_member_role(%L, %L, %L)', :'org', :'owner_id', 'reviewer'),
  'with a second owner, the first can step down'
);

select * from finish();
rollback;
