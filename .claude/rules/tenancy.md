---
paths:
  - "supabase/**"
---

# Tenancy and roles

| Who | Read | Write |
|-----|------|-------|
| `owner` | whole organization | everything in it |
| `reviewer` | whole organization | inspections, events, notes, photos; edits only rows they created |
| platform admin (`profiles.is_platform_admin`) | every organization | only accounts and memberships: `admin-create-user`, `admin-update-user` and the `admin_*` RPCs (A6, A7); never history |

- Reads: `organization_id in (select private.my_organization_ids()) or (select private.is_platform_admin())`. Writes: `private.is_member(organization_id)` or `private.has_role(organization_id, 'owner')`. A new predicate becomes a helper in `private`, never a copy inside a policy.
- In policies, wrap `auth.uid()` and every argument-free or set-returning helper in `(select …)` so it runs once per query, not once per row.
- Every domain row carries `organization_id`; children denormalize it and a trigger checks it against the parent, so policies never join.
- `organization_members` and `organization_invites` have no insert/update/delete grants: changes go through RPCs. Every RPC that changes memberships (including `accept_invite`) takes `private.lock_organization` **first** and checks the caller's role **after** the lock, so a caller demoted while waiting is refused.
- Admin membership RPCs follow the same lock-then-check order (`private.admin_lock_organization`); admin flag and deactivation changes lock every admin row (`private.lock_platform_admins`) so at least one active admin always remains.
- Membership helpers (`my_organization_ids`, `is_member`, `has_role`) ignore soft-deleted organizations: their members read and write nothing there; only the platform admin reads it (B7).
- Owner actions refuse a soft-deleted organization (`private.require_owner` raises `organization_deleted`); codes of a deleted organization are `invalid_code`.
- Nothing is granted by email: the email is not verified (no mailer). Access comes from creating an organization, from an invite code, or from a platform admin creating the account (A6: `admin_provision_member`, executable by `service_role` only).
- Invite codes are stored only as `sha256` of the normalized code, and **no client can read `code_hash`** (column grants list every other column): a 40-bit code is reversible offline from its hash. Clients select explicit columns from `organization_invites`; `select=*` is refused.
- An unknown, used, revoked, expired or deleted-organization code gives the same `invalid_code`.
- Supabase grants everything to `anon`/`authenticated` by default: each migration starts with `revoke all` on its tables and grants back only what the spec lists.
- Tests start from an empty tenancy (`_helpers.psql` truncates it inside the transaction), so they never depend on `seed.sql`.
