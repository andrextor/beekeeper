# A2 · Admin sign-in and access gate — spec

Date: 2026-10-25 · Branch: `feat/a2-admin-sign-in` · Status: **awaiting OK** · Version: 0.8.0

## Problem

Only platform admins may use the panel. Anyone can sign up with Supabase Auth (the app needs open signup), so signing in is not enough: the panel must check the flag and show nothing to others. RLS already returns nothing to them; the gate is for a clear message, not for security.

## Decisions

### Flow (same Auth as the app, B2)

1. `/ingresar`: email field → "Enviar código" → `signInWithOtp({ email, options: { shouldCreateUser: false } })`. `shouldCreateUser: false`: the admin never creates accounts.
2. Code step: 6 boxes (one `input` with `inputmode="numeric"`, `autocomplete="one-time-code"`, `maxlength=6`), "Reenviar código" enabled after 60 s (matches `max_frequency`), "Cambiar correo".
3. `verifyOtp({ email, token, type: 'email' })` → read own profile (`select is_platform_admin from profiles where id = auth.uid()`).
4. Flag true → `/`. Flag false → `/sin-acceso` ("Esta cuenta no tiene acceso al panel de administración.") with "Cerrar sesión".

### Route guard

`RequireAdmin` wraps every route except `/ingresar` and `/sin-acceso`: no session → `/ingresar?next=<path>`; session without flag → `/sin-acceso`. The profile query is cached by TanStack Query for the session; `onAuthStateChange('SIGNED_OUT')` clears the cache and redirects.

### Errors (Spanish, from Auth error codes, never the raw message)

| Case | Message |
|------|---------|
| Email does not exist (`otp_disabled` / `user_not_found` with `shouldCreateUser: false`) | "No encontramos una cuenta con ese correo." |
| Wrong or expired code | "El código no es válido o ya venció. Pide uno nuevo." |
| Rate limited (429) | "Demasiados intentos. Espera un minuto." |
| Network | "No hay conexión. Revisa tu internet e inténtalo de nuevo." |

### UI

Centered card on `bg`, 400 px max, Arsenal title "Landak Apiario · Administración", `hexagon` mark in `leaf`. Works at 390 px; the code input is 56 px high with 24-px digits.

## Security constraints

Session in `localStorage` (supabase-js default; the panel holds no secret beyond the user's own session). Sign-out calls `signOut({ scope: 'local' })`. The gate never replaces RLS; every query would return empty for a non-admin anyway.

## Out of scope

Google sign-in, admin-managed accounts, 2FA (Auth MFA can be added later).
