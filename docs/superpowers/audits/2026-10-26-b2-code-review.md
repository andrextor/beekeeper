# B2 tenancy — code review

Date: 2026-10-26 · Scope: merge of PR #2 (`feat/b2-tenancy`, v0.2.0) · Fixed in: `fix/b2-review` (v0.2.1) · Reviewer: `/code-review`, every finding re-checked against the code before fixing.

| # | Severity | Finding | Resolution | Proof |
|---|----------|---------|------------|-------|
| F1 | High | `grant select` on `organization_invites` exposed `code_hash`; a sha256 of a 40-bit code is reversible offline, so a platform admin (or another owner) could recover a pending owner code and take over an organization | Column grants on every column except `code_hash`; clients must list columns (`select=*` refused) | `invites.test.sql`: `code_hash` → 42501, other columns readable; API check: `select=*` and `select=code_hash` → 42501 |
| F2 | High | `revoke_invite` read the pending state without a lock and updated without re-checking it; a revoke racing an accept reported success on an accepted invite | `select … for update` filtered on pending, so the state is re-read after the lock | `invites.test.sql`: revoking an accepted invite → `invite_not_pending` |
| F3 | Medium | `set_member_role` / `remove_member` authorized before taking the organization lock; a caller demoted while waiting could still act | `lock_organization` first, `require_owner` / the self-check after | Reviewed; concurrency not reproducible in pgTAP (single session) |
| F4 | Medium | Codes of a soft-deleted organization still worked; owner actions still ran on it | `require_owner` raises `organization_deleted`; `accept_invite` joins on `deleted_at is null` | `invites.test.sql`: create on deleted org → `organization_deleted`; its code → `invalid_code` |
| F5 | Medium | `create_organization` used exists-then-insert, so parallel retries got a raw `23505`; a null id gave a raw `23502` | `insert … on conflict (id) do nothing` + `found`; `invalid_id` for null | `tenancy.test.sql`: null id → `invalid_id`; idempotency test still green |
| F6 | Low | `accept_invite` changed memberships without the organization lock (rule in `.claude/rules/tenancy.md`) | Takes `lock_organization` after finding the invite | Reviewed |
| F7 | Low (perf) | Policies called helpers per row | Set-returning `my_organization_ids()` / `co_member_ids()` inside `(select …)`; `can_read` / `shares_org` dropped | All tenancy/role/admin tests green |
| F8 | Low | RPC-only helpers had `execute` granted to `authenticated` | Grants revoked | `tenancy.test.sql`: `private.lock_organization()` as a client → 42501 |
| F9 | Low | `reset-password.sh` failed silently on HTTP/network errors | `curl -sS --fail-with-body`, errors printed in Spanish with the response | Manual: wrong key → "La API de Auth respondió con error … bad_jwt"; wrong URL → connection error shown |
| F10 | Low | A non-list JSON response was reported as "user does not exist" | Response shape checked; unexpected bodies printed | Manual |

Lessons turned into rules: `.claude/rules/sql.md` (secrets never get a select grant, lock before check, idempotent creates with `on conflict`, soft-deleted parents, grants only for policy/invoker helpers), `.claude/rules/tenancy.md` (read pattern, lock order, deleted organizations, explicit invite columns), `.claude/rules/scripts.md`.
