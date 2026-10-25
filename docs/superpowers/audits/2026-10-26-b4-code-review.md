# B4 code review — inspections, events, timeline

Date: 2026-10-26 · Branch: `feat/b4-inspections-events` · Scope: `git diff main...HEAD` (3 migrations, seed, tests, `docs/api.md`).

| # | Finding | Verdict | Proposed fix |
|---|---------|---------|--------------|
| F1 | Moving an inspection to another hive leaves its linked events on the old hive (same-hive rule only checked from the event side) | Valid | `inspections.hive_id` is immutable (`immutable_column`); a wrong hive is fixed by deleting and re-recording |
| F2 | Soft-deleting an inspection leaves live events pointing at it; restoring such an event then fails | Valid | Soft-deleting an inspection soft-deletes its linked events in the same statement (they were recorded during it) |
| F3 | `p_before` without `p_before_id` repeats the previous page's last item | Valid | Missing `p_before_id` defaults to the nil uuid ("strictly before `p_before`") |
| F4 | `hive_open_tasks` tie on `inspected_at` + `created_at` picks an arbitrary row | Valid | Add `id desc` to the order |
| F5 | `hive_open_tasks` sorts the whole history per query | Partly valid: fine at pilot volume | Index `(hive_id, inspected_at desc, created_at desc, id desc)`; `ponytail:` note naming the upgrade (latest-inspection pointer on `hives`) |
| F6 | Timeline indexes lack `id`, so the `(at, id)` cursor needs a sort | Valid | Indexes `(hive_id, inspected_at desc, id desc)` / `(hive_id, occurred_at desc, id desc)` |
| F7 | `check_event_inspection` is a second copy of `check_parent` | Valid (AGENTS.md "second copy is the extraction") | `check_parent(table, fk, match_column default 'organization_id')`; also re-checks when the matched column changes |
| F8 | `check_hive_dates` and `check_not_future` duplicate one rule with two messages for `future_date` | Valid | New migration switches `hives_40_check_dates` to `check_not_future('colony_started_on')` and drops `check_hive_dates`; one message |
| F9 | A reviewer can set `inspected_by` to the owner | Product decision: by design (one member records for another); `created_by` always shows the real writer | No change unless Iván prefers `inspected_by = auth.uid()` for reviewers |
| F10 | Array checks accept duplicates and `{}` | Rejected: `{}` means "nothing to do", distinct from `null`; duplicates are harmless and the app sends sets | None |

Rules learned (to add to `.claude/rules/sql.md`): a link checked from the child must also be protected from the parent side (immutable key or cascade); keyset cursors default the tiebreaker so a partial cursor is still strict; ordered indexes carry the tiebreaker column.
