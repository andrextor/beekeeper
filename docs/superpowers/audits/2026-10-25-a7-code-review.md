# A7 code review — managing accounts, my account

Date: 2026-10-25 · Branch: `feat/a7-manage-users` · Reviewer: `/code-review` (background) · All fixed in `fix: A7 code review findings`.

| # | Where | Finding | Status |
|---|-------|---------|--------|
| R1 | `UserPage.tsx`, `admin-update-user` | On your own user page, Contraseña and Correo skipped Mi cuenta's current-password check (an open session could change them). | Fixed: hidden on your own page with a pointer to Mi cuenta; the function refuses `set_email` / `set_password` on yourself (`use_my_account`) |
| R2 | SQL helpers, `_shared/admin.ts` | A deactivated admin (token valid up to 1 h) kept full admin writes. | Fixed: `private.is_platform_admin`, new `private.is_active_admin` (also in `admin_provision_member`) and the functions' caller check require `deactivated_at is null` |
| R3 | `admin-update-user` | Reactivate lifted the ban before clearing SQL, with no revert. | Fixed: SQL first, then the ban follows SQL; revert on failure |
| R4 | same | Concurrent deactivate/reactivate could leave Auth and SQL disagreeing. | Fixed: `syncBan` sets the ban from SQL's value at that moment, so racing requests converge on SQL (small read-then-ban window noted) |
| R5 | same | A failed ban's revert cleared `deactivated_at` even when the user was already deactivated. | Fixed: revert only when this request changed the state |
| R6 | migration | `lock_platform_admins` as a SQL function could lock only the first admin row. | Fixed: plpgsql `perform … for update` walks every row |
| R7 | migration | Deactivated owners counted as owners; deactivating the only owner was allowed. | Fixed: `owner_count` counts active owners; deactivation refuses the last active owner of a live farm (`last_owner`), locking those farms first |
| R8 | `ConfirmDialog.tsx` | Esc closed the dialog while the change ran, hiding its result. | Fixed: Esc is ignored while pending |
| R9 | `AccountPage.tsx`, `UserPage.tsx`, `NewUserPage.tsx` | Three copies of the cache invalidation, with different keys. | Fixed: `useRefreshAccounts` in `lib/manage-user.ts` |
| R10 | `manage-user.ts`, `create-user.ts` | `isRole` copied; validation built undefined keys then deleted them with a cast. | Fixed: `isRole` exported from `admin-api.ts`; errors added only when present |
