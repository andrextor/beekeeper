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
- **Secrets and hashes never get a select grant.** When a table holds one, grant `select (col, …)` on the other columns instead of the whole table, and say in `docs/api.md` that clients must list columns.
- **Check-then-act is a race.** Lock first (`select … for update`, or the organization lock), then check state and authorization, then write. An `update` that depends on a state checks that state again in its own `where` and raises when it matched nothing.
- **Idempotent creates** use `insert … on conflict (id) do nothing` and look at `found`, never `if exists … then insert`.
- **Soft-deleted parents** are checked in every RPC that acts on their children, and parent checks run again when a child is **restored** (`deleted_at` back to null), not only when its foreign key changes. Parent rows are read `for share` so a concurrent soft delete of the parent is serialized against the child write.
- **A link checked from the child is also protected from the parent side.** If a child must match its parent (same hive, same organization), the parent's matched column is immutable or the parent's change cascades; a parent's soft delete cascades to children that only make sense with it.
- **Keyset cursors** order by `(at, id)`, default a missing tiebreaker so a partial cursor stays strict, and their index carries the tiebreaker (`(hive_id, at desc, id desc)`).
- Partial unique indexes (`where deleted_at is null`) for anything a deleted row should give back: names, printed QR codes.
- `execute` is granted to `authenticated` only for helpers that policies or `security invoker` functions call; helpers used only inside `security definer` RPCs get no grant.
- Postgres fires `before` triggers in name order: domain tables name them `<table>_<NN>_<purpose>` (`10_set_timestamps`, `20_force_author`, `30_check_<parent>`, `40+` table-specific checks), so authorship and immutability errors win over parent checks.
- Errors raised for clients: `raise exception '<Spanish message>' using errcode = 'P0001', detail = '<machine_code>';`
- Tests: `supabase/tests/<area>.test.sql`, each starts with `begin; \ir _helpers.psql` and ends with `select * from finish(); rollback;`. Impersonate with `tests.authenticate_as(id)`; read ids with `\gset` before switching roles.
