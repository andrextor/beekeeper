# B2 · Tenancy: profiles, organizations, members, invites, roles — spec

Date: 2026-10-25 · Branch: `feat/b2-tenancy` · Status: **approved** (revised 2026-10-25: password auth + invite codes) · Version: 0.2.0

## Problem

A beekeeper must see only their own data, invite other people as reviewers, and a platform admin must read everything without being able to change anything. All of it has to be enforced by Postgres, because the app talks to PostgREST directly.

## Decisions

### Authentication: email + password, no emails sent (revised 2026-10-25)

Iván has no domain to send email from. Supabase's built-in mailer only delivers to members of the Supabase team, and Resend needs a verified domain, so no code or confirmation email can reach a beekeeper. Therefore:

- **Sign-up and sign-in with email + password** (`signUp`, `signInWithPassword`), minimum 8 characters. Email confirmation is **off** (`enable_confirmations = false`): the email is an identifier, not proven ownership.
- Because the email is not proven, **nothing is granted by email**. Invitations are **codes** the owner shares (WhatsApp); whoever holds the code joins.
- **Forgotten password:** no self-service recovery in the pilot. Iván resets it with `scripts/reset-password.sh <email>` (Auth admin API, secret key only on his machine). Email recovery comes back when a domain + Resend exist (D1); Google sign-in is the later alternative.
- Rejected: email one-time codes (the first design) — they need a mailer. Rejected: invites by email with confirmations off — anyone could sign up with the invited address first and take the access.

### Roles

| Who | How they get it | Read | Write |
|-----|-----------------|------|-------|
| `owner` | Creates an organization, or joins with an owner invite code | Whole organization | Everything in the organization |
| `reviewer` | Joins with an invite code from an owner | Whole organization | Inspections, events, notes, photos; edits only their own (B4/B5) |
| Platform admin | `profiles.is_platform_admin = true`, set by SQL only | Every organization | Nothing |

A user can be member of several organizations with different roles.

### Tables

```sql
profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,                       -- copied from auth.users by trigger, lowercase
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
  code_hash text not null unique,            -- sha256 of the normalized code; the code itself is never stored
  label text,                                -- optional "Para Juan", ≤ 80
  role text not null check (role in ('owner', 'reviewer')),
  invited_by uuid not null references profiles,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,           -- created_at + 7 days
  accepted_at timestamptz, accepted_by uuid references profiles,
  revoked_at timestamptz
)
```

**Invite codes:** 8 characters of Crockford base32 (`0-9 A-Z` without `I L O U`), shown as `XXXX-XXXX`, made from `gen_random_bytes` (≈ 10^12 combinations, so guessing through the API is not practical). Single use, 7 days. Input is normalized before hashing: uppercase, spaces and dashes removed, `O→0`, `I/L→1`.

Emails are stored as lowercase `text` with a `check`, not `citext`: inside `search_path = ''` functions `citext`'s operators (schema `extensions`) are not visible and comparisons would silently fall back to case-sensitive `text`.

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
| `create_invite(p_organization_id uuid, p_role text, p_label text default null) returns table (invite_id uuid, code text, expires_at timestamptz)` | owner | Creates a single-use code valid 7 days. The plain code is returned **only here** | `not_owner`, `invalid_role`, `invalid_label` |
| `revoke_invite(p_invite_id uuid)` | owner | Sets `revoked_at` | `not_owner`, `invite_not_pending` |
| `accept_invite(p_code text) returns uuid` | any signed-in user | Normalizes and hashes the code, locks the pending, unexpired invite, upserts the membership (keeps the higher role if already a member), sets `accepted_at/by`, returns the organization id | `invalid_code` |
| `set_member_role(p_organization_id uuid, p_user_id uuid, p_role text)` | owner | Changes a role | `not_owner`, `not_member`, `last_owner` |
| `remove_member(p_organization_id uuid, p_user_id uuid)` | owner, or the member removing themselves | Deletes the membership | `not_allowed`, `last_owner` |
| `my_memberships() returns table (organization_id, organization_name, role)` | any signed-in user | One round trip for the app's organization switcher | — |

Spanish messages, for example: `not_owner` → "Solo el propietario de la organización puede hacer esto.", `last_owner` → "La organización debe tener al menos un propietario.", `invalid_code` → "El código no es válido, ya se usó o venció. Pide uno nuevo al propietario.". An unknown, used, revoked or expired code all give the same answer, so a guess learns nothing.

### Platform admin

Set by Iván in the SQL editor: `update public.profiles set is_platform_admin = true where email = '…';` (documented in `README.md` and D1). No API path sets it.

## Security constraints

- RLS enabled on all four tables in the migration that creates them; `anon` gets no grants on any of them.
- `organization_members` and `organization_invites` have no insert/update/delete grants for `authenticated`: every change goes through an RPC that checks the role.
- Every RPC starts with `if auth.uid() is null then raise …` (`not_signed_in`).

## Tests (`supabase/tests/`)

- `tenancy.test.sql`: user A creates org A, user B creates org B; A cannot select org B, its members or invites; `create_organization` is idempotent; `set_updated_at` overwrites a client value.
- `roles.test.sql`: reviewer cannot invite, cannot change roles, can remove themselves; last owner cannot be removed or demoted.
- `invites.test.sql`: create → accept works and gives the invite's role; the code is accepted in lowercase and with spaces/dashes; a used, revoked, expired or made-up code raises `invalid_code`; the plain code is not stored; a reviewer cannot create invites; accepting as an existing owner keeps `owner`; an owner code gives `owner`.
- `members_embed.test.sql`: as a reviewer, `select organization_id, role, profiles(email, display_name) from organization_members` (the PostgREST embed the app's members screen uses, through the `user_id → profiles` foreign key) returns the co-members' emails; as a user of another organization it returns nothing.
- `platform_admin.test.sql`: admin reads every org, member and invite; admin cannot update an organization, cannot call `create_invite` on an org they do not own; `update profiles set is_platform_admin` by a user is refused.

## API contract (`docs/api.md` → Auth, Organizations)

Sign-up: `signUp({ email, password })` (session returned at once, no confirmation). Sign-in: `signInWithPassword({ email, password })`. Then `rpc('my_memberships')`. No memberships → onboarding offers **Crear mi apiario** (`create_organization`) or **Tengo un código** (`accept_invite`).

Removal is not in the pull (memberships are hard-deleted): clients learn it by diffing `my_memberships()` on every sync and purge that organization's local rows. `docs/api.md` states this explicitly.

Members list for the app: `organization_members` with the embed `profiles(email, display_name)` (documented in `docs/api.md`).

Leaving or being removed: once the membership is gone, rows still in that phone's outbox for the organization will be refused by RLS. The server does not keep them; the app blocks "Salir de la organización" until the outbox for it is empty or the user discards it explicitly (mobile M11), and a removed member's pending rows end as "Requiere atención".

## Out of scope

Per-apiary reviewer scoping, a read-only `viewer` role, email delivery of any kind (needs a domain: D1), self-service password recovery, organization hard delete, account deletion flow (later, needed before Play Store).

## Mobile impact

Mobile M2 (auth + onboarding) and M11 (members) build on these RPCs.
