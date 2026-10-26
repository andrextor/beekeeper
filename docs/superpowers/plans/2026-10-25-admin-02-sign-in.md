# A2 · Admin sign-in — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-02-sign-in-design.md` · Branch: `feat/a2-admin-sign-in` · Status: **awaiting OK** (revised 2026-10-26)

No new dependencies.

0. **Rule** — `CLAUDE.md` + `AGENTS.md` in both repos: the session never starts dev servers or long-running processes; Iván starts them.
1. **Local env** — root script `admin:env` (`supabase status -o env` → `admin/.env.local` with the URL and the publishable key only).
2. **Auth helpers** — `admin/src/lib/auth.ts` (`authErrorMessage(error)` by `error_code`, network errors detected) + `auth.test.ts`.
3. **Session and profile** — `admin/src/features/auth/useSession.ts` (`getSession` + `onAuthStateChange`, clears the query cache on sign-out), `useIsPlatformAdmin.ts` (TanStack Query, own profile), `RequireAdmin.tsx` (redirects with `next`).
4. **Screens** — `features/auth/SignInPage.tsx` (email + password, show/hide, spinner, Spanish errors), `features/auth/NoAccessPage.tsx`; routes `/ingresar`, `/sin-acceso`, the shell wrapped in `RequireAdmin`; `next` accepted only as an internal path.
5. **Shell** — signed-in email and "Cerrar sesión" at the bottom of the sidebar.
6. **Release** — `chore(release): 0.8.0`, CHANGELOG, ROADMAP.

Visual pass at 390 px and 1440 px in Chrome on the dev server **Iván starts**.

## How Iván tests it

1. `pnpm admin:env && pnpm ci:check` → green.
2. `pnpm --filter admin dev` → http://localhost:5173/ingresar with `admin@landak.test` / `landak-2026` → Resumen.
3. Cerrar sesión → back to `/ingresar`. Sign in as `owner@landak.test` / `landak-2026` → "Esta cuenta no tiene acceso al panel de administración.".
4. Wrong password → "Correo o contraseña incorrectos.".
5. Open `/apicultores` signed out → `/ingresar?next=/apicultores` → after sign-in lands on `/apicultores`. `/ingresar?next=https://example.com` lands on `/`.
6. At 390 px (DevTools device mode) the form fits without horizontal scroll.
