# B4 · Inspections, events and notes — plan

Spec: `docs/superpowers/specs/2026-10-25-backend-04-inspections-events-design.md` · Branch: `feat/b4-inspections-events` · Status: **approved** (2026-10-26)

1. **Inspections** — `<ts>_inspections.sql`: table, named checks (enums, ranges, array subsets with `<@`, varroa coherence), indexes, shared `private.check_not_future`, triggers (`10_set_timestamps`, `20_force_author`, `30_check_hive`, `40_check_inspector`, `50_check_date`), RLS + grants.
2. **Events** — `<ts>_hive_events.sql`: table, `type` check, `details` checks, `private.check_event_inspection` (same hive, not deleted), indexes, triggers (`10`, `20`, `30_check_hive`, `40_check_inspection`, `50_check_date`), RLS + grants.
3. **Timeline RPC and open tasks** — `<ts>_hive_timeline.sql`: `hive_timeline()` (`security invoker`, `stable`, `(at, id)` cursor), view `hive_open_tasks` (`security_invoker`, non-deleted hives), grants to `authenticated`.
4. **Tests** — `supabase/tests/inspections_events.test.sql`, `hive_timeline.test.sql`.
5. **Seed** — C-01: 3 inspections over 3 weeks (latest with `planned_actions = {feed}`) (one by the reviewer, one `voice` with transcript), a feeding, a treatment, two notes; C-03: a `loss` event.
6. **Docs** — `docs/api.md` Inspections and Events sections (fields, Spanish labels, `details` shapes per type, timeline RPC).
7. **Release** — `chore(release): 0.4.0`, CHANGELOG, ROADMAP. Iván runs `pnpm ci:check`.

## How Iván tests it

1. `pnpm ci:check` → green.
2. SQL editor as `reviewer@landak.test`: `select * from hive_timeline('<C-01 id>');` → inspections and events mixed, newest first.
3. As the reviewer, update the owner's inspection → 0 rows; update their own → 1 row.
4. `select * from hive_open_tasks where 'feed' = any(planned_actions);` → C-01 (seeded with `{feed}`).
5. Insert an inspection with `pests = '{abejorros}'` → `23514` on `inspections_pests_check`.
