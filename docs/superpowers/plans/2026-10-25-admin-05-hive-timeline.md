# A5 · Admin hive detail and timeline — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-05-hive-timeline-design.md` · Branch: `feat/a5-admin-hive-timeline` · Status: **awaiting OK**

1. **Seed photos** — `scripts/seed-photos.sh` (rules in `.claude/rules/scripts.md`), `supabase/seed-photos/{1,2}.jpg` + `.thumb.jpg`, `package.json` script `seed:photos`, a line in `docs/api.md` Local development.
2. **Labels** — `lib/labels.ts`: `feedLabels`, `unitLabels`, `treatmentMethodLabels`, `harvestProductLabels`, `lossCauseLabels`, `queenChangeReasonLabels`; the same table in `docs/api.md` Events. Test in `labels.test.ts`.
3. **Summaries** — `lib/inspection-summary.ts` (summary line + the label/value list for the expanded view), `lib/event-summary.ts`; tests for every event shape in `docs/api.md` and for an inspection with only the required fields.
4. **API** — `admin-api.ts`: `fetchHive(id)`, `parseTimelineRow` + `fetchTimeline(hiveId, cursor)`, `fetchPhotos(hiveId, page)`, `signPhotoUrls(paths)` with the thumbnail fallback. Test for `parseTimelineRow`.
5. **Hive page** — `features/hives/HivePage.tsx` (breadcrumbs, header, `Segmented`), `TimelineList.tsx` (infinite query, inspection and event items); route in `routes.tsx` replaces the placeholder.
6. **Photos** — `features/hives/PhotosTab.tsx` (grid + pagination) and `Lightbox.tsx` (`<dialog>`).
7. **Changelog** — `## [0.11.0]` Added.
8. **Release** — `chore(release): 0.11.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. `pnpm db:reset && pnpm seed:photos`, sign in as `admin@landak.test`, Apicultores › Finca Landak › Vallecito 1 › C-01.
2. Breadcrumbs show the four levels; the header shows QR `V1C01A7K2M`, Langstroth, 1 / 2, reina 2026 blanca marcada.
3. Historial, newest first: Alimentación (jarabe 1:1, 2 l), Nota 2, the voice inspection with "Reservas: Pocas" and Pronto, Tratamiento (ácido oxálico), Nota 1, the inspection from 10 days ago, the first inspection (a note shares its inspection's instant and sorts first by id). Expand the voice one → transcript block; fields never recorded do not show.
4. Fotos → 2 thumbnails; DevTools Network shows `.thumb.jpg` in the grid and the `.jpg` only after a click; Esc closes the lightbox.
5. A made-up hive id in the URL → "Esta colmena no existe".
6. At 390 px the timeline and the lightbox work with one hand, in light and dark.
