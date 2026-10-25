begin;
\ir _helpers.psql
select plan(3);

select has_extension('pgtap', 'pgTAP is installed');

select tests.create_user('smoke@landak.test') as smoke_id \gset
select isnt(:'smoke_id'::uuid, null, 'create_user returns an id');

select tests.authenticate_as(:'smoke_id');
select is(auth.uid(), :'smoke_id'::uuid, 'authenticate_as sets auth.uid()');
select tests.clear_authentication();

select * from finish();
rollback;
