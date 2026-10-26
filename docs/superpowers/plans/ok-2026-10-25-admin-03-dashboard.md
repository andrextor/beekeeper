# A3 · Admin dashboard and lists — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-03-dashboard-design.md` · Branch: `feat/a3-admin-dashboard` · Status: **approved 2026-10-28**

1. **API layer** — `admin/src/lib/admin-api.ts`: typed wrappers for `admin_stats`, `admin_list_organizations`, `admin_list_users` over the generated `database.types.ts` (`unknown` + guards for the jsonb results, no `any`), `pageCount(total, size)` and the `not_platform_admin` check; `admin-api.test.ts` for the guards and `pageCount`.
2. **Shared list pieces** — `components/ui/SearchInput.tsx` (on `Input`, 300 ms debounce), `components/ui/Pagination.tsx`, `components/ui/DataTable.tsx` (table from `md`, cards below), `lib/useListParams.ts` (`q`/`page` in the URL, new search → page 1).
3. **Resumen** — `features/dashboard/DashboardPage.tsx`, `StorageCard.tsx`, `storage.ts` (percent + tone thresholds) + `storage.test.ts`.
4. **Apicultores** — `features/organizations/OrganizationsPage.tsx`; routes `/apicultores` and `/apicultores/:id` (placeholder until A4).
5. **Usuarios** — `features/users/UsersPage.tsx`.
6. **Docs** — `CHANGELOG.md` under Unreleased.
7. **Release** — `chore(release): 0.9.0`.

Check (Iván): `pnpm ci:check`.

## How Iván tests it

1. `pnpm --filter admin dev`, sign in as `admin@landak.test`.
2. Resumen: 2 apicultores, 4 usuarios, 1 revisor, 3 apiarios, 5 de 6 colmenas activas, 3 revisiones and 4 eventos en 30 días, 0 fotos, storage bar empty; matches `select admin_stats()`. Actividad reciente: Finca Landak first.
3. Apicultores: search "ajeno" → only "Apiario Ajeno"; copy the URL into a new tab → same result. Click a row → "En construcción".
4. Usuarios: `reviewer@landak.test` shows "Revisor · Finca Landak"; `admin@landak.test` shows "Admin".
5. Repeat at 390 px: cards instead of tables. Light and dark.
