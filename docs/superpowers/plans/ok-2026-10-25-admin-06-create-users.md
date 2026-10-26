# A6 · Admin creates users, print reports — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-06-create-users-design.md` · Branch: `feat/admin-create-users` · Status: **approved 2026-10-25**

Each task is one commit. No new dependency: the function imports the same pinned `@supabase/supabase-js` the panel uses, through Deno's `npm:` specifier.

## 1. SQL — `public.admin_provision_member`

- `supabase/migrations/<ts>_admin_provision_member.sql`: the function exactly as the spec describes; `revoke execute … from public, anon, authenticated; grant execute … to service_role`.
- `supabase/tests/admin_provision.test.sql` (pgTAP):
  1. `authenticated` as a platform admin cannot execute it (`42501`).
  2. `authenticated` as a normal user cannot execute it.
  3. As `service_role`, actor not admin → `not_platform_admin`.
  4. Owner: returns an organization id; the organization has the name and `created_by` = the user; the user is its `owner`; `display_name` set.
  5. Reviewer: the user becomes `reviewer` of the given organization; `display_name` set.
  6. Reviewer into a soft-deleted organization → `organization_not_found`.
  7. Reviewer into an unknown id → `organization_not_found`.
  8. Unknown role → `invalid_role`.
- Check: `pnpm db:migrate && pnpm check:quick`.

## 2. Edge Function — `admin-create-user`

- `supabase/functions/admin-create-user/index.ts`: steps 1–7 of the spec; input type guard; one `respond(status, body)` helper with the CORS headers; rollback with `auth.admin.deleteUser` when the RPC fails.
- `supabase/config.toml`: `[functions.admin-create-user]` with `verify_jwt = false`.
- Check: Biome passes on the file; manual calls in "How Iván tests it".

## 3. Panel — Nuevo usuario

- `admin/src/lib/create-user.ts`: `CreateUserInput` type, `validateCreateUser` (same rules as the function), `generatePassword`, `createUserErrorMessage(code)`, `createUser(input)` with `supabase.functions.invoke` that reads `{ error }` from the response body.
- `admin/src/lib/create-user.test.ts` (Vitest): each validation rule; `generatePassword` length, alphabet and no look-alikes; every error code maps to its Spanish message and an unknown one to the fallback.
- `admin/src/features/users/NewUserPage.tsx`: form, farm picker, done card (copy buttons with `navigator.clipboard`), query invalidation.
- `admin/src/routes.tsx`: `usuarios/nuevo`. `admin/src/features/users/UsersPage.tsx`: the **Nuevo usuario** button.
- Check: `pnpm admin:check`.

## 4. Print reports

- `admin/src/components/ui/PrintButton.tsx`: Lucide `Printer`, secondary button "Imprimir", `print:hidden`; opens the closed `<details>` in `main`, `window.print()`, closes them again.
- `admin/src/components/ui/PrintedAt.tsx`: print-only "Impreso el …" (`hidden print:block`).
- `OrganizationPage.tsx`, `ApiaryPage.tsx`, `HivePage.tsx`: the button next to the title and `PrintedAt`; `TimelineList.tsx`: print-only "Mostrando los N registros cargados." when `hasNextPage`.
- `AppShell.tsx` / `TopBar.tsx` / controls: `print:hidden` and `print:p-0`; `theme.css`: `@media print` block from the spec.
- Check: `pnpm admin:check`; manual: print preview of each page in light and dark mode.

## 5. Docs and rules

- `docs/api.md` → Admin: `admin-create-user` (admin-only, request, answer, codes) and `admin_provision_member` (service role only).
- `docs/deploy.md`: deploying the function; that platform admins can create accounts.
- CLAUDE.md, AGENTS.md, `.claude/rules/tenancy.md`: the admin writes only through this function; access can also come from a platform admin.
- `docs/ROADMAP.md`: A6 plan link renamed to `ok-…` on approval.

## 6. Release — `chore(release): 0.14.0`

CHANGELOG `[0.14.0]` Added (accounts, print); `package.json` version.

## How Iván tests it

1. `pnpm db:migrate && pnpm check:quick`, then `pnpm ci:check` before merging.
2. **Local** (stack running; `supabase start` serves the function; panel with `pnpm --filter admin dev`), signed in as `admin@landak.test`:
   1. Nuevo usuario → Apicultor "Prueba Apicultor", farm "Finca Prueba", **Generar** → Crear usuario → the done card shows email and password. Apicultores lists "Finca Prueba" with that owner.
   2. In a private window, sign in to the panel with that account → "Esta cuenta no tiene acceso al panel de administración." (it is not an admin).
   3. Nuevo usuario → Revisor, farm Finca Landak → Apicultores → Finca Landak → Personas shows them as Revisor.
   4. Same email again → "Ya existe una cuenta con ese correo."
   5. Signed in as `owner@landak.test` (not admin), the panel never shows the page; calling the function with that session answers `not_platform_admin` (the curl is in `docs/deploy.md`).
3. **Print** (local): on a Colmena with history, expand nothing, press **Imprimir** → the preview shows every inspection expanded, no sidebar or buttons, white page; "Guardar como PDF" downloads it. Same on Apiario and Apicultor, and once with the dark theme on (the PDF stays light).
4. **Remote**, after merging: in your terminal `pnpm exec supabase db push --linked` and `pnpm exec supabase functions deploy admin-create-user`, then repeat 2.1–2.4 on https://beekeeper-one.vercel.app.
