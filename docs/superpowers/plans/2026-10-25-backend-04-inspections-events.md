# B4 · Inspections, events and notes — plan

Spec: `docs/superpowers/specs/2026-10-25-backend-04-inspections-events-design.md` · Branch: `feat/b4-inspections-events` · Status: **awaiting OK**

1. **Inspections** — `<ts>_inspections.sql`: table, named checks (enums, ranges, array subsets with `<@`, varroa coherence), indexes, triggers (`set_updated_at`, `force_author`, `check_parent('hives','hive_id')`, `private.check_inspector_member`), RLS + grants.
2. **Events** — `<ts>_hive_events.sql`: table, `type` check, `details` checks, `private.check_event_inspection` (same hive), indexes, triggers, RLS + grants.
3. **Timeline RPC and open tasks** — `<ts>_hive_timeline.sql`: `hive_timeline()` (`security invoker`, `stable`), view `hive_open_tasks` (`security_invoker`), grants to `authenticated`.
4. **Tests** — `supabase/tests/inspections_events.test.sql`, `hive_timeline.test.sql`.
5. **Seed** — C-01: 3 inspections over 3 weeks (latest with `planned_actions = {feed}`) (one by the reviewer, one `voice` with transcript), a feeding, a treatment, two notes; C-03: a `loss` event.
6. **Docs** — `docs/api.md` Inspections and Events sections (fields, Spanish labels, `details` shapes per type, timeline RPC).
7. **Release** — `chore(release): 0.4.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. `pnpm db:reset && pnpm test:db` → green.
2. SQL editor as `reviewer@landak.test`: `select * from hive_timeline('<C-01 id>');` → inspections and events mixed, newest first.
3. As the reviewer, update the owner's inspection → 0 rows; update their own → 1 row.
4. `select * from hive_open_tasks where 'feed' = any(planned_actions);` → C-01 (seeded with `{feed}`).
5. Insert an inspection with `pests = '{abejorros}'` → error naming the allowed values.
