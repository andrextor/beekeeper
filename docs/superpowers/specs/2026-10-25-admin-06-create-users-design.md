# A6 · Platform admin creates beekeepers and reviewers — spec

Date: 2026-10-25 · Branch: `feat/admin-create-users` · Status: **awaiting OK** · Version: 0.14.0

## Problem

Until the app ships (M1–M12) nobody can sign up, create a farm or accept an invite. Iván wants to onboard the pilot himself: from the panel, create a beekeeper (account + farm, as owner) or a reviewer (account + membership in an existing farm), with the password set right away, and hand it over privately.

## Decision

**Only platform admins** (`profiles.is_platform_admin`) can do it. The panel stays read-only for everything else; this is the one write it gets. Beekeepers (owners) and reviewers can never create accounts: not from the app, not by calling the function or the SQL directly.

### Why an Edge Function

Creating an Auth user with a password and a confirmed email needs the Auth admin API, which needs the secret key. The secret key can never reach a browser (D1: Supabase refuses it there). An Edge Function runs inside Supabase, where the key is injected by the platform and never leaves it. This is the case CLAUDE.md reserves Edge Functions for: SQL cannot create Auth users.

### Flow

`POST /functions/v1/admin-create-user` with the caller's session.

1. **Who calls.** The function reads the caller's session token, resolves the user with `auth.getUser(token)` and reads `profiles.is_platform_admin`. Anything else → 403 `not_platform_admin`. The check happens in the function, not only at the gateway.
2. **Input** (JSON): `kind` (`beekeeper` | `reviewer`), `email`, `password` (≥ 8, same as Auth), `display_name` (1–80), and `organization_name` (1–120) for a beekeeper or `organization_id` for a reviewer. Invalid → 400 with a machine code.
3. **Account.** `auth.admin.createUser({ email, password, email_confirm: true })`. Existing email → 409 `email_taken`.
4. **Membership.** One SQL call, `public.admin_provision_member(p_user_id, p_display_name, p_role, p_organization_id, p_organization_name)`:
   - sets the profile's `display_name`;
   - `owner`: creates the organization (`created_by` = the new user) and the owner membership; returns its id;
   - `reviewer`: takes `private.lock_organization` first, refuses a missing or soft-deleted organization (`organization_not_found`), inserts the reviewer membership.
   - `security definer`, `search_path = ''`, `execute` revoked from `public`, `anon`, `authenticated` and granted **only to `service_role`**: no client can call it, admin or not.
5. **No half-created accounts.** If step 4 fails, the function deletes the Auth user it just created and returns the error.

The response carries `user_id` and `organization_id`, never the password.

### Panel

- **Usuarios** gets a **Nuevo usuario** button → `/usuarios/nuevo`.
- Form: type (Apicultor / Revisor), name, email, password (show/hide, **Generar** for a random 12-character one), and either the farm name (Apicultor) or the farm, picked with the existing beekeeper search (Revisor).
- Done: a card with the email and the password to copy, "Compártela por un canal privado; no se vuelve a mostrar", and links to the new user and the farm.
- Spanish errors by code (`email_taken`, `organization_not_found`, invalid fields, no connection); never technical text.

## Alternatives rejected

- **Insert into `auth.users` from SQL**: unsupported by Supabase, skips Auth's own hashing and identities; breaks on the next Auth upgrade.
- **A script like `reset-password.sh`**: works, but Iván asked for the panel.
- **Invite codes from the panel**: still needs the app to redeem them, which does not exist yet.

## Security constraints

- The secret key lives only in the Supabase function runtime (platform-injected env), never in the repo, the panel or Vercel.
- The admin check is in the function and the SQL function is unreachable from any client role.
- Passwords travel only in the request body over HTTPS; they are not logged or stored outside Auth.
- An admin account now can create accounts: it stays a flag set by SQL only (D1), and `docs/deploy.md` says so.
- Rules updated: CLAUDE.md, AGENTS.md and `.claude/rules/tenancy.md` say the admin reads everything and writes only through this function.

## Impact on the mobile contract

None. An account made here is identical to one made in the app: same profile, same membership, same RLS. `docs/api.md` documents the function as admin-only.

## Cost

One function call per account created; far below the free 500k invocations a month.

## Out of scope

Editing or deleting users, adding an existing user to another farm, resetting passwords from the panel (a natural next step that would retire `reset-password.sh`), forcing a password change on first sign-in.
