# B2 · Tenancy: profiles, organizations, members, invites, roles — spec

Date: 2026-10-25 · Branch: `feat/b2-tenancy` · Status: **awaiting OK** · Version: 0.2.0

## Problem

A beekeeper must see only their own data, invite other people as reviewers, and a platform admin must read everything without being able to change anything. All of it has to be enforced by Postgres, because the app talks to PostgREST directly.

## Decisions

### Roles

| Who | How they get it | Read | Write |
|-----|-----------------|------|-------|
| `owner` | Creates an organization, or is invited as owner | Whole organization | Everything in the organization |
| `reviewer` | Invited by an owner | Whole organization | Inspections, events, notes, photos; edits only their own (B4/B5) |
| Platform admin | `profiles.is_platform_admin = true`, set by SQL only | Every organization | Nothing |

A user can be member of several organizations with different roles.

### Tables

```sql
profiles (
  id uuid primary key references auth.users on delete cascade,
  email citext not null,                     -- copied from auth.users by trigger
  display_name text,                         -- 1..80 chars
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

organizations (
  id uuid primary key,                       -- client-generated
  name text not null,                        -- 1..120 chars, trimmed
  created_by uuid not null references profiles,
  created_at, updated_at, deleted_at timestamptz
)

organization_members (
  organization_id uuid references organizations on delete cascade,
  user_id uuid references profiles on delete cascade,
  role text not null check (role in ('owner', 'reviewer')),
  created_at, updated_at,
  primary key (organization_id, user_id)
)

organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  email citext not null,
  role text not null check (role in ('owner', 'reviewer')),
  invited_by uuid not null references profiles,
  created_at timestamptz not null default now(),
  accepted_at timestamptz, accepted_by uuid references profiles,
  revoked_at timestamptz
)
-- one pending invite per email per organization
unique index organization_invites_pending_key on (organization_id, email)
  where accepted_at is null and revoked_at is null
```

Memberships are hard-deleted when removed (they are access, not history). The app reloads the full membership list on every sync (it is small) instead of pulling it by cursor.

### Triggers

- `private.handle_new_user()` after insert on `auth.users`: inserts `profiles (id, email)`.
- `private.sync_profile_email()` after update of `email` on `auth.users`: updates `profiles.email`.
- `private.set_updated_at()` before insert or update on every table with `updated_at` (shared by every later module).

### Helper functions (schema `private`, not exposed by PostgREST)

All `language sql stable security definer set search_path = ''`, `execute` granted to `authenticated` only.

| Function | True when |
|----------|-----------|
| `private.is_member(org uuid)` | caller has any role in `org` |
| `private.has_role(org uuid, role text)` | caller has exactly `role` in `org` |
| `private.is_platform_admin()` | caller's profile has the flag |
| `private.can_read(org uuid)` | `is_member(org) or is_platform_admin()` |
| `private.shares_org(user_id uuid)` | caller and `user_id` share an organization |

`security definer` is needed so the helpers can read `organization_members` without recursing into its own policy.

### RLS policies

| Table | select | insert | update | delete |
|-------|--------|--------|--------|--------|
| `profiles` | own row, `shares_org(id)`, or platform admin | — (trigger) | own row, column `display_name` only (column grant) | — |
| `organizations` | `can_read(id)` | — (RPC) | `has_role(id, 'owner')`, columns `name`, `deleted_at` | — |
| `organization_members` | `can_read(organization_id)` | — (RPC) | — (RPC) | — (RPC) |
| `organization_invites` | `has_role(organization_id, 'owner')` or platform admin | — (RPC) | — (RPC) | — |

`is_platform_admin` cannot be changed through the API: `update` on `profiles` is granted only on `display_name`.

### RPCs (schema `public`, `security definer`, `search_path = ''`)

