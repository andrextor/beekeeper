# A5 · Admin hive detail and timeline — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-05-hive-timeline-design.md` · Branch: `feat/a5-admin-hive-timeline` · Status: **awaiting OK**

1. **API** — `admin-api.ts`: `getHive`, `getTimeline(hiveId, before)` (infinite query), `listPhotos(hiveId, page)`, `signPaths(paths)`.
2. **Summaries** — `lib/inspection-summary.ts`, `lib/event-summary.ts` + tests for every type in `docs/api.md`.
3. **Hive page** — `features/hives/HivePage.tsx`, `HiveHeader.tsx`, `TimelineList.tsx`, `InspectionItem.tsx`, `EventItem.tsx`.
4. **Photos** — `features/hives/PhotosTab.tsx` with `PhotoGrid` + `Lightbox`.
5. **Release** — `chore(release): 0.11.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. `pnpm db:reset && pnpm seed:photos`, sign in as admin, open C-01.
2. Timeline: 3 inspections and the events, newest first; expand the voice one → transcript block.
3. Tab Fotos → 2 thumbnails; click → full image; DevTools Network shows thumbnails `.thumb.jpg` in the grid.
4. At 390 px the timeline and the lightbox are usable with one hand.
