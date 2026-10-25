---
paths:
  - "supabase/**"
---

# SQL

- Lowercase SQL, `snake_case` identifiers, two-space indentation.
- One migration per change: `supabase migration new <slug>` → `<timestamp>_<slug>.sql`. Never edit a migration that is already on `main`; add a new one.
- No `create … if not exists` / `drop … if exists` to paper over drift: migrations run once, in order, on a known schema.
- Every table gets `alter table … enable row level security` in the same migration that creates it, and explicit grants (nothing is granted to `anon` unless a spec says so).
- Every `security definer` function has `set search_path = ''`, fully qualified names (`public.hives`, `auth.uid()`), and `revoke execute … from public` before its `grant`.
- Helpers that policies call live in schema `private` (not exposed by PostgREST). A predicate written twice becomes a helper.
- Named constraints: `<table>_<column>_check`, unique indexes `<table>_<purpose>_key`. Every unique index is listed in `docs/api.md` → Errors.
- Errors raised for clients: `raise exception '<Spanish message>' using errcode = 'P0001', detail = '<machine_code>';`
- Tests: `supabase/tests/<area>.test.sql`, each starts with `begin; \ir _helpers.psql` and ends with `select * from finish(); rollback;`. Impersonate with `tests.authenticate_as(id)`; read ids with `\gset` before switching roles.
