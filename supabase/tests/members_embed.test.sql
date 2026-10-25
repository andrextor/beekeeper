begin;
\ir _helpers.psql
select plan(2);

select tests.create_user('owner@landak.test') as owner_id \gset
select tests.create_user('reviewer@landak.test') as reviewer_id \gset
select tests.create_user('outsider@landak.test') as outsider_id \gset
select gen_random_uuid() as org \gset

select tests.authenticate_as(:'owner_id');
select public.create_organization(:'org', 'Finca Landak');
select code from public.create_invite(:'org', 'reviewer') \gset
select tests.authenticate_as(:'reviewer_id');
select public.accept_invite(:'code');

-- The SQL equivalent of the app's PostgREST embed organization_members?select=role,profiles(email,display_name).
select results_eq(
  format(
    'select p.email from public.organization_members m join public.profiles p on p.id = m.user_id where m.organization_id = %L order by p.email',
    :'org'
  ),
  array['owner@landak.test', 'reviewer@landak.test'],
  'a member sees the emails of the other members'
);

select tests.authenticate_as(:'outsider_id');
select is_empty(
  format(
    'select p.email from public.organization_members m join public.profiles p on p.id = m.user_id where m.organization_id = %L',
    :'org'
  ),
  'an outsider sees nothing'
);

select * from finish();
rollback;
