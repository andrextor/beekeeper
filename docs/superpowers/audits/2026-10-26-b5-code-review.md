# B5 code review — photos and storage

Date: 2026-10-26 · Branch: `feat/b5-photos` · Scope: `git diff main...HEAD` (2 migrations, tests, `docs/api.md`).

| # | Finding | Verdict | Proposed fix |
|---|---------|---------|--------------|
| F1 | `*_40_fixed_hive` fires after `30_check_hive`, so moving to a deleted or foreign hive reports `parent_mismatch` instead of `immutable_column` | Valid (breaks the trigger-order rule) | Rename to `*_25_fixed_hive` on inspections and photos |
| F2 | An uploader can overwrite their own file at any time, even after the `photos` row exists | Valid (history rewritten silently) | Update policy also requires that no `photos` row (live or deleted) points at the file yet; retries happen before the row is written |
| F3 | Soft-deleting a hive does not soft-delete its photos | Rejected: a hive's history (inspections, events, photos) is kept when the hive is deleted, consistently since B4; clients hide children of deleted hives | Document it in `docs/api.md` |
| F4 | The contract does not say which photo failures are permanent, so a queued upload into a deleted hive could retry forever | Valid | `docs/api.md`: Storage `403` and `parent_mismatch` are permanent → "Requiere atención", no retry |
| F5 | Code dropped the plan's unique index and `private.path_hive` without updating the plan | Valid (process) | Add `path_hive` (see F6); plan states the unique index is the primary key's (the path contains the id) |
| F6 | `can_upload_photo` repeats the uuid regex and parsing of `path_org` | Valid | One `private.as_uuid(text)` (regex once, null instead of cast error); `path_org`, `path_hive` and `can_upload_photo` use it |
| F7 | `can_upload_photo` is `security definer` without needing it | Valid | `security invoker`: members already read their hives; `is_member` stays definer |
| F8 | `photos_hive_idx` has no reader | Rejected: the documented read is photos per hive (`hive_id=eq.…&order=taken_at.desc`) for the hive screen (A5, M9) | None |
