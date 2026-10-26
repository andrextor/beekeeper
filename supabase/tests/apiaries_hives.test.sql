begin;
\ir _helpers.psql
select plan(26);

select tests.create_user('owner-a@landak.test') as owner_a \gset
select tests.create_user('reviewer-a@landak.test') as reviewer_a \gset
select tests.create_user('owner-b@landak.test') as owner_b \gset
select tests.create_user('admin@landak.test') as admin_id \gset
select tests.make_platform_admin(:'admin_id');
select gen_random_uuid() as org_a \gset
select gen_random_uuid() as org_b \gset
select gen_random_uuid() as apiary_a \gset
select gen_random_uuid() as apiary_b \gset
select gen_random_uuid() as hive_a \gset

select tests.authenticate_as(:'owner_a');
select public.create_organization(:'org_a', 'Finca A');
select code from public.create_invite(:'org_a', 'reviewer') \gset
select tests.authenticate_as(:'reviewer_a');
select public.accept_invite(:'code');
select tests.authenticate_as(:'owner_b');
select public.create_organization(:'org_b', 'Finca B');
insert into public.apiaries (id, organization_id, name) values (:'apiary_b', :'org_b', 'Loma B');

-- Owner A
select tests.authenticate_as(:'owner_a');
select lives_ok(
  format(
    'insert into public.apiaries (id, organization_id, name, latitude, longitude, created_by) values (%L, %L, %L, 4.6, -74.08, %L)',
    :'apiary_a', :'org_a', 'Vallecito 1', :'reviewer_a'
  ),
  'an owner creates an apiary'
);
select is((select created_by from public.apiaries where id = :'apiary_a'), :'owner_a'::uuid, 'a forged created_by is replaced by the signed-in user');
select lives_ok(
  format(
    'insert into public.hives (id, organization_id, apiary_id, name, qr_code, hive_type, queen_year, queen_color) values (%L, %L, %L, %L, %L, %L, 2026, %L)',
    :'hive_a', :'org_a', :'apiary_a', 'C-01', '7K2M9QXA4B', 'langstroth', 'white'
  ),
  'an owner creates a hive'
);

insert into public.hives (id, organization_id, apiary_id, name, qr_code)
values (:'hive_a', :'org_a', :'apiary_a', 'C-01 bis', '7K2M9QXA4B')
on conflict (id) do update set name = excluded.name;
select is((select count(*) from public.hives where id = :'hive_a'), 1::bigint, 'an upsert retry by id keeps one row');
select is((select name from public.hives where id = :'hive_a'), 'C-01 bis', 'and applies the latest values');

select gen_random_uuid() as apiary_a2 \gset
insert into public.apiaries (id, organization_id, name) values (:'apiary_a2', :'org_a', 'La Loma');
select lives_ok(
  format('insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (%L, %L, %L, %L, %L)', gen_random_uuid(), :'org_a', :'apiary_a2', 'c-01 BIS', 'EEEEEEEEEE'),
  'the same hive name can be used in another apiary'
);
select throws_ok(
  format('insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (%L, %L, %L, %L, %L)', gen_random_uuid(), :'org_a', :'apiary_a2', 'C-01 BIS', 'FFFFFFFFFF'),
  '23505', null, 'hive names are unique inside one apiary, ignoring case'
);

