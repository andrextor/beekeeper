begin;
\ir _helpers.psql
select plan(17);

select tests.create_user('a@landak.test') as user_a \gset
select tests.create_user('b@landak.test') as user_b \gset
select gen_random_uuid() as org_a \gset
select gen_random_uuid() as org_b \gset

select is((select email from public.profiles where id = :'user_a'), 'a@landak.test', 'a profile is created for every new auth user');

select tests.authenticate_as(:'user_b');
select is(public.create_organization(:'org_b', 'Apiario B'), :'org_b'::uuid, 'B creates organization B');

select tests.authenticate_as(:'user_a');
select is(public.create_organization(:'org_a', '  Finca A  '), :'org_a'::uuid, 'A creates organization A');
select is((select name from public.organizations where id = :'org_a'), 'Finca A', 'the name is trimmed');
select is((select role from public.organization_members where organization_id = :'org_a' and user_id = :'user_a'), 'owner', 'the creator is owner');

select is(public.create_organization(:'org_a', 'Finca A'), :'org_a'::uuid, 'create_organization is idempotent for its owner');
select is((select count(*) from public.organization_members where organization_id = :'org_a'), 1::bigint, 'a retry adds no second membership');

select throws_ok(
  format('select public.create_organization(%L, %L)', :'org_b', 'Robada'),
  'P0001', 'Ese identificador ya está en uso.', 'another organization''s id is refused'
);
select throws_ok(
  format('select public.create_organization(%L, %L)', gen_random_uuid(), '   '),
  'P0001', 'El nombre debe tener entre 1 y 120 caracteres.', 'a blank name is refused'
);

select throws_ok(
  'select public.create_organization(null, ''Sin id'')',
  'P0001', 'Falta el identificador de la organización.', 'a null id is refused with a code'
);
select throws_ok(
  'select private.lock_organization(gen_random_uuid())',
  '42501', null, 'clients cannot call the RPC-only helpers'
);

select is((select count(*) from public.organizations), 1::bigint, 'A sees only organization A');
select is((select count(*) from public.organization_members where organization_id = :'org_b'), 0::bigint, 'A sees no members of B');
select is((select count(*) from public.profiles), 1::bigint, 'A sees only their own profile');

select throws_ok(
  format('update public.organizations set updated_at = %L where id = %L', '2000-01-01', :'org_a'),
  '42501', null, 'clients cannot write updated_at'
);

select tests.clear_authentication();
update public.organizations set name = 'Finca A2', updated_at = '2000-01-01', created_at = '2000-01-01' where id = :'org_a';
select is(
  (select array[created_at, updated_at] from public.organizations where id = :'org_a'),
  array[now(), now()],
  'the trigger owns created_at and updated_at even for privileged writes'
);

set local role anon;
select throws_ok('select count(*) from public.organizations', '42501', null, 'anon has no access');

select * from finish();
rollback;
