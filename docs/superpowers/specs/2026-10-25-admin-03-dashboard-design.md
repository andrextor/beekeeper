# A3 · Admin dashboard and beekeepers list — spec

Date: 2026-10-25 · Branch: `feat/a3-admin-dashboard` · Status: **awaiting OK** · Version: 0.9.0

## Problem

The admin needs, at a glance, how much the platform is used and which beekeepers are active, and a way to find any beekeeper or user.

## Decisions

### `/` Resumen

- Stat cards from `admin_stats()` (B6), one request: Apicultores (organizations), Usuarios, Revisores, Apiarios, Colmenas activas (of total), Revisiones últimos 30 días, Eventos últimos 30 días, Fotos.
- Storage card: `photo_bytes` vs 1 GB free limit as a bar; `honey` above 70 %, `danger` above 90 %, with the hint "Al pasar del 70 % conviene mover las fotos a R2." (B5).
- "Actividad reciente": first 5 rows of `admin_list_organizations` (ordered by last inspection) with a link to "Ver todos".

### `/apicultores` Apicultores

- `SearchInput` (name or owner email, 300 ms debounce, `?q=` in the URL), `DataTable` from `admin_list_organizations(q, 25, offset)`, `Pagination` with `?page=` in the URL so a link reopens the same page.
- Columns: Organización · Propietario(s) · Miembros · Apiarios · Colmenas activas · Revisiones 30 d · Última revisión (relative) · Creada. Row click → `/apicultores/:id` (A4).
- Below `md`: cards with name, owner, "N colmenas · última revisión hace X".

### `/usuarios` Usuarios

- `admin_list_users(q, 25, offset)`: Correo · Nombre · Organizaciones (badges `Propietario`/`Revisor` + name, link to the organization) · Admin (badge) · Alta.

### Data fetching

TanStack Query keys `['admin-stats']`, `['admin-orgs', q, page]`, `['admin-users', q, page]`; `staleTime` 60 s, `keepPreviousData` while paging; errors → `ErrorState` with retry. `P0001 not_platform_admin` → sign out and `/sin-acceso`.

## Out of scope

Charts over time, CSV export, editing anything.
