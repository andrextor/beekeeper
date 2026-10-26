# A4 · Admin organization detail — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-04-organization-design.md` · Branch: `feat/a4-admin-organization` · Status: **approved 2026-10-28**

1. **API**: `admin/src/lib/admin-api.ts` gets three functions, plus tests in `admin-api.test.ts` for the parser:
   - `fetchOrganizationSummary(id)`, with `parseOrganizationSummary(unknown)` guarded by `isRecord`.
   - `fetchApiary(id)`, which returns `null` when the apiary is missing.
   - `fetchHives(apiaryId)`.
2. **Formatting**: `admin/src/lib/format.ts` gets `formatColonyAge(date)` and `formatAltitude(m)`, tested in `format.test.ts`.
3. **Shared pieces**: in `admin/src/components/ui/`, `Segmented.tsx` (the views and the filter) and `Breadcrumbs.tsx`.
4. **Organization page**:
   - `admin/src/features/organizations/OrganizationPage.tsx` holds the header, the Apiarios and Personas views and the not-found state.
   - `routes.tsx` puts it at `apicultores/:id`, and adds a placeholder for `apicultores/:id/colmenas/:hiveId` (module A5).
5. **Apiary page**:
   - `admin/src/features/apiaries/ApiaryPage.tsx` holds the facts, the hive table and cards, and the Activas/Todas filter.
   - `routes.tsx` gets the route `apicultores/:id/apiarios/:apiaryId`.
6. **Changelog**: `CHANGELOG.md` under Unreleased.
7. **Release**: `chore(release): 0.10.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. Apicultores → Finca Landak: header with "Alta", 2 apiarios, 4 de 5 colmenas; the Apiarios view shows La Loma (2 de 2) and Vallecito 1 (2 de 3).
2. Personas: the owner (Propietario) and `reviewer@landak.test` (Revisor). Invitations appear only if one is pending. Reloading keeps `?tab=personas`.
3. Vallecito 1: facts (Finca Landak, Vereda El Vallecito, 2.550 m, flora, agua) and "Ver en el mapa". The table shows C-01 and C-02; "Todas" adds C-03 "Muerta". La Loma has no map link.
4. The breadcrumb "Finca Landak" goes back; `/apicultores/<made-up-uuid>` shows "Este apicultor no existe".
5. At 390 px, tables turn into cards.
