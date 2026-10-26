# A5 · Admin hive detail and timeline — spec

Date: 2026-10-25 · Refreshed: 2026-10-28 · Branch: `feat/a5-admin-hive-timeline` · Status: **approved 2026-10-28** · Version: 0.11.0

## Problem

From the apiary page the admin opens a hive and needs its records (every inspection, event, note and photo) in order, readable without opening each one, to answer support questions ("my reviewer's inspection does not show").

## Decisions

### `/apicultores/:id/colmenas/:hiveId`

- Reads, all under RLS with the admin flag:
  - `hives` by id, `deleted_at is null`, found only when `organization_id = :id`. Otherwise `NotFoundState` "Esta colmena no existe".
  - The apiary with the existing `fetchApiary(hive.apiary_id)` (key `['admin-apiary', id]`, cached when arriving from the apiary page).
  - The organization name with the existing `organizationSummaryQuery(id)`, which is also the admin check (as in A4).
- Breadcrumbs: `Apicultores › Finca Landak › Vallecito 1 › C-01`.
- Header: name (h1), status badge (A4 tones), QR code (monospace), facts shown only when set: tipo, cámaras / alzas, reina (year, colour dot, "marcada", origin), origen, edad (`formatColonyAge`), raza, notas.
- Two views in the URL like A4: Historial (default) and Fotos (`?tab=fotos`), with `Segmented`.

### Historial

- `hive_timeline(hiveId, before, beforeId, 30)` through `useInfiniteQuery`; "Cargar más" passes the last item's `at` and `id` (cursor, not offset). It stops when a page returns fewer than 30.
- `data` is the full row as JSON: parsed with type guards into `Inspection` / `HiveEvent` (generated `Tables<>` types); an unknown `kind` is skipped, a malformed row throws (`QueryError`).
- **Inspection** (`clipboard-check`): date, author (`author_name`, "Sin nombre" when null: the admin sees every profile, so null means no display name), source badge (`mic` "Por voz" / `keyboard` "Manual"), attention badge (soon `warning`, urgent `danger`, none hidden), and one summary line from `lib/inspection-summary.ts` ("Fuerza 4 · Reina vista · 7 cuadros de cría · Reservas: Pocas").
  - Expanding uses native `<details>`/`<summary>`: every recorded field with its Spanish label (`lib/labels.ts`), `not_checked` → "No revisado", null fields hidden, arrays joined, the transcript in a `blockquote`, the inspection notes.
- **Event**: icon per type (DESIGN.md: note `sticky-note`, feeding `droplet`, treatment `syringe`, harvest `package`, queen change `crown`, others `calendar-clock`), one line from `lib/event-summary.ts` ("Alimentación · Jarabe de azúcar 1:1 · 2 l"), author, date. A note shows its text and a `mic` icon when dictated.
- Empty → "Aún no hay registros".

### Fotos

- `photos` where `hive_id`, `deleted_at is null`, `order by taken_at desc`, 48 per page with `count: 'exact'`, embedding `inspections(inspected_at)`; page in `?page=` with the existing `Pagination`.
- Thumbnail signed URLs in one `createSignedUrls(paths, 3600)` call per page (`.jpg` → `.thumb.jpg`); an item whose thumbnail fails falls back to the main file, as `docs/api.md` says.
- Click → `Lightbox` on native `<dialog>` (`showModal`: focus trap and Esc for free): the main file's signed URL loaded on open, date, caption, "De la revisión del {fecha}" when linked.
- Signed URLs expire in 1 h; their queries use `staleTime` 50 min. Grids load only thumbnails (B5 egress rule).
- Empty → "Aún no hay fotos".

### Text from `details`

`lib/event-summary.ts`: one function per event type → a Spanish line; unknown keys ignored; unknown type → "Evento"; ids in `split`/`merge`/`transfer`/`swarm` are not shown (no extra reads). The `details` enums get Spanish labels in `lib/labels.ts` and in `docs/api.md` (feed, unit, treatment method, harvest product, loss cause, queen change reason). Tested against every shape in `docs/api.md`.

### Seed photos

The seed has no photos: Storage files cannot be written from `seed.sql`. `scripts/seed-photos.sh` (local only) signs in as `owner@landak.test` with the publishable key, uploads two sample JPEGs (main + thumbnail) for C-01 and upserts their `photos` rows, one linked to the latest inspection. It goes through RLS and the storage policies like the app; no service-role key. Sample files: `supabase/seed-photos/` (~200 KB in all).

## Changed from the first draft

- The timeline has inspections and events only (that is what `hive_timeline` returns). Notes are `note` events, so they appear as their own items; photos live in the Fotos tab instead of inside each inspection, which would cost one read per inspection.
- `pnpm seed:photos` did not exist: the script above adds it.
- The header shows breadcrumbs and the apiary, reusing A4's queries.

## Implementation notes

- `HiveStatusBadge` and `QueenMark` moved from the apiary page to `components/HiveBadges.tsx`, and the facts grid to `components/ui/FactList.tsx`: the hive page is their second user.
- `PagePlaceholder` is deleted: the hive page was its last user.
- No unit labels: `l`, `kg` and `g` read the same in Spanish.

## Security

Read only. Every read goes through RLS with the admin flag; Storage reads through the bucket's admin read policy with signed URLs (1 h), never public URLs. A non-admin gets `not_platform_admin` from the summary RPC → `/sin-acceso`. No migration, no new grants.

## Impact on the mobile contract

Only `docs/api.md` gains Spanish labels for the `details` enums, which the app shows too. Not breaking.

## Out of scope

Editing, downloading all photos, printing the QR (the app does it), photos inside each timeline item, resolving the hive ids in split/merge/transfer events to names.
