# A2 · Admin sign-in — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-02-sign-in-design.md` · Branch: `feat/a2-admin-sign-in` · Status: **awaiting OK**

1. **Auth helpers** — `admin/src/lib/auth.ts` (`requestCode`, `verifyCode`, `signOut`, `authErrorMessage(error)` mapping) + `auth.test.ts` for the mapping.
2. **Session and profile** — `admin/src/features/auth/useSession.ts`, `useProfile.ts` (TanStack Query), `RequireAdmin.tsx`.
3. **Screens** — `features/auth/SignInPage.tsx` (email step + code step), `features/auth/NoAccessPage.tsx`; routes wired.
4. **Shell** — signed-in email and "Cerrar sesión" in the sidebar.
5. **Release** — `chore(release): 0.8.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. `pnpm db:reset && pnpm --filter admin dev`.
2. `/ingresar` with `admin@landak.test` → code arrives in Mailpit (http://localhost:54324) → enter it → dashboard placeholder.
3. Sign out → back to `/ingresar`. Sign in as `owner@landak.test` → "Esta cuenta no tiene acceso…".
4. `nadie@landak.test` → "No encontramos una cuenta con ese correo.".
5. Wrong code → error message; at 390 px the code field is comfortable to type.
