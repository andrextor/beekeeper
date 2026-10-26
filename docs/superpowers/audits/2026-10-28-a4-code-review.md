# A4 code review — 2026-10-28

Branch `feat/a4-admin-organization`, `/code-review` over the diff from `main`.

| # | Finding | Verdict |
|---|---------|---------|
| R1 | Clicking the hive name link inside a table row navigates twice (Link + row `onClick`), doubling the history entry | **Fixed** in `DataTable`: the row ignores clicks that land on a link. Covers Apicultores too |
| R2 | Apiary and hive reads go through RLS, so a demoted admin sees "Este apiario no existe" instead of being sent to `/sin-acceso` | **Fixed**: the apiary page shows the summary query's error, and `QueryError` redirects on `not_platform_admin` |
| R3 | A hive-list error replaced the whole section, heading and filter included | **Fixed**: the error shows under the heading |
| R4 | `fetchHives` has no limit, so PostgREST max-rows could cut the list silently | **Accepted ceiling**: one apiary holds tens of hives; marked with a `ponytail:` comment |
| R5 | The apiary page runs the full summary RPC only for the breadcrumb name | **Kept**: it is cached from the organization page, organizations hold a handful of apiaries, and it is the admin check of R2 |
| R6 | The summary RPC's `last_inspection_at` counts inspections of soft-deleted hives | **Fixed** in 0.11.1 (`20261028100000_admin_skip_deleted_hives.sql`): every admin count of inspections and events skips deleted hives |
| R7 | `formatColonyAge` never completed the month for starts on the 29th–31st in shorter months | **Fixed** + tests |
| R8 | The hive URL was written three times | **Fixed**: `hivePath(hive)` from `hive.organization_id` |
| R9 | `hiveColumns` rebuilt every render | **Fixed**: module-level, thanks to R8 |
| R10 | `staleTime: 60_000` repeated while `main.tsx` sets a default | **Fixed for A4**: the new queries use the default (30 s). A3's pages keep their 60 s |
