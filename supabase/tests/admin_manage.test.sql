begin;
\ir _helpers.psql
select plan(29);

select tests.create_user('admin@landak.test') as admin_id \gset
select tests.make_platform_admin(:'admin_id');
select tests.create_user('owner@landak.test') as owner_id \gset
select tests.create_user('reviewer@landak.test') as reviewer_id \gset
select tests.create_user('loose@landak.test') as loose_id \gset
select gen_random_uuid() as org_a \gset
select gen_random_uuid() as org_gone \gset

select tests.authenticate_as(:'owner_id');
select public.create_organization(:'org_a', 'Finca A');
select public.create_organization(:'org_gone', 'Finca Cerrada');
update public.organizations set deleted_at = now() where id = :'org_gone';
select code from public.create_invite(:'org_a', 'reviewer') \gset
select tests.authenticate_as(:'reviewer_id');
select public.accept_invite(:'code');

-- Nobody but a platform admin.
select tests.authenticate_as(:'owner_id');
select throws_ok(
  format('select public.admin_set_display_name(%L, %L)', :'reviewer_id', 'X'),
  'P0001', 'Solo administradores de la plataforma.', 'an owner cannot rename'
);
select throws_ok(
  format('select public.admin_set_member_role(%L, %L, %L)', :'org_a', :'reviewer_id', 'owner'),
  'P0001', 'Solo administradores de la plataforma.', 'an owner cannot use the admin role change'
);
select throws_ok(
  format('select public.admin_set_platform_admin(%L, true)', :'owner_id'),
  'P0001', 'Solo administradores de la plataforma.', 'an owner cannot make themselves admin'
);
select throws_ok(
  format('select public.admin_set_deactivated(%L, %L, true)', :'owner_id', :'reviewer_id'),
  '42501', null, 'admin_set_deactivated is not for clients'
);

select tests.authenticate_as(:'admin_id');

-- Name.
select public.admin_set_display_name(:'reviewer_id', '  Rita  ');
select is((select display_name from public.profiles where id = :'reviewer_id'), 'Rita', 'name set and trimmed');
select throws_ok(
  format('select public.admin_set_display_name(%L, %L)', :'reviewer_id', ' '),
  'P0001', 'El nombre debe tener entre 1 y 80 caracteres.', 'blank name refused'
);
select throws_ok(
  format('select public.admin_set_display_name(%L, %L)', gen_random_uuid(), 'X'),
  'P0001', 'La cuenta no existe.', 'unknown account refused'
);

-- Roles.
select public.admin_set_member_role(:'org_a', :'reviewer_id', 'owner');
select is(
  (select role from public.organization_members where organization_id = :'org_a' and user_id = :'reviewer_id'),
  'owner', 'reviewer made owner'
);
select public.admin_set_member_role(:'org_a', :'owner_id', 'reviewer');
select is(
  (select role from public.organization_members where organization_id = :'org_a' and user_id = :'owner_id'),
  'reviewer', 'an owner can be demoted while another owner remains'
);
select throws_ok(
  format('select public.admin_set_member_role(%L, %L, %L)', :'org_a', :'reviewer_id', 'reviewer'),
  'P0001', 'La finca debe tener al menos un dueño.', 'the last owner cannot be demoted'
);
select throws_ok(
  format('select public.admin_set_member_role(%L, %L, %L)', :'org_a', :'loose_id', 'owner'),
  'P0001', 'Esa persona no es miembro de la finca.', 'role change needs a member'
);
select throws_ok(
  format('select public.admin_set_member_role(%L, %L, %L)', :'org_a', :'owner_id', 'admin'),
  'P0001', 'El rol debe ser propietario o revisor.', 'only owner or reviewer'
);

