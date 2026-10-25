# A4 · Admin organization detail — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-04-organization-design.md` · Branch: `feat/a4-admin-organization` · Status: **awaiting OK**

1. **API** — `admin-api.ts`: `getOrganizationSummary`, `getApiary`, `listHives(apiaryId, { all })`.
2. **Hive facts helpers** — `lib/hive.ts`: age from `colony_started_on`, queen color from year (+ tests, shared with A5).
3. **Organization page** — `features/organizations/OrganizationPage.tsx` with tabs, `ApiaryCard.tsx`, `PeopleTab.tsx`.
4. **Apiary page** — `features/apiaries/ApiaryPage.tsx`, `HivesTable.tsx`, `Breadcrumbs` component.
5. **Release** — `chore(release): 0.10.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. Apicultores → Finca Landak → tab Apiarios shows Vallecito 1 (2 de 3 activas) and La Loma.
2. Tab Personas: owner and reviewer; invite `nuevo@landak.test` (from B2 test) if created.
3. Vallecito 1 → three hives; chip "Todas" shows C-03 as "Muerta".
4. Breadcrumb back to the organization; reload the page on any URL → same view.
