# A6 code review — admin-created accounts and print reports

Date: 2026-10-25 · Branch: `feat/admin-create-users` · Reviewer: `/code-review` (background) · All fixed in `fix: A6 code review findings`.

| # | Where | Finding | Status |
|---|-------|---------|--------|
| R1 | `supabase/functions/admin-create-user/index.ts` | The rollback ignored `deleteUser`'s `{ error }`: a failed delete left an orphan account (no farm, email taken forever) silently. | Fixed: the failure is logged with the user id, to delete in Authentication → Users |
| R2 | same | Auth errors other than `email_exists` (invalid email, weak or too-long password) became `500`, so retrying never helped. | Fixed: `email_address_invalid` / `validation_failed` → `400 invalid_email`, `weak_password` → `400 invalid_password` |
| R3 | `20261029090000_admin_provision_member.sql` | Reviewer path checked the admin before `lock_organization`, against the tenancy rule (lock first, check after). | Fixed: locks first, then reads the actor `for share` |
| R4 | function | RPC errors `not_platform_admin` (and others) became `500` instead of the documented `403`. | Fixed: `not_platform_admin` → 403, `organization_not_found` → 404, the rest 500 |
| R5 | `NewUserPage.tsx` | The farm picker fetched 10 then dropped deleted farms, so live farms could be missing. | Fixed: `searchLiveOrganizations` filters `deleted_at is null` in the query |
| R6 | `NewUserPage.tsx` | "Ver apicultor" also shown for a reviewer, leading to someone else's farm. | Fixed: "Ver finca" for a reviewer |
| R7 | `NewUserPage.tsx` | Clipboard failure unhandled (admin believes the one-time password was copied); timer not cleared on unmount. | Fixed: failure message, timer cleared by effect |
| R8 | `create-user.ts` and function | Password limit counted characters, Auth counts 72 bytes. | Fixed: UTF-8 byte length on both sides, with a test |
| R9 | function | The farm pre-check outside the lock duplicated the RPC's check and could not prevent the race. | Fixed: removed; the RPC checks under the lock and the rollback covers it |