-- Remove and add.
select throws_ok(
  format('select public.admin_remove_member(%L, %L)', :'org_a', :'reviewer_id'),
  'P0001', 'La finca debe tener al menos un dueño.', 'the last owner cannot be removed'
);
select public.admin_remove_member(:'org_a', :'owner_id');
select is(
  (select count(*)::int from public.organization_members where organization_id = :'org_a' and user_id = :'owner_id'),
  0, 'member removed'
);
select public.admin_add_member(:'org_a', :'loose_id', 'reviewer');
select is(
  (select role from public.organization_members where organization_id = :'org_a' and user_id = :'loose_id'),
  'reviewer', 'member added'
);
select throws_ok(
  format('select public.admin_add_member(%L, %L, %L)', :'org_a', :'loose_id', 'owner'),
  'P0001', 'Ya pertenece a esa finca.', 'already a member'
);
select throws_ok(
  format('select public.admin_add_member(%L, %L, %L)', :'org_gone', :'loose_id', 'reviewer'),
  'P0001', 'Esa finca ya no existe.', 'a deleted farm is refused'
);

-- Platform admin flag.
select public.admin_set_platform_admin(:'loose_id', true);
select ok((select is_platform_admin from public.profiles where id = :'loose_id'), 'admin granted');
select public.admin_set_platform_admin(:'loose_id', false);
select ok(not (select is_platform_admin from public.profiles where id = :'loose_id'), 'admin removed');
select throws_ok(
  format('select public.admin_set_platform_admin(%L, false)', :'admin_id'),
  'P0001', 'No puedes quitarte tu propio permiso de administrador.', 'own flag stays'
);

-- Deactivate (the Edge Function's half, as service_role).
select tests.clear_authentication();
set local role service_role;
select public.admin_set_deactivated(:'admin_id', :'reviewer_id', true);
select ok((select deactivated_at is not null from public.profiles where id = :'reviewer_id'), 'deactivated');
select public.admin_set_deactivated(:'admin_id', :'reviewer_id', false);
select ok((select deactivated_at is null from public.profiles where id = :'reviewer_id'), 'reactivated');
select throws_ok(
  format('select public.admin_set_deactivated(%L, %L, true)', :'admin_id', :'admin_id'),
  'P0001', 'No puedes desactivar tu propia cuenta.', 'own account stays active'
);
select throws_ok(
  format('select public.admin_set_deactivated(%L, %L, true)', :'owner_id', :'reviewer_id'),
  'P0001', 'Solo administradores de la plataforma.', 'the actor must be an admin'
);
-- With a second admin, one can be deactivated; but not when it would leave no active admin.
reset role;
select tests.make_platform_admin(:'loose_id');
set local role service_role;
select public.admin_set_deactivated(:'admin_id', :'loose_id', true);
select ok((select deactivated_at is not null from public.profiles where id = :'loose_id'), 'another admin deactivated');
select public.admin_set_deactivated(:'admin_id', :'loose_id', false);
reset role;
-- admin_id is deactivated but still holds a session: deactivating loose would leave no active admin.
update public.profiles set deactivated_at = now() where id = :'admin_id';
set local role service_role;
select throws_ok(
  format('select public.admin_set_deactivated(%L, %L, true)', :'admin_id', :'loose_id'),
  'P0001', 'Debe quedar al menos un administrador activo.', 'the last active admin stays'
);
reset role;
update public.profiles set deactivated_at = null where id = :'admin_id';
update public.profiles set deactivated_at = now() where id = :'reviewer_id';

-- Lists show it.
select tests.authenticate_as(:'admin_id');
select ok(
  (select deactivated_at is not null from public.admin_list_users('reviewer@')),
  'admin_list_users returns deactivated_at'
);
select ok(
  (select (m ->> 'deactivated_at') is not null
   from jsonb_array_elements(public.admin_organization_summary(:'org_a') -> 'members') as m
   where (m ->> 'user_id')::uuid = :'reviewer_id'),
  'admin_organization_summary members carry deactivated_at'
);
select is(
  (select count(*)::int from public.admin_list_users('landak.test')),
  4, 'deactivated users still listed'
);

select * from finish();
rollback;
