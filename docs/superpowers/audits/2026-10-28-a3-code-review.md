# A3 · Admin dashboard and lists — code review

Date: 2026-10-28 · Branch: `feat/a3-admin-dashboard` · Reviewer: `/code-review` (background agent)

| # | Finding | Decision |
|---|---------|----------|
| R1 | `SearchInput` kept its text when the URL `q` changed from outside (sidebar link, back/forward) and wrote the old search back | Fixed: the input follows an external `q` |
| R2 | A page past the end (old link) returned 0 rows, so total = 0, no pager and "Aún no hay apicultores" | Fixed: `ListEmpty` says "Esta página ya no existe" with "Ir a la primera página" |
| R3 | "Actividad reciente" listed deleted organizations without a mark | Fixed: badge "Eliminado", as in the list |
| R4 | On `not_platform_admin` the cached profile still said admin and the query was retried | Fixed: `QueryError` drops `own-profile`; the query client never retries that refusal |
| R5 | A huge `?page=` overflowed the RPC's `integer` offset | Fixed: page capped at 100 000 |
| R6 | Background refetches dimmed the table (`isFetching`) | Fixed: dims only on `isPlaceholderData` |
| R7 | `onSearch` in the effect deps restarted the debounce on every render | Fixed: read through a ref |
| R8 | "Última revisión X / Sin revisiones" written three times | Fixed: `formatLastInspection` in `lib/format.ts`; the table column keeps only the relative date because its header already says "Última revisión" |
| R9 | `fetchUsers` had no `size` like `fetchOrganizations` | Fixed |
| R10 | The clickable row relied on `position: relative` on `<tr>` | Fixed: `DataTable` takes `rowHref` and the row navigates on click; the name stays a link for the keyboard |
