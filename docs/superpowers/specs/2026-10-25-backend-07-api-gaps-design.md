# B7 · Contract gaps found by the mobile specs — design

Found while aligning `beekeeper-mobile`'s M3 and M11 specs with `docs/api.md`. None of them breaks what is deployed, but two leave the app with failures it cannot recover from or with data nobody should still see.

## 1. `profiles.deactivated_at` missing from the contract

A7 added the column; `docs/api.md` → Organizations → Tables does not list it. The app reads it for the "Desactivado" badge and caches it in `profiles_cache`.

**Decision:** document it. No SQL.

## 2. A tombstone under a deleted parent is refused

`private.check_parent()` runs `before insert or update`. Postgres fires the BEFORE INSERT trigger on every `insert … on conflict do update`, even when the row exists, so the "parent unchanged" shortcut never applies to a PostgREST upsert: every push re-checks the parent. Ordering the outbox (live rows parent-first, soft deletes child-first) covers the app's own changes, but not someone else's: an owner deletes a hive while a reviewer, offline, deletes a photo of it. The reviewer's tombstone fails with `parent_mismatch` forever.

**Decision:** `check_parent` accepts a soft-deleted parent when the incoming row is itself soft-deleted (`new.deleted_at is not null`). The matched column (organization or hive) is still checked, and a missing parent is still refused. Restoring a child (`deleted_at` back to null) under a deleted parent is still refused. A live edit under a deleted parent stays `parent_mismatch`: the app drops it, since the parent is gone for everyone.

**Rejected:** skipping the check on upsert when the row exists (needs a lookup per row and reopens the organization check); doing nothing (the app would need a "discard" path for deletes too, and the user sees an error for something they wanted gone anyway).

## 3. A soft-deleted organization stays readable and writable

`my_memberships()` hides a soft-deleted organization, but `private.my_organization_ids()`, `private.is_member()` and `private.has_role()` do not look at `organizations.deleted_at`. RLS keeps returning its apiaries, hives, inspections, events and photos to its members, and they can still write into it (the `organization_deleted` check only guards the owner RPCs).

**Decision:** the three helpers only count memberships of live organizations. Every read and write policy already goes through them, so no policy changes. Effects:

- Members of a deleted organization no longer read or write anything in it (writes get `42501`). The platform admin still reads everything (`is_platform_admin`), so history is kept and visible.
- The owner's soft delete itself still passes: `has_role` is `stable`, so inside the `update` it sees the organization as it was before the statement.
- Restoring a deleted organization is no longer possible from a client (it never was a feature; done by SQL if ever needed).
- `private.require_owner` checks `organization_deleted` first, for callers who are owners of that deleted organization, so the owner RPCs keep their message instead of turning into `not_owner`.

**Rejected:** documenting it and leaving it to the client (a stale or modified client keeps writing into a farm that no longer exists); a new `is_live_member` helper next to the old ones (two predicates that differ by one join is the copy AGENTS.md forbids).

## Security

Tightening only: no grant is added, every check that existed still runs. The tombstone exception keeps the organization/hive match, so a row can never be attached to another organization's parent.

## Impact on the mobile contract

- `profiles.deactivated_at` listed.
- Sync push: every upsert re-checks the parent; push live rows parent-first, soft deletes child-first; a soft delete under a deleted parent now succeeds; a live edit under a deleted parent is `parent_mismatch` and the app drops it.
- A deleted organization returns nothing to its former members and refuses their writes with `42501`. It leaves `my_memberships()`, so the app handles it like a lost membership (purge; outbox rows end as **Requiere atención**, as `docs/api.md` already says).

Not breaking for the app as specified (M3 already orders the push and filters by `my_memberships()`).

## Out of scope

- `private.co_member_ids()` still counts co-members of a deleted organization for `profiles` reads (names only, people who already shared the farm).
- Hard-deleting a deleted organization's data.
