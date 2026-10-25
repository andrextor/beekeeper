begin;
\ir _helpers.psql
select plan(12);

select tests.create_user('owner@landak.test') as owner_id \gset
select tests.create_user('reviewer@landak.test') as reviewer_id \gset
select tests.create_user('unconfirmed@landak.test', false) as unconfirmed_id \gset
select tests.create_user('revoked@landak.test') as revoked_id \gset
select gen_random_uuid() as org \gset

select tests.authenticate_as(:'owner_id');
select public.create_organization(:'org', 'Finca Landak');

select public.invite_member(:'org', ' Reviewer@Landak.test ', 'reviewer') as invite_id \gset
select is((select email from public.organization_invites where id = :'invite_id'), 'reviewer@landak.test', 'the email is trimmed and lowercased');
select is(public.invite_member(:'org', 'reviewer@landak.test', 'reviewer'), :'invite_id'::uuid, 'a repeated invite returns the pending one');

select throws_ok(
  format('select public.invite_member(%L, %L, %L)', :'org', 'no-es-correo', 'reviewer'),
  'P0001', 'Escribe un correo válido.', 'an invalid email is refused'
);
select throws_ok(
  format('select public.invite_member(%L, %L, %L)', :'org', 'x@landak.test', 'admin'),
  'P0001', 'El rol debe ser propietario o revisor.', 'an unknown role is refused'
);
select throws_ok(
  format('select public.invite_member(%L, %L, %L)', :'org', 'owner@landak.test', 'reviewer'),
  'P0001', 'Esa persona ya es miembro de la organización.', 'a member cannot be invited'
);

select public.invite_member(:'org', 'unconfirmed@landak.test', 'reviewer');
select public.invite_member(:'org', 'revoked@landak.test', 'reviewer') as revoked_invite \gset
select public.revoke_invite(:'revoked_invite');
select throws_ok(
  format('select public.revoke_invite(%L)', :'revoked_invite'),
  'P0001', 'La invitación ya no está pendiente.', 'a revoked invite cannot be revoked again'
);

select tests.authenticate_as(:'unconfirmed_id');
select throws_ok(
  'select public.accept_my_invites()',
  'P0001', 'Confirma tu correo para aceptar invitaciones.', 'an unconfirmed email cannot accept'
);

select tests.authenticate_as(:'revoked_id');
select is((select count(*) from public.accept_my_invites()), 0::bigint, 'a revoked invite is not accepted');
select is((select count(*) from public.organizations), 0::bigint, 'so the organization stays hidden');

select tests.authenticate_as(:'reviewer_id');
select is((select count(*) from public.organization_invites), 0::bigint, 'a non-owner sees no invites');
select is((select count(*) from public.accept_my_invites()), 1::bigint, 'the invited person accepts');
select is(
  (select organization_name from public.my_memberships()),
  'Finca Landak',
  'my_memberships lists the organization'
);

select * from finish();
rollback;