select throws_ok(
  format('insert into public.apiaries (id, organization_id, name) values (%L, %L, %L)', gen_random_uuid(), :'org_a', 'VALLECITO 1'),
  '23505', null, 'apiary names are unique per organization, ignoring case'
);
select throws_ok(
  format('insert into public.apiaries (id, organization_id, name, latitude) values (%L, %L, %L, 4.6)', gen_random_uuid(), :'org_a', 'Sin longitud'),
  '23514', null, 'latitude without longitude is refused'
);
select throws_ok(
  format('insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (%L, %L, %L, %L, %L)', gen_random_uuid(), :'org_a', :'apiary_a', 'C-02', 'ILOU123456'),
  '23514', null, 'a QR code outside Crockford base32 is refused'
);
select throws_ok(
  format('insert into public.hives (id, organization_id, apiary_id, name, qr_code, colony_started_on) values (%L, %L, %L, %L, %L, current_date + 30)', gen_random_uuid(), :'org_a', :'apiary_a', 'C-03', 'AAAAAAAAAA'),
  'P0001', 'La fecha no puede ser futura.', 'a future colony start date is refused'
);
select throws_ok(
  format('insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (%L, %L, %L, %L, %L)', gen_random_uuid(), :'org_a', :'apiary_b', 'C-04', 'BBBBBBBBBB'),
  'P0001', 'El registro relacionado no existe o es de otra organización.', 'a hive cannot point at another organization''s apiary'
);
select throws_ok(
  format('update public.hives set organization_id = %L where id = %L', :'org_b', :'hive_a'),
  'P0001', 'Un registro no puede cambiar de organización.', 'a hive cannot move to another organization'
);
select throws_ok(
  format('update public.apiaries set deleted_at = now() where id = %L', :'apiary_a'),
  'P0001', 'El apiario todavía tiene colmenas. Muévelas o elimínalas primero.', 'an apiary with hives cannot be deleted'
);

-- Reviewer A
select tests.authenticate_as(:'reviewer_a');
select is((select count(*) from public.hives), 2::bigint, 'a reviewer reads the organization''s hives');
select throws_ok(
  format('insert into public.apiaries (id, organization_id, name) values (%L, %L, %L)', gen_random_uuid(), :'org_a', 'Del revisor'),
  '42501', null, 'a reviewer cannot create apiaries'
);
update public.hives set name = 'Renombrada' where id = :'hive_a';
select is((select name from public.hives where id = :'hive_a'), 'C-01 bis', 'a reviewer cannot edit hives');

-- Owner B
select tests.authenticate_as(:'owner_b');
select is((select count(*) from public.hives), 0::bigint, 'another organization sees none of A''s hives');
select throws_ok(
  format('insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (%L, %L, %L, %L, %L)', gen_random_uuid(), :'org_b', :'apiary_b', 'C-01', '7K2M9QXA4B'),
  '23505', null, 'QR codes are unique across organizations'
);
select lives_ok(
  format('insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (%L, %L, %L, %L, %L)', gen_random_uuid(), :'org_b', :'apiary_b', 'C-01 bis', 'CCCCCCCCCC'),
  'another organization can use the same hive name'
);

-- Platform admin
select tests.authenticate_as(:'admin_id');
select is((select count(*) from public.hives), 3::bigint, 'the platform admin reads every hive');
select throws_ok(
  format('insert into public.apiaries (id, organization_id, name) values (%L, %L, %L)', gen_random_uuid(), :'org_a', 'Del admin'),
  '42501', null, 'the platform admin cannot write'
);

-- Deleting in order
select tests.authenticate_as(:'owner_a');
update public.hives set deleted_at = now() where id = :'hive_a';
update public.apiaries set deleted_at = now() where id = :'apiary_a';
select throws_ok(
  format('update public.hives set deleted_at = null where id = %L', :'hive_a'),
  'P0001', 'El registro relacionado fue eliminado.', 'a hive cannot be restored into a deleted apiary'
);
select throws_ok(
  format('update public.hives set apiary_id = %L where name = %L', :'apiary_a', 'c-01 BIS'),
  'P0001', 'El registro relacionado fue eliminado.', 'a hive cannot move into a deleted apiary'
);
select lives_ok(
  format('insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (%L, %L, %L, %L, %L)', gen_random_uuid(), :'org_a', :'apiary_a2', 'Nueva', '7K2M9QXA4B'),
  'a deleted hive frees its QR code for a new colony'
);
select throws_ok(
  format('insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (%L, %L, %L, %L, %L)', gen_random_uuid(), :'org_a', :'apiary_a', 'C-05', 'DDDDDDDDDD'),
  'P0001', 'El registro relacionado fue eliminado.', 'a hive cannot be added to a deleted apiary'
);

select * from finish();
rollback;
