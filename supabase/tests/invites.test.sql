begin;
\ir _helpers.psql
select plan(14);

select tests.create_user('owner@landak.test') as owner_id \gset
select tests.create_user('reviewer@landak.test') as reviewer_id \gset
select tests.create_user('late@landak.test') as late_id \gset
select tests.create_user('co-owner@landak.test') as co_owner_id \gset
select gen_random_uuid() as org \gset

select tests.authenticate_as(:'owner_id');
select public.create_organization(:'org', 'Finca Landak');

select code as reviewer_code, invite_id from public.create_invite(:'org', 'reviewer', ' Para Ana ') \gset
select matches(:'reviewer_code'::text, '^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$', 'the code is 8 Crockford characters shown as XXXX-XXXX');
select is((select label from public.organization_invites where id = :'invite_id'), 'Para Ana', 'the label is trimmed');
select is(
  (select count(*) from public.organization_invites where code_hash = :'reviewer_code' or code_hash = replace(:'reviewer_code', '-', '')),
  0::bigint,
  'the plain code is never stored'
);

select throws_ok(
  format('select * from public.create_invite(%L, %L)', :'org', 'admin'),
  'P0001', 'El rol debe ser propietario o revisor.', 'an unknown role is refused'
);

select code as revoked_code, invite_id as revoked_id from public.create_invite(:'org', 'reviewer') \gset
select public.revoke_invite(:'revoked_id');
select code as expired_code, invite_id as expired_id from public.create_invite(:'org', 'reviewer') \gset
select code as owner_code from public.create_invite(:'org', 'owner') \gset

select tests.clear_authentication();
update public.organization_invites set expires_at = now() - interval '1 minute' where id = :'expired_id';

select tests.authenticate_as(:'reviewer_id');
select throws_ok(
  format('select * from public.create_invite(%L, %L)', :'org', 'reviewer'),
  'P0001', 'Solo el propietario de la organización puede hacer esto.', 'a non-owner cannot create invites'
);
select is(
  public.accept_invite(lower(replace(:'reviewer_code', '-', ' '))),
  :'org'::uuid,
  'the code is accepted in lowercase and with spaces'
);
select is((select role from public.organization_members where organization_id = :'org' and user_id = :'reviewer_id'), 'reviewer', 'with the invite''s role');
select is((select count(*) from public.organization_invites), 0::bigint, 'a reviewer sees no invites');

select tests.authenticate_as(:'late_id');
select throws_ok(
  format('select public.accept_invite(%L)', :'reviewer_code'),
  'P0001', 'El código no es válido, ya se usó o venció. Pide uno nuevo al propietario.', 'a used code is refused'
);
select throws_ok(
  format('select public.accept_invite(%L)', :'revoked_code'),
  'P0001', 'El código no es válido, ya se usó o venció. Pide uno nuevo al propietario.', 'a revoked code is refused'
);
select throws_ok(
  format('select public.accept_invite(%L)', :'expired_code'),
  'P0001', 'El código no es válido, ya se usó o venció. Pide uno nuevo al propietario.', 'an expired code is refused'
);
select throws_ok(
  'select public.accept_invite(''ZZZZ-ZZZZ'')',
  'P0001', 'El código no es válido, ya se usó o venció. Pide uno nuevo al propietario.', 'a made-up code is refused'
);

select tests.authenticate_as(:'co_owner_id');
select public.accept_invite(:'owner_code');
select is((select role from public.organization_members where organization_id = :'org' and user_id = :'co_owner_id'), 'owner', 'an owner code gives owner');

select tests.authenticate_as(:'owner_id');
select code as second_code from public.create_invite(:'org', 'reviewer') \gset
select public.accept_invite(:'second_code');
select is((select role from public.organization_members where organization_id = :'org' and user_id = :'owner_id'), 'owner', 'accepting a reviewer code as owner keeps owner');

select * from finish();
rollback;
