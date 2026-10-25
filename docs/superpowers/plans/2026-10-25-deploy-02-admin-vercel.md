# D2 · Admin on Vercel — plan

Spec: `docs/superpowers/specs/2026-10-25-deploy-02-admin-vercel-design.md` · Branch: `chore/d2-admin-vercel` · Status: **awaiting OK**

1. **Config** — `admin/vercel.json` (rewrite + headers from the spec).
2. 🔑 **Vercel project** — import `andrextor/beekeeper`, root `admin`, env vars, deploy.
3. 🔑 **Auth URL** — Supabase site URL = the Vercel URL.
4. **Docs** — `docs/deploy.md` admin section.
5. **Release** — `chore(release): 0.13.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. Open the Vercel URL → `/ingresar`; reload on `/apicultores` → no 404.
2. Sign in with the code → Resumen.
3. DevTools → Console: no CSP errors; Network: only `*.supabase.co` and the site itself.
