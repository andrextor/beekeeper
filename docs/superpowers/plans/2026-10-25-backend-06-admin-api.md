# B6 · Platform admin read API — plan

Spec: `docs/superpowers/specs/2026-10-25-backend-06-admin-api-design.md` · Branch: `feat/b6-admin-api` · Status: **awaiting OK** (revised 2026-10-26)

1. **RPCs and index** — `<ts>_admin_rpcs.sql`: index `inspections_org_recent_idx`, `admin_stats`, `admin_list_organizations`, `admin_organization_summary`, `admin_list_users`; `revoke execute from public`, `grant to authenticated`.
2. **Tests** — `supabase/tests/admin_api.test.sql`.
3. **Docs** — `docs/api.md` Admin section with request/response examples.
4. **Release** — `chore(release): 0.6.0`, CHANGELOG, ROADMAP. Iván runs `pnpm ci:check`.

## How Iván tests it

1. `pnpm ci:check` → green.
2. SQL editor as `admin@landak.test`: `select admin_stats();` → 2 organizations, 4 users, 6 hives…; `select * from admin_list_organizations('landak');` → "Finca Landak" with owner `owner@landak.test`.
3. As `owner@landak.test`: `select admin_stats();` → "Solo administradores de la plataforma.".
