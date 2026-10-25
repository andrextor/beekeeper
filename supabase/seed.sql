-- Local demo data only. Never run against the remote project.
-- Every seed user signs in with its email and the password `landak-2026`.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email,
  extensions.crypt('landak-2026', extensions.gen_salt('bf')), now(),
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

-- Apiaries and hives (B3). Ids: apiaries …c000-…, hives …d000-… (prefix 00000000-0000-4000-).
insert into public.apiaries (id, organization_id, name, farm_name, place, latitude, longitude, altitude_m, flora_notes, water_source, created_by) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', 'Vallecito 1', 'Finca Landak', 'Vereda El Vallecito',
   4.711000, -74.072100, 2550, 'Eucalipto, cítricos y flor de café en temporada.', 'Quebrada a 50 m', '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000001', 'La Loma', 'Finca Landak', 'Alto de la loma',
   null, null, 2700, 'Monte nativo y aguacate.', null, '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000002', 'Apiario del vecino', null, null,
   null, null, null, null, null, '00000000-0000-4000-a000-000000000003');

insert into public.hives (
  id, organization_id, apiary_id, name, qr_code, hive_type, brood_boxes, supers, colony_origin, colony_started_on,
  bee_race, queen_year, queen_marked, queen_color, queen_origin, status, notes, created_by
) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001',
   'C-01', 'V1C01A7K2M', 'langstroth', 1, 2, 'swarm_capture', '2025-03-14', 'africanizada', 2026, true, 'white', 'own_rearing',
   'active', null, '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001',
   'C-02', 'V1C02B8M3N', 'nucleus', 1, 0, 'split', '2026-08-02', 'africanizada', 2026, false, null, 'natural',
   'active', 'Núcleo de la división de C-01.', '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001',
   'C-03', 'V1C03C9N4P', 'langstroth', 1, 0, 'colony_purchase', '2024-11-20', 'africanizada', 2024, true, 'green', 'purchased',
   'dead', 'Se perdió en septiembre.', '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000002',
   'L-01', 'KM01D0P5QR', 'top_bar', null, null, 'swarm_capture', '2025-10-05', null, null, null, null, 'unknown',
   'active', null, '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000002',
   'L-02', 'KM02E1Q6ST', 'langstroth', 2, 1, 'package', '2025-06-30', 'africanizada', 2025, true, 'blue', 'purchased',
   'active', null, '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-d000-000000000006', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-c000-000000000003',
   'V-01', 'VC01F2R7VW', 'rustic', null, null, 'unknown', null, null, null, null, null, null,
   'active', null, '00000000-0000-4000-a000-000000000003');

-- Inspections and events (B4). Ids: inspections …e000-…, events …f000-…; dates relative to the reset.
insert into public.inspections (
  id, organization_id, hive_id, inspected_at, inspected_by, source, transcript, population_strength, temperament,
  queen_seen, eggs_seen, larvae_seen, queen_cells, brood_frames, honey_frames, pollen_frames, brood_pattern, stores,
  varroa_method, varroa_count, varroa_sample_size, pests, disease_signs, weather, temperature_c, attention_level,
  planned_actions, next_inspection_on, notes, created_by
) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000001',
   now() - interval '21 days', '00000000-0000-4000-a000-000000000001', 'manual', null, 4, 2,
   'yes', 'yes', 'yes', 'none', 6, 4, 2, 'compact', 'ok',
   'alcohol_wash', 3, 300, null, null, 'sunny', 22.5, 'none',
   '{treat}', (now() - interval '7 days')::date, 'Buena postura. Programar tratamiento de varroa.', '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000001',
   now() - interval '10 days', '00000000-0000-4000-a000-000000000002', 'manual', null, 4, 3,
   'not_checked', 'yes', 'yes', 'none', 6, 3, 2, 'compact', 'ok',
   null, null, null, '{ants}', null, 'cloudy', 18.0, 'soon',
   '{check_queen}', (now() + interval '4 days')::date, 'Hormigas en la piquera.', '00000000-0000-4000-a000-000000000002'),
  ('00000000-0000-4000-e000-000000000003', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000001',
   now() - interval '2 days', '00000000-0000-4000-a000-000000000001', 'voice',
   'Colmena fuerte, reina vista, poca miel, hay que alimentar esta semana.', 5, 2,
   'yes', 'yes', 'yes', 'none', 7, 1, 2, 'compact', 'low',
   null, null, null, null, null, 'sunny', 24.0, 'soon',
   '{feed}', (now() + interval '7 days')::date, null, '00000000-0000-4000-a000-000000000001');

insert into public.hive_events (id, organization_id, hive_id, inspection_id, type, occurred_at, details, created_by) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000001',
   null, 'treatment', now() - interval '14 days',
   '{"product": "Ácido oxálico", "active_ingredient": "oxalic_acid", "dose": "5 ml por cuadro", "method": "drip", "withdrawal_days": 0}',
   '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000001',
   '00000000-0000-4000-e000-000000000002', 'note', now() - interval '10 days',
   '{"text": "Nota 1: muchas hormigas subiendo por el soporte", "source": "voice", "slot": 1}',
   '00000000-0000-4000-a000-000000000002'),
  ('00000000-0000-4000-f000-000000000003', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000001',
   '00000000-0000-4000-e000-000000000003', 'note', now() - interval '2 days',
   '{"text": "Nota 2: poner grasa en las patas del soporte", "source": "text", "slot": 2}',
   '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-f000-000000000004', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000001',
   null, 'feeding', now() - interval '1 day',
   '{"feed": "sugar_syrup", "amount": 2, "unit": "l", "ratio": "1:1"}',
   '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-f000-000000000005', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000003',
   null, 'loss', now() - interval '40 days', '{"cause": "absconding"}',
   '00000000-0000-4000-a000-000000000001');
