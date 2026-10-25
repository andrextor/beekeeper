# A3 · Admin dashboard and lists — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-03-dashboard-design.md` · Branch: `feat/a3-admin-dashboard` · Status: **awaiting OK**

1. **API layer** — `admin/src/lib/admin-api.ts`: typed wrappers for `admin_stats`, `admin_list_organizations`, `admin_list_users` (types from `supabase gen types`, generated into `admin/src/lib/database.types.ts` by root `pnpm types`), error mapping.
2. **Resumen** — `features/dashboard/DashboardPage.tsx`, `StorageCard.tsx` (+ `storage.ts` thresholds + test).
3. **Apicultores** — `features/organizations/OrganizationsPage.tsx` (search + pagination in the URL, table/cards).
4. **Usuarios** — `features/users/UsersPage.tsx`.
5. **Release** — `chore(release): 0.9.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. Sign in as `admin@landak.test`.
2. Resumen shows 2 apicultores, 4 usuarios, 1 revisor, 6 colmenas (5 activas)…; matches `select admin_stats()`.
3. Apicultores: search "ajeno" → only "Apiario Ajeno"; copy the URL into a new tab → same result.
4. Usuarios: `reviewer@landak.test` shows the badge "Revisor · Finca Landak".
5. Repeat at 390 px: cards instead of tables.
