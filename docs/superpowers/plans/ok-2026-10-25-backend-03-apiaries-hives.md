# B3 · Apiaries and hives — plan

Spec: `docs/superpowers/specs/2026-10-25-backend-03-apiaries-hives-design.md` · Branch: `feat/b3-apiaries-hives` · Status: **awaiting OK**

1. **Shared domain triggers** — `<ts>_domain_triggers.sql`: `private.force_author()`, `private.check_parent_org()` (reads `TG_ARGV[0]` table, `TG_ARGV[1]` column).
2. **Apiaries** — `<ts>_apiaries.sql`: table, named checks, unique name index, `(organization_id, updated_at)` index, triggers (`set_updated_at`, `force_author`), `apiary_not_empty` trigger, RLS + grants.
3. **Hives** — `<ts>_hives.sql`: table, checks, unique `qr_code`, unique name per organization, indexes, triggers (`check_parent_org('apiaries','apiary_id')`), RLS + grants.
4. **Tests** — `supabase/tests/apiaries_hives.test.sql` (cases in the spec).
5. **Seed** — "Finca Landak": apiaries "Vallecito 1" (3 hives: C-01 Langstroth active, C-02 nucleus active, C-03 dead) and "La Loma" (2 hives); "Apiario Ajeno": 1 apiary, 1 hive.
6. **Docs** — `docs/api.md` Apiaries and Hives sections, Spanish labels table for every enum.
7. **Release** — `chore(release): 0.3.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. `pnpm db:reset && pnpm test:db` → green.
2. Studio → `hives`: 6 rows, each with a 10-character `qr_code`.
3. As `reviewer@landak.test` in the SQL editor: `select name from hives;` → the 5 Finca Landak hives; `update hives set name = 'X';` → 0 rows.
4. As `owner@landak.test`: `update apiaries set deleted_at = now() where name = 'Vallecito 1';` → error "El apiario todavía tiene colmenas.".
