---
paths:
  - "supabase/**"
---

# Tenancy and roles

| Who | Read | Write |
|-----|------|-------|
| `owner` | whole organization | everything in it |
| `reviewer` | whole organization | inspections, events, notes, photos; edits only rows they created |
| platform admin (`profiles.is_platform_admin`) | every organization | nothing |

- Every policy calls `private.can_read(org)`, `private.is_member(org)` or `private.has_role(org, role)`. A new predicate becomes a helper in `private`, never a copy inside a policy.
- Every domain row carries `organization_id`; children denormalize it and a trigger checks it against the parent, so policies never join.
- `organization_members` and `organization_invites` have no insert/update/delete grants: changes go through RPCs that check the role and lock the organization row (`private.lock_organization`) before counting owners.
- Nothing is granted by email: the email is not verified (no mailer). Access comes from creating an organization or from an invite code.
- Invite codes are stored only as `sha256` of the normalized code; an unknown, used, revoked or expired code gives the same `invalid_code`.
- Supabase grants everything to `anon`/`authenticated` by default: each migration starts with `revoke all` on its tables and grants back only what the spec lists.
- Tests start from an empty tenancy (`_helpers.psql` truncates it inside the transaction), so they never depend on `seed.sql`.
