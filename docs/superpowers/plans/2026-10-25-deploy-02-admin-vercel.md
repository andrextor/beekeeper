# D2 · Admin on Vercel — plan

Spec: `docs/superpowers/specs/2026-10-25-deploy-02-admin-vercel-design.md` · Branch: `chore/d2-admin-vercel` · Status: **awaiting OK**

1. **Config** — `admin/vercel.json` (rewrite + headers from the spec).
2. 🔑 **Vercel project** — Iván imports `andrextor/beekeeper`, root directory `admin`, framework Vite, the two env vars (Production + Preview), deploy. Only from `main` after this branch is merged.
3. 🔑 **Auth URL** — Supabase → Authentication → URL Configuration: site URL = the Vercel URL.
4. **Docs** — `docs/deploy.md`: admin section (Vercel project, env vars, previews, where the URL lives) and the CSP line to edit if the Supabase project ever changes.
5. **Release** — `chore(release): 0.13.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. Open the Vercel URL → `/ingresar`; reload on `/apicultores` → no 404.
2. Sign in with email and password → Resumen with 1 user.
3. DevTools → Console: no CSP errors; Network: only `dhacyrwngqegqjffpten.supabase.co` and the site itself.
4. `pnpm ci:check` before merging.
