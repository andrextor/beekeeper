# D2 · Admin panel on Vercel — spec

Date: 2026-10-25, revised 2026-10-25 after D1 · Branch: `chore/d2-admin-vercel` · Status: **approved 2026-10-25** · Version: 0.13.0

## Problem

The admin panel must be reachable from any browser, free.

## Decisions

- **Vercel Hobby**, static build of `admin/` (Vite preset, root directory `admin`, build `pnpm build`, output `dist`). Vercel installs from the root `pnpm-lock.yaml` of the workspace; Node 22 as in `.nvmrc`. Iván already uses Vercel (`neoteam-social-run`). No functions, so nothing counts against function limits.
- Rejected: Cloudflare Pages (equally free; Vercel keeps one dashboard for Iván's projects), GitHub Pages (no SPA rewrites without hacks).
- `admin/vercel.json`: SPA rewrite `/(.*) → /index.html`; headers on every path: `Content-Security-Policy` (`default-src 'self'; connect-src 'self' https://dhacyrwngqegqjffpten.supabase.co; img-src 'self' blob: data: https://dhacyrwngqegqjffpten.supabase.co; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Robots-Tag: noindex`. No `wss:` (the panel uses no Realtime); `index.html` has no inline script, so `script-src` stays `'self'` through `default-src`; fonts are self-hosted, and Vite inlines the smallest subsets (under 4 KB) as `data:` URLs, so `font-src` allows `data:`. The project ref is written in the policy: a second backend would need its own entry.
- Env vars in Vercel (Production + Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key, never the secret one: Supabase refuses a secret key from a browser, D1).
- Domain: the default `*.vercel.app` until Iván picks one (e.g. `admin.<domain>`); Supabase Auth site URL updated to it (D1 step 4). No email is sent, so the site URL only matters once a domain and SMTP arrive.
- Previews: every PR gets a preview URL pointing at the same production backend. Acceptable because the admin is read-only; Vercel's default deployment protection keeps previews behind Iván's Vercel login.

## Out of scope

Custom domain purchase, analytics.
