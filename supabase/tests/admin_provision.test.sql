begin;
\ir _helpers.psql
select plan(18);

select tests.create_user('admin@landak.test') as admin_id \gset
select tests.make_platform_admin(:'admin_id');
select tests.create_user('owner@landak.test') as owner_id \gset
select tests.create_user('new-owner@landak.test') as new_owner \gset
select tests.create_user('new-reviewer@landak.test') as new_reviewer \gset
select tests.create_user('new-admin@landak.test') as new_admin \gset
select tests.create_user('late@landak.test') as late_id \gset
select gen_random_uuid() as org_a \gset
select gen_random_uuid() as org_gone \gset

select tests.authenticate_as(:'owner_id');
select public.create_organization(:'org_a', 'Finca A');
select public.create_organization(:'org_gone', 'Finca Cerrada');
update public.organizations set deleted_at = now() where id = :'org_gone';

-- No client role can call it, admin or not.
select tests.authenticate_as(:'admin_id');
select throws_ok(
  format('select public.admin_provision_member(%L, %L, %L, %L, null, %L)', :'admin_id', :'new_owner', 'Ana', 'owner', 'Finca Ana'),
  '42501', null, 'a platform admin cannot call it from a client'
);
select tests.authenticate_as(:'owner_id');
select throws_ok(
  format('select public.admin_provision_member(%L, %L, %L, %L, null, %L)', :'owner_id', :'new_owner', 'Ana', 'owner', 'Finca Ana'),
  '42501', null, 'an owner cannot call it'
);
select tests.clear_authentication();

set local role service_role;

select throws_ok(
  format('select public.admin_provision_member(%L, %L, %L, %L, null, %L)', :'owner_id', :'new_owner', 'Ana', 'owner', 'Finca Ana'),
  'P0001', 'Solo administradores de la plataforma.', 'the actor must be a platform admin'
);

select public.admin_provision_member(:'admin_id', :'new_owner', ' Ana ', 'owner', null, 'Finca Ana') as ana_org \gset
select is((select name from public.organizations where id = :'ana_org'), 'Finca Ana', 'owner: the farm is created');
select is((select created_by from public.organizations where id = :'ana_org'), :'new_owner'::uuid, 'owner: the farm is theirs');
select is(
  (select role from public.organization_members where organization_id = :'ana_org' and user_id = :'new_owner'),
  'owner', 'owner: they own it'
);
select is((select display_name from public.profiles where id = :'new_owner'), 'Ana', 'owner: the name is set, trimmed');

select is(
  public.admin_provision_member(:'admin_id', :'new_reviewer', 'Rita', 'reviewer', :'org_a', null),
  :'org_a'::uuid, 'reviewer: returns the farm'
);
select is(
  (select role from public.organization_members where organization_id = :'org_a' and user_id = :'new_reviewer'),
  'reviewer', 'reviewer: they review it'
);
select is((select display_name from public.profiles where id = :'new_reviewer'), 'Rita', 'reviewer: the name is set');

select throws_ok(
  format('select public.admin_provision_member(%L, %L, %L, %L, %L, null)', :'admin_id', :'late_id', 'Luis', 'reviewer', :'org_gone'),
  'P0001', 'Esa finca ya no existe.', 'reviewer: a deleted farm is refused'
);
select throws_ok(
  format('select public.admin_provision_member(%L, %L, %L, %L, %L, null)', :'admin_id', :'late_id', 'Luis', 'reviewer', gen_random_uuid()),
  'P0001', 'Esa finca ya no existe.', 'reviewer: an unknown farm is refused'
);

select is(
  public.admin_provision_member(:'admin_id', :'new_admin', 'Pedro', 'admin', null, null),
  null::uuid, 'admin: no farm'
);
select ok((select is_platform_admin from public.profiles where id = :'new_admin'), 'admin: the flag is set');
select is(
  (select count(*)::int from public.organization_members where user_id = :'new_admin'),
  0, 'admin: no membership'
);
select ok(
  not (select is_platform_admin from public.profiles where id = :'new_owner'),
  'an owner is not made admin'
);

select throws_ok(
  format('select public.admin_provision_member(%L, %L, %L, %L, null, null)', :'admin_id', :'late_id', 'Luis', 'superuser'),
  'P0001', 'Tipo de usuario no válido.', 'an unknown role is refused'
);
select throws_ok(
  format('select public.admin_provision_member(%L, %L, %L, %L, null, %L)', :'admin_id', gen_random_uuid(), 'Nadie', 'owner', 'Finca'),
  'P0001', 'La cuenta no existe.', 'an unknown account is refused'
);

select * from finish();
rollback;
