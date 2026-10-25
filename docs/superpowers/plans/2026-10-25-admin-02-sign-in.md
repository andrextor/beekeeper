# A2 · Admin sign-in — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-02-sign-in-design.md` · Branch: `feat/a2-admin-sign-in` · Status: **awaiting OK**

1. **Auth helpers** — `admin/src/lib/auth.ts` (`signIn(email, password)`, `signOut`, `authErrorMessage(error)` mapping by `error_code`) + `auth.test.ts` for the mapping.
2. **Session and profile** — `admin/src/features/auth/useSession.ts`, `useProfile.ts` (TanStack Query), `RequireAdmin.tsx`.
3. **Screens** — `features/auth/SignInPage.tsx` (email + password, show/hide), `features/auth/NoAccessPage.tsx`; routes wired.
4. **Shell** — signed-in email and "Cerrar sesión" in the sidebar.
5. **Release** — `chore(release): 0.8.0`. Check: `pnpm ci:check`; browser pass at 390 px and 1440 px.

## How Iván tests it

1. `pnpm db:reset && pnpm --filter admin dev`.
2. `/ingresar` with `admin@landak.test` / `landak-2026` → dashboard placeholder.
3. Sign out → back to `/ingresar`. Sign in as `owner@landak.test` / `landak-2026` → "Esta cuenta no tiene acceso…".
4. Wrong password → "Correo o contraseña incorrectos.".
5. Open `/apicultores` signed out → `/ingresar?next=/apicultores` → after sign-in lands on `/apicultores`.
6. At 390 px (DevTools device mode) the form fits without horizontal scroll and the keyboard does not hide the button.
