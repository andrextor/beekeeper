# B3 apiaries and hives — code review

Date: 2026-10-26 · Scope: `feat/b3-apiaries-hives` before merge · Fixed in the same branch (v0.3.0) · Every finding re-checked against the code.

| # | Severity | Finding | Resolution | Proof |
|---|----------|---------|------------|-------|
| 1 | Medium | `check_parent` skipped updates that kept the parent, so restoring a hive put it back under a deleted apiary | The parent is re-checked when a row is restored | `apiaries_hives.test.sql`: restore into deleted apiary → `parent_mismatch` |
| 2 | Medium | Check-then-act race between deleting an apiary and inserting/moving a hive into it | `check_parent` reads the parent `for share`; the apiary update already holds its row lock | Two concurrent psql sessions, both orders: delete-while-inserting → `apiary_not_empty`; insert-while-deleting → `parent_mismatch`; no orphan in either |
| 3 | Low | The global QR index lets an owner learn that a code exists in another organization | Kept (the overview wants globally unique labels; the code is printed on the physical label and no data leaks); `docs/api.md` corrected | Docs |
| 4 | Medium | A deleted hive kept its QR code forever, so its label could not be reused | Partial unique index `where deleted_at is null` | Test: a deleted hive's code is reused by a new colony |
| 5 | Low | `apiaries_30_check_empty` used the parent-check slot | Renamed `apiaries_40_check_empty` | Migration |
| 6 | Low | No tests for restore or move into a deleted apiary | Added | 26 tests in the file |
| 7 | Low | Dead `organization_id` comparison in `check_parent` (force_author already refuses org changes) | Removed | Migration |
| 8 | Info | `to_jsonb` + dynamic SQL per row | Kept with a `ponytail:` note (per-table functions if pushes get heavy) | — |
| 9 | Product | Hive names unique per organization; beekeepers number per site | Unique per apiary (`hives_apiary_name_key`) | Test: same name in two apiaries ok, twice in one apiary → 23505 |

Rules added to `.claude/rules/sql.md`: re-check parents on restore and read them `for share`; partial unique indexes for anything a deleted row should give back.
