# A2 · Admin sign-in and access gate — spec

Date: 2026-10-25 · Branch: `feat/a2-admin-sign-in` · Status: **awaiting OK** · Version: 0.8.0 · Revised 2026-10-25: email + password (no email is sent, B2 §Authentication); 2026-10-26: local env script, `validation_failed`

## Problem

Only platform admins may use the panel. Anyone can create an account (the app needs open sign-up), so signing in is not enough: the panel must check the flag and show nothing to others. RLS already returns nothing to them; the gate is for a clear message, not for security.

## Decisions

### Flow

1. `/ingresar`: email + password fields (`autocomplete="email"` / `"current-password"`, show/hide password toggle with `eye` / `eye-off`), button "Ingresar" → `signInWithPassword({ email, password })`.
2. No sign-up and no recovery link in the panel: the admin account is created in the app or in Studio, and the flag is set by SQL (B2). Under the form: "¿Olvidaste tu contraseña? Restablécela con `scripts/reset-password.sh`." (only the admin reads this screen).
3. After sign-in, read the own profile (`select is_platform_admin from profiles where id = auth.uid()`).
4. Flag true → `next` or `/`. Flag false → `/sin-acceso` ("Esta cuenta no tiene acceso al panel de administración.") with "Cerrar sesión".

### Route guard

`RequireAdmin` wraps every route except `/ingresar` and `/sin-acceso`: no session → `/ingresar?next=<path>`; session without flag → `/sin-acceso`. The profile query is cached by TanStack Query for the session; `onAuthStateChange('SIGNED_OUT')` clears the cache and redirects.

### Errors (Spanish, from `error_code`, never the raw message — table in `docs/api.md` → Auth)

| Case | Message |
|------|---------|
| `invalid_credentials` | "Correo o contraseña incorrectos." |
| `validation_failed` | "Revisa el correo y la contraseña." |
| `over_request_rate_limit` (429) | "Demasiados intentos. Espera un minuto." |
| Network | "No hay conexión. Revisa tu internet e inténtalo de nuevo." |
| Anything else | "No pudimos ingresar. Inténtalo de nuevo." |

### UI

Centered card on `bg`, 400 px max, Plus Jakarta Sans title "Landak Apiario · Administración", `hexagon` mark in `leaf`. Inputs 48 px high, button full width. Enter submits; the button shows a spinner and is disabled while signing in. Works at 390 px.

### Local configuration

Root script `pnpm admin:env` writes `admin/.env.local` (gitignored) from `supabase status -o env`, keeping only `API_URL` → `VITE_SUPABASE_URL` and `PUBLISHABLE_KEY` → `VITE_SUPABASE_PUBLISHABLE_KEY`. No other key ever reaches the file.

## Security constraints

Session in `localStorage` (supabase-js default; the panel holds no secret beyond the user's own session). Sign-out calls `signOut({ scope: 'local' })`. The gate never replaces RLS. Supabase Auth rate-limits password attempts per IP.

## Out of scope

Google sign-in, admin-managed accounts, MFA (Auth TOTP can be added later), password recovery by email (needs a domain, D1).
