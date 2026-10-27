begin;
\ir _helpers.psql
select plan(20);

select tests.create_user('owner@landak.test') as owner_id \gset
select tests.create_user('reviewer@landak.test') as reviewer_id \gset
select tests.create_user('late@landak.test') as late_id \gset
select tests.create_user('co-owner@landak.test') as co_owner_id \gset
select tests.create_user('after@landak.test') as after_id \gset
select gen_random_uuid() as org \gset

select tests.authenticate_as(:'owner_id');
select public.create_organization(:'org', 'Finca Landak');

select code as reviewer_code, invite_id from public.create_invite(:'org', 'reviewer', ' Para Ana ') \gset
select matches(:'reviewer_code'::text, '^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$', 'the code is 8 Crockford characters shown as XXXX-XXXX');
select is((select label from public.organization_invites where id = :'invite_id'), 'Para Ana', 'the label is trimmed');
select throws_ok(
  'select code_hash from public.organization_invites',
  '42501', null, 'not even an owner can read code_hash'
);
select lives_ok(
  'select id, organization_id, label, role, invited_by, created_at, expires_at, accepted_at, accepted_by, revoked_at from public.organization_invites',
  'every other invite column is readable by the owner'
);

select throws_ok(
  format('select * from public.create_invite(%L, %L)', :'org', 'admin'),
  'P0001', 'El rol debe ser propietario, revisor u observador.', 'an unknown role is refused'
);

select code as revoked_code, invite_id as revoked_id from public.create_invite(:'org', 'reviewer') \gset
select public.revoke_invite(:'revoked_id');
select code as expired_code, invite_id as expired_id from public.create_invite(:'org', 'reviewer') \gset
select ok(
  (select expires_at from public.organization_invites where id = :'expired_id')
    between now() + interval '29 days' and now() + interval '31 days',
  'a new code lasts 30 days'
);
select code as owner_code from public.create_invite(:'org', 'owner') \gset

select tests.clear_authentication();
select is(
  (select count(*) from public.organization_invites where code_hash = :'reviewer_code' or code_hash = replace(:'reviewer_code', '-', '')),
  0::bigint,
  'the plain code is never stored'
);
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

select code as accepted_code, invite_id as accepted_id from public.create_invite(:'org', 'reviewer') \gset
select tests.authenticate_as(:'late_id');
select public.accept_invite(:'accepted_code');
select tests.authenticate_as(:'owner_id');
select throws_ok(
  format('select public.revoke_invite(%L)', :'accepted_id'),
  'P0001', 'La invitación ya no está pendiente.', 'an accepted invite cannot be revoked'
);

select code as orphan_code from public.create_invite(:'org', 'reviewer') \gset
update public.organizations set deleted_at = now() where id = :'org';
select throws_ok(
  format('select * from public.create_invite(%L, %L)', :'org', 'reviewer'),
  'P0001', 'La organización fue eliminada.', 'a deleted organization creates no invites'
);
select tests.authenticate_as(:'after_id');
select throws_ok(
  format('select public.accept_invite(%L)', :'orphan_code'),
  'P0001', 'El código no es válido, ya se usó o venció. Pide uno nuevo al propietario.', 'a deleted organization''s code is refused'
);

select * from finish();
rollback;
