# A5 · Hive page — code review

Date: 2026-10-28 · Branch: `feat/a5-admin-hive-timeline` · Source: `/code-review` on the branch diff.

| # | Finding | Verdict |
|---|---------|---------|
| R1 | `formatCalendarDate` threw a `RangeError` on text that is not `YYYY-MM-DD` (free-form `details.ends_on`), crashing the whole timeline | **Fixed**: it checks the pattern and shows other text as is; test added |
| R2 | Signed URL queries had `staleTime` 50 min but no `refetchInterval`, so an open tab held expired URLs after 1 h | **Fixed**: `refetchInterval` 50 min on the thumbnail and full-photo queries (`signedUrlRefresh`) |
| R3 | `signThumbnails` matched `createSignedUrls` results by index | **Fixed**: matched by the `path` each result carries |
| R4 | A background refetch error replaced a loaded timeline with an error card | **Fixed**: the full error shows only when there is no data |
| R5 | A page past the last one (`?page=9`) showed "Aún no hay fotos" with no way back | **Fixed**: the empty state needs `total = 0`; otherwise the pagination stays |
| R6 | A varroa count without a method showed in the summary line but not in the expanded fields | **Fixed**: the field shows the count alone; test added |
| R7 | The queen fact showed "—" next to "marcada", and an unknown colour never showed its name | **Fixed**: `QueenMark` only when there is a year or colour; an unknown colour shows as text |
| R8 | The object guard was written a third and fourth time | **Fixed**: `lib/guards.ts` `isRecord`, used by `admin-api`, `auth`, `event-summary` and the timeline |
| R9 | The hive query was inline while `apiaryQuery` was shared | **Fixed**: `hiveQuery(id)` |

Also on this pass, asked by Iván: `docs/api.md` labels `attention_level = none` "Sin novedad", as the panel does.