| RPC | Who | Behaviour | Errors (`detail`) |
|-----|-----|-----------|-------------------|
| `create_organization(p_id uuid, p_name text) returns uuid` | any signed-in user | Inserts the organization and the caller as `owner` in one transaction. Idempotent: same `p_id` already owned by the caller returns it | `invalid_name`, `id_taken` |
| `invite_member(p_organization_id uuid, p_email text, p_role text) returns uuid` | owner | Creates a pending invite, or returns the existing pending one (idempotent) | `not_owner`, `invalid_email`, `invalid_role`, `already_member` |
| `revoke_invite(p_invite_id uuid)` | owner | Sets `revoked_at` | `not_owner`, `invite_not_pending` |
| `accept_my_invites() returns setof uuid` | any signed-in user | For every pending invite whose email equals the caller's **confirmed** email, upserts the membership (keeps the higher role if already a member), sets `accepted_at/by`, returns the organization ids | `email_not_confirmed` |
| `set_member_role(p_organization_id uuid, p_user_id uuid, p_role text)` | owner | Changes a role | `not_owner`, `not_member`, `last_owner` |
| `remove_member(p_organization_id uuid, p_user_id uuid)` | owner, or the member removing themselves | Deletes the membership | `not_allowed`, `last_owner` |
| `my_memberships() returns table (organization_id, organization_name, role)` | any signed-in user | One round trip for the app's organization switcher | — |

Spanish messages, for example: `not_owner` → "Solo el propietario de la organización puede hacer esto.", `last_owner` → "La organización debe tener al menos un propietario.", `email_not_confirmed` → "Confirma tu correo para aceptar invitaciones.".

Why invites need a confirmed email: with confirmations off, anyone could sign up with the invited address and receive the access. Email OTP sign-in confirms the email by design.

### Platform admin

Set by Iván in the SQL editor: `update public.profiles set is_platform_admin = true where email = '…';` (documented in `README.md` and D1). No API path sets it.

## Security constraints

- RLS enabled on all four tables in the migration that creates them; `anon` gets no grants on any of them.
- `organization_members` and `organization_invites` have no insert/update/delete grants for `authenticated`: every change goes through an RPC that checks the role.
- Every RPC starts with `if auth.uid() is null then raise …` (`not_signed_in`).

## Tests (`supabase/tests/`)

- `tenancy.test.sql`: user A creates org A, user B creates org B; A cannot select org B, its members or invites; `create_organization` is idempotent; `set_updated_at` overwrites a client value.
- `roles.test.sql`: reviewer cannot invite, cannot change roles, can remove themselves; last owner cannot be removed or demoted.
- `invites.test.sql`: invite → accept with confirmed email works; unconfirmed email raises `email_not_confirmed`; revoked invite is not accepted; duplicate invite returns the same id; inviting a member raises `already_member`.
- `members_embed.test.sql`: as a reviewer, `select organization_id, role, profiles(email, display_name) from organization_members` (the PostgREST embed the app's members screen uses, through the `user_id → profiles` foreign key) returns the co-members' emails; as a user of another organization it returns nothing.
- `platform_admin.test.sql`: admin reads every org, member and invite; admin cannot update an organization, cannot call `invite_member` on an org they do not own; `update profiles set is_platform_admin` by a user is refused.

## API contract (`docs/api.md` → Auth, Organizations)

Sign-in flow for both clients: `signInWithOtp({ email, options: { shouldCreateUser: true } })` → user types the 6-digit code → `verifyOtp({ email, token, type: 'email' })` → `rpc('accept_my_invites')` → `rpc('my_memberships')`. No memberships → onboarding creates one with `create_organization`.

Removal is not in the pull (memberships are hard-deleted): clients learn it by diffing `my_memberships()` on every sync and purge that organization's local rows. `docs/api.md` states this explicitly.

Members list for the app: `organization_members` with the embed `profiles(email, display_name)` (documented in `docs/api.md`).

Leaving or being removed: once the membership is gone, rows still in that phone's outbox for the organization will be refused by RLS. The server does not keep them; the app blocks "Salir de la organización" until the outbox for it is empty or the user discards it explicitly (mobile M11), and a removed member's pending rows end as "Requiere atención".

## Out of scope

Per-apiary reviewer scoping, a read-only `viewer` role, invitation emails (the owner tells the person), organization hard delete, account deletion flow (later, needed before Play Store).

## Mobile impact

Mobile M2 (auth + onboarding) and M11 (members) build on these RPCs.
