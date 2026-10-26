# A4 · Admin organization detail — spec

Date: 2026-10-25 · Branch: `feat/a4-admin-organization` · Status: **awaiting OK** · Version: 0.10.0

## Problem

From the list, the admin opens one beekeeper and needs its people (owners, reviewers, pending invites), its apiaries and the hives in each, to answer support questions ("my reviewer cannot see the hives").

## Decisions

### `/apicultores/:orgId`

- One request: `admin_organization_summary(orgId)` (B6).
- Header: organization name (Plus Jakarta Sans h1), created date, counts.
- Tabs (URL `?tab=`): **Apiarios** (default) · **Personas**.
- Apiarios: cards with name, farm name, place, "N activas de M", last inspection (relative), `map-pin` link to Google Maps only when coordinates exist. Card click → `/apicultores/:orgId/apiarios/:apiaryId`.
- Personas: table Correo · Nombre · Rol (badge) · Desde; then "Invitaciones pendientes": Correo · Rol · Invitado por · Fecha.

### `/apicultores/:orgId/apiarios/:apiaryId`

- `select` apiary + `select hives where apiary_id = … and deleted_at is null order by name` (RLS), one query each.
- Apiary facts (farm, place, altitude, flora, water, notes).
- Hive table: Nombre · Tipo · Estado (badge) · Alzas · Reina (year + color dot) · Edad (from `colony_started_on`) · Última revisión · Atención. Row → hive detail (A5). Filter chips: Activas (default) / Todas.

### Breadcrumbs

`Apicultores › Finca Landak › Vallecito 1 › C-01` on every detail page.

## Out of scope

Map view, editing, member management (owners do it in the app).
