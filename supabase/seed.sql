-- Local demo data only. Never run against the remote project.
-- Sign in with any of these emails: request a code and read it in Mailpit (http://127.0.0.1:54324).

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-4000-a000-000000000001'::uuid, 'owner@landak.test'),
  ('00000000-0000-4000-a000-000000000002'::uuid, 'reviewer@landak.test'),
  ('00000000-0000-4000-a000-000000000003'::uuid, 'other@landak.test'),
  ('00000000-0000-4000-a000-000000000004'::uuid, 'admin@landak.test')
) as u (id, email);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u;

update public.profiles set display_name = v.name
from (values
  ('00000000-0000-4000-a000-000000000001'::uuid, 'Iván (propietario)'),
  ('00000000-0000-4000-a000-000000000002'::uuid, 'Revisora de prueba'),
  ('00000000-0000-4000-a000-000000000003'::uuid, 'Apicultor ajeno'),
  ('00000000-0000-4000-a000-000000000004'::uuid, 'Admin de plataforma')
) as v (id, name)
where profiles.id = v.id;

update public.profiles set is_platform_admin = true where id = '00000000-0000-4000-a000-000000000004';

insert into public.organizations (id, name, created_by) values
  ('00000000-0000-4000-b000-000000000001', 'Finca Landak', '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-b000-000000000002', 'Apiario Ajeno', '00000000-0000-4000-a000-000000000003');

insert into public.organization_members (organization_id, user_id, role) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', 'owner'),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002', 'reviewer'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000003', 'owner');
