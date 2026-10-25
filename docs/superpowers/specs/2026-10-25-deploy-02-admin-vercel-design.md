# D2 · Admin panel on Vercel — spec

Date: 2026-10-25 · Branch: `chore/d2-admin-vercel` · Status: **awaiting OK** · Version: 0.13.0

## Problem

The admin panel must be reachable from any browser, free.

## Decisions

- **Vercel Hobby**, static build of `admin/` (Vite preset, root directory `admin`, build `pnpm build`, output `dist`). Iván already uses Vercel (`neoteam-social-run`). No functions, so nothing counts against function limits.
- Rejected: Cloudflare Pages (equally free; Vercel keeps one dashboard for Iván's projects), GitHub Pages (no SPA rewrites without hacks).
- `admin/vercel.json`: SPA rewrite `/(.*) → /index.html`; headers: `Content-Security-Policy` (`default-src 'self'; connect-src 'self' https://<ref>.supabase.co wss://<ref>.supabase.co; img-src 'self' blob: data: https://<ref>.supabase.co; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`; `X-Robots-Tag: noindex`.
- Env vars in Vercel (Production + Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Domain: the default `*.vercel.app` until Iván picks one (e.g. `admin.<domain>`); Supabase Auth site URL updated to it (D1 step 4).
- Previews: every PR gets a preview URL pointing at the same production backend. Acceptable because the admin is read-only.

## Out of scope

Custom domain purchase, analytics.
