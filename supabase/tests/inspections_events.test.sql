begin;
\ir _helpers.psql
select plan(29);

select tests.create_user('owner-a@landak.test') as owner_a \gset
select tests.create_user('reviewer-a@landak.test') as reviewer_a \gset
select tests.create_user('owner-b@landak.test') as owner_b \gset
select tests.create_user('admin@landak.test') as admin_id \gset
select tests.make_platform_admin(:'admin_id');
select gen_random_uuid() as org_a \gset
select gen_random_uuid() as org_b \gset
select gen_random_uuid() as hive_a \gset
select gen_random_uuid() as hive_a2 \gset
select gen_random_uuid() as hive_b \gset
select gen_random_uuid() as insp_rev \gset
select gen_random_uuid() as insp_owner \gset
select gen_random_uuid() as note_id \gset

select tests.authenticate_as(:'owner_a');
select public.create_organization(:'org_a', 'Finca A');
select code from public.create_invite(:'org_a', 'reviewer') \gset
select gen_random_uuid() as apiary_a \gset
insert into public.apiaries (id, organization_id, name) values (:'apiary_a', :'org_a', 'Vallecito 1');
insert into public.hives (id, organization_id, apiary_id, name, qr_code) values
  (:'hive_a', :'org_a', :'apiary_a', 'C-01', 'AAAAAAAAAA'),
  (:'hive_a2', :'org_a', :'apiary_a', 'C-02', 'AAAAAAAAAB');
select tests.authenticate_as(:'reviewer_a');
select public.accept_invite(:'code');
select tests.authenticate_as(:'owner_b');
select public.create_organization(:'org_b', 'Finca B');
select gen_random_uuid() as apiary_b \gset
insert into public.apiaries (id, organization_id, name) values (:'apiary_b', :'org_b', 'Loma B');
insert into public.hives (id, organization_id, apiary_id, name, qr_code) values (:'hive_b', :'org_b', :'apiary_b', 'B-01', 'BBBBBBBBBB');

-- Reviewer A records in the field
select tests.authenticate_as(:'reviewer_a');
select lives_ok(
  format(
    'insert into public.inspections (id, organization_id, hive_id, inspected_at, source, transcript, population_strength, pests, planned_actions)
     values (%L, %L, %L, now(), %L, %L, 4, %L, %L)',
    :'insp_rev', :'org_a', :'hive_a', 'voice', 'Colmena fuerte, poca reserva, hay que alimentar', '{ants}', '{feed}'
  ),
  'a reviewer creates an inspection'
);
select is((select inspected_by from public.inspections where id = :'insp_rev'), :'reviewer_a'::uuid, 'inspected_by defaults to the signed-in user');
select lives_ok(
  format(
    'insert into public.hive_events (id, organization_id, hive_id, inspection_id, type, occurred_at, details) values (%L, %L, %L, %L, %L, now(), %L)',
    :'note_id', :'org_a', :'hive_a', :'insp_rev', 'note', '{"text": "Nota 1: piquera con hormigas", "source": "voice", "slot": 1}'
  ),
  'a reviewer creates a note linked to the inspection'
);

insert into public.hive_events (id, organization_id, hive_id, type, occurred_at, details)
values (:'note_id', :'org_a', :'hive_a', 'note', now(), '{"text": "Nota 1 corregida", "source": "text"}')
on conflict (id) do update set details = excluded.details;
select is((select count(*) from public.hive_events where id = :'note_id'), 1::bigint, 'an upsert retry by id keeps one event');
select is((select details ->> 'text' from public.hive_events where id = :'note_id'), 'Nota 1 corregida', 'and the second write wins');

