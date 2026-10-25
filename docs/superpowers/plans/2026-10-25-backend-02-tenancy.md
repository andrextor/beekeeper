# B2 · Tenancy — plan

Spec: `docs/superpowers/specs/2026-10-25-backend-02-tenancy-design.md` · Branch: `feat/b2-tenancy` · Status: **awaiting OK**

1. **Base migration** — `supabase/migrations/<ts>_base.sql`: extensions `citext`, schema `private` (usage to `authenticated`), `private.set_updated_at()`.
2. **Tenancy tables** — `<ts>_tenancy.sql`: `profiles`, `organizations`, `organization_members`, `organization_invites` with named check constraints, pending-invite unique index, `updated_at` triggers, `handle_new_user` / `sync_profile_email` triggers on `auth.users`, RLS enabled, grants (column grant on `profiles.display_name`, `organizations.name`/`deleted_at`).
3. **Helpers and policies** — same migration or `<ts>_tenancy_policies.sql`: `private.is_member`, `has_role`, `is_platform_admin`, `can_read`, `shares_org`; the policies from the spec's table.
4. **RPCs** — `<ts>_tenancy_rpcs.sql`: `create_organization`, `invite_member`, `revoke_invite`, `accept_my_invites`, `set_member_role`, `remove_member`, `my_memberships`, with `revoke execute … from public` and `grant … to authenticated`.
5. **Tests** — `supabase/tests/tenancy.test.sql`, `roles.test.sql`, `invites.test.sql`, `members_embed.test.sql`, `platform_admin.test.sql`; `00_helpers.sql` updated now that profiles exist.
6. **Seed** — `supabase/seed.sql`: users `owner@landak.test` (owner of "Finca Landak"), `reviewer@landak.test` (reviewer of it), `other@landak.test` (owner of "Apiario Ajeno"), `admin@landak.test` (platform admin). Sign in locally by requesting a code and reading it in Mailpit.
7. **Docs** — `docs/api.md` sections Auth and Organizations (tables, RPCs, error codes, sign-in sequence), `.claude/rules/tenancy.md` (paths `supabase/**`: the role table, "every policy calls a helper", "no write grant on members/invites").
8. **Release** — `chore(release): 0.2.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. `pnpm db:reset && pnpm test:db` → green.
2. Studio → Authentication: the four seed users exist; Table editor → `profiles` has the admin flag on `admin@landak.test` only.
3. Studio SQL editor, as each user (snippet in `docs/api.md` → *Impersonate in Studio*):
   - `select * from organizations;` as `other@landak.test` → only "Apiario Ajeno".
   - `select invite_member('<finca landak id>', 'nuevo@landak.test', 'reviewer');` as `reviewer@landak.test` → error "Solo el propietario…".
   - same call as `owner@landak.test` → returns an id.
4. `select * from organizations;` as `admin@landak.test` → both organizations; `update organizations set name = 'x';` → 0 rows changed.
