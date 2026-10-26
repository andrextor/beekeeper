# A6 · Admin creates users — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-06-create-users-design.md` · Branch: `feat/admin-create-users` · Status: **awaiting OK**

1. **SQL** — migration `<ts>_admin_provision_member.sql`: `public.admin_provision_member` (owner / reviewer, lock, soft-deleted check), grants to `service_role` only. Test `supabase/tests/admin_provision.test.sql`: `authenticated` (admin or not) cannot execute it; owner path creates organization + owner membership + display name; reviewer path adds the membership; deleted or unknown organization → `organization_not_found`; duplicate membership refused.
2. **Edge Function** — `supabase/functions/admin-create-user/index.ts` (Deno, `@supabase/supabase-js` by `npm:` import, pinned): CORS preflight, admin check, validation, create user, provision, rollback on failure. `supabase/config.toml` `[functions.admin-create-user]`.
3. **Panel** — `admin/src/lib/admin-api.ts` `createUser` (via `supabase.functions.invoke`) + error codes → Spanish; `admin/src/features/users/NewUserPage.tsx`; route `/usuarios/nuevo`; **Nuevo usuario** button on Usuarios. Vitest for the input validation and the error mapping.
4. **Docs** — `docs/api.md` (function, codes), `docs/deploy.md` (deploy the function), CLAUDE.md, AGENTS.md, `.claude/rules/tenancy.md` (admin writes only through it), ROADMAP row A6.
5. **Release** — `chore(release): 0.14.0`.

## How Iván tests it

1. Local: `pnpm db:migrate && pnpm check:quick`, then `pnpm ci:check` before merging.
2. Local panel (stack running, which serves the function): create an Apicultor → sign in with it in a private window → it is not admin (blocked screen). Create a Revisor in Finca Landak → it shows in Apicultores → Finca Landak → Personas as Revisor.
3. Same email again → "Ya existe una cuenta con ese correo."
4. Remote, after merge: `pnpm exec supabase db push --linked` and `pnpm exec supabase functions deploy admin-create-user` (Iván, his terminal), then repeat 2 on https://beekeeper-one.vercel.app.
