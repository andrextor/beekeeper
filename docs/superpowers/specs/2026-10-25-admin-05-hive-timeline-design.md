# A5 · Admin hive detail and timeline — spec

Date: 2026-10-25 · Branch: `feat/a5-admin-hive-timeline` · Status: **awaiting OK** · Version: 0.11.0

## Problem

The records themselves: every inspection, event, note and photo of a hive, in order, readable without opening each one.

## Decisions

### `/apicultores/:orgId/colmenas/:hiveId`

- Header: hive name, apiary, status badge, QR code text (monospace), type, boxes/supers, queen (year, color dot, marked, origin), origin, age, notes.
- **Timeline** from `hive_timeline(hiveId, before, 30)` (B4), "Cargar más" with the last item's date as `before` (cursor, not offset).
- Item rendering by kind:
  - Inspection (`clipboard-check`): date, author, source badge (`mic` "Por voz" / `keyboard` "Manual"), one summary line ("Fuerza 4 · Reina vista · 3 cuadros de cría · Reservas bajas"), attention badge. Expand → every recorded field with its Spanish label (`lib/labels.ts`), `not_checked` shown as "No revisado", null fields hidden; the original transcript in a quote block; its notes and photos.
  - Event: icon per type (DESIGN.md), one line from `details` ("Alimentación · Jarabe 1:1 · 2 l"), author.
- **Photos tab** (`?tab=fotos`): `PhotoGrid` of thumbnails (`photos where hive_id order by taken_at desc`, 48 per page), signed URLs in one `createSignedUrls` call per page; click → `Lightbox` loads the full image signed URL on demand, with date, caption and linked inspection.

### Text from `details`

`lib/event-summary.ts`: one pure function per event type → Spanish line; unknown keys ignored; unknown type → "Evento". Tested against the shapes in `docs/api.md`.

## Constraints

Signed URLs expire in 1 h; the query `staleTime` for photo URLs is 50 min. Thumbnails only in grids (B5 egress rule).

## Out of scope

Editing, downloading all photos, printing the QR (the app does it).
