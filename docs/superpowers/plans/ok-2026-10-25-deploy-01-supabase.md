# D1 · Remote Supabase — plan

Spec: `docs/superpowers/specs/2026-10-25-deploy-01-supabase-design.md` · Branch: `chore/d1-supabase-remote` · Status: **awaiting OK**

Every task marked 🔑 is done by Iván (or with him, on his screen) because it uses his accounts; the session prepares the commands and checks the result.

1. 🔑 **Create project** — dashboard, `sa-east-1`, name `landak-apiario`.
2. 🔑 **Link and push** — `pnpm exec supabase link --project-ref <ref>`, `pnpm exec supabase db push`; `supabase/.temp` stays gitignored.
3. 🔑 **Auth settings** — confirm email off, password ≥ 8, signups on; secret key saved for `scripts/reset-password.sh`.
4. 🔑 **First admin** — sign in, set the flag by SQL.
5. **Backup workflow** — `.github/workflows/backup.yml` (weekly `supabase db dump --data-only` + schema, uploaded as artifact).
6. **Docs** — `docs/deploy.md` (Spanish), `.env.example` comments with where each value comes from.
7. **Release** — `chore(release): 0.12.0`. Check: `pnpm ci:check`; manual run of the backup workflow green.

## How Iván tests it

1. Dashboard → Table editor shows every table with RLS on (the shield icon).
2. Point the local admin at the remote (`admin/.env.local` with the remote URL + publishable key), sign in with Iván's email + password → Resumen. Run `scripts/reset-password.sh` against the remote for a test account → its new password works.
3. Sign in → Resumen shows zeros (no seed remotely).
4. Actions → Backup → Run → artifact downloadable.
