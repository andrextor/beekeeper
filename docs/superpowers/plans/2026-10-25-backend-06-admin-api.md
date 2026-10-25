# B6 · Platform admin read API — plan

Spec: `docs/superpowers/specs/2026-10-25-backend-06-admin-api-design.md` · Branch: `feat/b6-admin-api` · Status: **awaiting OK**

1. **Indexes** — `<ts>_admin_indexes.sql`.
2. **RPCs** — `<ts>_admin_rpcs.sql`: `admin_stats`, `admin_list_organizations`, `admin_organization_summary`, `admin_list_users`; `revoke execute from public`, `grant to authenticated`.
3. **Tests** — `supabase/tests/admin_api.test.sql`.
4. **Docs** — `docs/api.md` Admin section with request/response examples.
5. **Release** — `chore(release): 0.6.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. `pnpm db:reset && pnpm test:db` → green.
2. SQL editor as `admin@landak.test`: `select admin_stats();` → 2 organizations, 4 users, 6 hives…; `select * from admin_list_organizations('landak');` → "Finca Landak" with owner `owner@landak.test`.
3. As `owner@landak.test`: `select admin_stats();` → "Solo administradores de la plataforma.".
