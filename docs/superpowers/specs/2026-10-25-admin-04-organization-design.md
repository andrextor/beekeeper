# A4 · Admin organization detail — spec

Date: 2026-10-25 · Refreshed: 2026-10-28 · Branch: `feat/a4-admin-organization` · Status: **awaiting OK** · Version: 0.10.0

## Problem

From the list, the admin opens one beekeeper and needs its people (owners, reviewers, pending invites), its apiaries and the hives in each, to answer support questions ("my reviewer cannot see the hives").

## Decisions

### `/apicultores/:id`

- One request: `admin_organization_summary(id)` (B6), query key `['admin-org', id]`. It returns `null` for an unknown id → `EmptyState` "Este apicultor no existe" + link back to Apicultores.
- Header: organization name (h1), "Eliminado" badge when `deleted_at`, "Alta {fecha}", and counts (apiarios, colmenas activas de total, personas).
- Two views chosen in the URL (`?tab=personas`; no param = Apiarios), drawn by a small `Segmented` control (buttons with `aria-pressed`), so a reload or a copied link keeps the view.
- **Apiarios**: one card per apiary with name, "N de M activas" and `formatLastInspection`. Card → `/apicultores/:id/apiarios/:apiaryId`. Empty → "Aún no hay apiarios".
- **Personas**: `DataTable` Correo · Nombre · Rol (badge, `roleLabels`) · Desde. Then "Invitaciones pendientes" only when there are some: Etiqueta · Rol · Creada · Vence.

### `/apicultores/:id/apiarios/:apiaryId`

- Two RLS reads (the admin read policy already covers apiaries and hives):
  - `apiaries` by id, with `deleted_at is null`.
  - `hives` where `apiary_id = …` and `deleted_at is null`, ordered by name. One apiary holds tens of hives, so there is no pagination.
- The organization name for the breadcrumb comes from the same `['admin-org', id]` query. It is cached when the admin arrives from the organization page and fetched again on a reload.
- Apiary facts, each shown only when set: finca, lugar, altitud ("2.550 m"), flora, agua, notas, and a `map-pin` link "Ver en el mapa" (Google Maps) when there are coordinates.
- Hive table: Nombre · Tipo · Estado (badge) · Cámaras/Alzas ("1 / 2") · Reina (year + colour dot from the stored `queen_color`) · Edad.
  - Edad comes from `colony_started_on`: "3 meses", "1 año y 7 meses".
  - A row opens `/apicultores/:id/colmenas/:hiveId`, which stays a placeholder until A5 (its URL is set by the A5 spec).
- `Segmented` "Activas" (default, `status = 'active'`) / "Todas" (`?estado=todas`), filtered on the client from the one hive list.
- Status badge tones: activa `success`; inactiva `neutral`; muerta, fugada `danger`; unida, vendida `neutral`.
- An unknown or deleted apiary, or one from another organization, gets the same `EmptyState` pattern ("Este apiario no existe").

### Breadcrumbs

`Breadcrumbs` component (`nav aria-label="Ruta"`, last item `aria-current="page"`): `Apicultores › Finca Landak` and `Apicultores › Finca Landak › Vallecito 1`. A5 adds the hive.

## Changed from the first draft

- Apiary cards drop farm, place and the map link: the B6 summary does not return them. They show on the apiary page instead, so no migration is needed.
- Invites have no email and no inviter, so they show their label and expiry.
- The hive table drops "Última revisión" and "Atención". Showing them would mean reading inspections per hive, and A5 shows both on the hive page.
- No "queen colour from year" helper: the hive stores its colour.

## Security

Read only. Every read goes through RLS with the admin flag. A non-admin gets `not_platform_admin` from the RPC → `QueryError` sends them to `/sin-acceso`. No new grants, no migration.

## Impact on the mobile contract

None.

## Out of scope

Map view, editing, member management (owners do it in the app), per-hive last inspection and attention (A5).