select throws_ok(
  format('insert into public.inspections (id, organization_id, hive_id, inspected_at, source) values (%L, %L, %L, now(), %L)', gen_random_uuid(), :'org_a', :'hive_b', 'manual'),
  'P0001', 'El registro relacionado no existe o es de otra organización.', 'an inspection cannot point at another organization''s hive'
);
select throws_ok(
  format('insert into public.inspections (id, organization_id, hive_id, inspected_at, source, inspected_by) values (%L, %L, %L, now(), %L, %L)', gen_random_uuid(), :'org_a', :'hive_a', 'manual', :'owner_b'),
  'P0001', 'La persona que revisó no pertenece a esta organización.', 'inspected_by must be a member of the organization'
);
select throws_ok(
  format('insert into public.inspections (id, organization_id, hive_id, inspected_at, source, pests) values (%L, %L, %L, now(), %L, %L)', gen_random_uuid(), :'org_a', :'hive_a', 'manual', '{abejorros}'),
  '23514', null, 'an unknown pest is refused'
);
select throws_ok(
  format('insert into public.inspections (id, organization_id, hive_id, inspected_at, source, planned_actions) values (%L, %L, %L, now(), %L, %L)', gen_random_uuid(), :'org_a', :'hive_a', 'manual', '{dance}'),
  '23514', null, 'an unknown planned action is refused'
);
select throws_ok(
  format('insert into public.inspections (id, organization_id, hive_id, inspected_at, source, varroa_count) values (%L, %L, %L, now(), %L, 3)', gen_random_uuid(), :'org_a', :'hive_a', 'manual'),
  '23514', null, 'a varroa count without its method is refused'
);
select throws_ok(
  format('insert into public.inspections (id, organization_id, hive_id, inspected_at, source, varroa_method, varroa_count) values (%L, %L, %L, now(), %L, %L, 3)', gen_random_uuid(), :'org_a', :'hive_a', 'manual', 'alcohol_wash'),
  '23514', null, 'an alcohol wash without sample size is refused'
);
select throws_ok(
  format('insert into public.inspections (id, organization_id, hive_id, inspected_at, source) values (%L, %L, %L, now() + interval ''3 days'', %L)', gen_random_uuid(), :'org_a', :'hive_a', 'manual'),
  'P0001', 'La fecha no puede ser futura.', 'an inspection days in the future is refused'
);
select throws_ok(
  format('insert into public.hive_events (id, organization_id, hive_id, type, occurred_at, details) values (%L, %L, %L, %L, now(), %L)', gen_random_uuid(), :'org_a', :'hive_a', 'note', '{"source": "voice"}'),
  '23514', null, 'a note without text is refused'
);
select throws_ok(
  format('insert into public.hive_events (id, organization_id, hive_id, inspection_id, type, occurred_at) values (%L, %L, %L, %L, %L, now())', gen_random_uuid(), :'org_a', :'hive_a2', :'insp_rev', 'feeding'),
  'P0001', 'El registro relacionado no existe o es de otra organización.', 'an event cannot link an inspection of another hive'
);

-- Owner A
select tests.authenticate_as(:'owner_a');
select lives_ok(
  format(
    'insert into public.inspections (id, organization_id, hive_id, inspected_at, source, planned_actions) values (%L, %L, %L, now() - interval ''7 days'', %L, %L)',
    :'insp_owner', :'org_a', :'hive_a', 'manual', '{treat}'
  ),
  'an owner creates an inspection'
);
update public.inspections set notes = 'Revisada por el propietario' where id = :'insp_rev';
select is((select notes from public.inspections where id = :'insp_rev'), 'Revisada por el propietario', 'an owner edits a reviewer''s inspection');

-- Reviewer A edits only their own
select tests.authenticate_as(:'reviewer_a');
update public.inspections set notes = 'Cambiada por el revisor' where id = :'insp_owner';
select is((select notes from public.inspections where id = :'insp_owner'), null, 'a reviewer cannot edit the owner''s inspection');
update public.inspections set notes = 'Corregida por el revisor' where id = :'insp_rev';
select is((select notes from public.inspections where id = :'insp_rev'), 'Corregida por el revisor', 'a reviewer edits their own inspection');

select throws_ok(
  format('update public.inspections set hive_id = %L where id = %L', :'hive_a2', :'insp_rev'),
  'P0001', 'Un registro no puede cambiar de colmena.', 'an inspection cannot move to another hive'
);

-- Open tasks
select is(
  (select planned_actions from public.hive_open_tasks where hive_id = :'hive_a'), '{feed}'::text[],
  'open tasks are the planned actions of the latest inspection'
);
update public.inspections set deleted_at = now() where id = :'insp_rev';
select is(
  (select planned_actions from public.hive_open_tasks where hive_id = :'hive_a'), '{treat}'::text[],
  'a deleted inspection gives way to the previous one'
);
select isnt((select deleted_at from public.hive_events where id = :'note_id'), null, 'deleting an inspection deletes its linked events');

-- Owner B
select tests.authenticate_as(:'owner_b');
select is((select count(*) from public.inspections), 0::bigint, 'another organization sees none of A''s inspections');
select is((select count(*) from public.hive_open_tasks), 0::bigint, 'nor their open tasks');
select is((select count(*) from public.hive_events), 0::bigint, 'nor their events');

-- Platform admin
select tests.authenticate_as(:'admin_id');
select is((select count(*) from public.inspections), 2::bigint, 'the platform admin reads every inspection');
select throws_ok(
  format('insert into public.inspections (id, organization_id, hive_id, inspected_at, source, inspected_by) values (%L, %L, %L, now(), %L, %L)', gen_random_uuid(), :'org_a', :'hive_a', 'manual', :'owner_a'),
  '42501', null, 'the platform admin cannot write'
);

-- A removed member's past inspections stay editable by the owner
select tests.authenticate_as(:'owner_a');
select public.remove_member(:'org_a', :'reviewer_a');
update public.inspections set notes = 'Tras la salida del revisor', deleted_at = null where id = :'insp_rev';
select is((select notes from public.inspections where id = :'insp_rev'), 'Tras la salida del revisor', 'the owner edits an inspection by a removed member');

select tests.authenticate_as(:'reviewer_a');
select is((select count(*) from public.inspections), 0::bigint, 'a removed member no longer reads the organization');

select * from finish();
rollback;
