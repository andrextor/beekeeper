# A3 · Admin dashboard and beekeepers list — spec

Date: 2026-10-25 (revised 2026-10-28 after B6/A2) · Branch: `feat/a3-admin-dashboard` · Status: **awaiting OK** · Version: 0.9.0

## Problem

The admin needs, at a glance, how much the platform is used and which beekeepers are active, and a way to find any beekeeper or user.

## Decisions

### `/` Resumen

- Stat cards from `admin_stats()` (B6, one request): Apicultores (`organizations`), Usuarios, Revisores, Apiarios, Colmenas activas "5 de 6", Revisiones · 30 días, Eventos · 30 días, Fotos.
- Storage card: `storage_bytes` against the 1 GB free limit as a bar; `honey` from 70 %, `danger` from 90 %, with the plain hint "Queda poco espacio gratis para fotos." (no technical copy; moving photos to R2 is documented in B5, not shown).
- "Actividad reciente": first 5 rows of `admin_list_organizations(null, 5)` (most recently inspected first) and a "Ver todos" link to `/apicultores`.

### `/apicultores` Apicultores

- Search by name or owner email: 300 ms debounce, `?q=` in the URL; `?page=` too, so a copied link reopens the same page. Changing the search goes back to page 1.
- `admin_list_organizations(q, 25, offset)`, pages from `total_count`.
- Columns: Organización · Propietario(s) · Miembros · Apiarios · Colmenas activas · Revisiones 30 d · Última revisión (relative, "Sin revisiones" when null) · Creada. Deleted organizations show the badge "Eliminado".
- Row → `/apicultores/:id`. Until A4 that route shows the "En construcción" placeholder.
- Below `md`: cards with name, owner, "N colmenas · última revisión hace X".

### `/usuarios` Usuarios

- Same search/page behaviour with `admin_list_users(q, 25, offset)`.
- Correo · Nombre · Organizaciones (badge `Propietario`/`Revisor` + name, link to the organization; a deleted organization's badge says "Eliminado") · badge "Admin" · Alta. Cards below `md`.

### Shared pieces

Both lists need the same search, pager and table-or-cards layout, so they are components from the start (second copy is the extraction): `SearchInput`, `Pagination`, `DataTable` (columns + a card renderer for phones) and a `useListParams()` hook for `q`/`page` in the URL.

### Data fetching

TanStack Query keys `['admin-stats']`, `['admin-orgs', q, page]`, `['admin-users', q, page]`; `staleTime` 60 s, `placeholderData: keepPreviousData` while paging; errors → `ErrorState` with retry. `not_platform_admin` (admin flag removed while signed in) → `/sin-acceso`, which already offers sign-out.

## Security

Read-only RPCs that already require the platform admin in SQL; the panel adds no writes and no new permission. Search text goes in the RPC body, never in the logged path beyond `?q=` of the panel itself.

## Impact on the mobile contract

None.

## Out of scope

Charts over time, CSV export, sorting by column, editing anything.
