# D1 · Remote Supabase project, auth settings, first platform admin — spec

Revised 2026-10-25: no email is sent in the pilot (no domain; B2 §Authentication). When Iván has a domain, a separate spec adds Resend SMTP (free 3,000/month) for password recovery and, optionally, email confirmation.

Date: 2026-10-25 · Branch: `chore/d1-supabase-remote` · Status: **approved 2026-10-25** · Version: 0.12.0

## Problem

Everything so far runs on the local stack. The app and the admin need a real backend, free, that sends no email.

## Decisions

### The backend has no server of its own

| Layer | Runs on | Cost |
|-------|---------|------|
| REST API (PostgREST over the schema), RPCs | Supabase | Free plan |
| Auth (email + password, no emails sent) | Supabase Auth | Free plan |
| Database | Supabase Postgres 17, `us-east-1` | Free: 500 MB |
| Photos | Supabase Storage | Free: 1 GB |
| Custom logic (only if ever needed) | Supabase Edge Functions | Free: 500k invocations/month |
| Admin panel (static) | Vercel (D2) | Hobby, free |

Rejected: a Node/Nest/Express server on Render/Railway/Fly. Free tiers there sleep or expire, it duplicates what PostgREST + RLS already do, and it is one more thing to secure and update.

### Free-plan caveats accepted

- A free project **pauses after 7 days without requests**; restoring takes a click in the dashboard. During the pilot, daily use keeps it awake. If it becomes a problem: a scheduled GitHub Action that calls one cheap RPC daily (separate spec).
- No automatic daily backups on the free plan: `.github/workflows/backup.yml` runs `supabase db dump` weekly into an artifact encrypted with `gpg` (90-day retention; the repository is public, so artifacts are not private). Photos are not backed up in V1 (`ponytail:` note; R2 or a Pro plan when it matters).
- Two free projects per account: one `landak-apiario` (production). Local stack is the development environment; no remote staging in V1.

### Steps (each one Iván confirms; they touch his accounts)

1. Create project `landak-apiario` in `us-east-1` (done 2026-10-25, ref `dhacyrwngqegqjffpten`). Virginia rather than São Paulo: from Colombia traffic leaves through Miami, so it is usually the lower latency, and the region cannot change after creation. Strong DB password into Iván's password manager.
2. `pnpm exec supabase link --project-ref <ref>`; `pnpm exec supabase db push` (all migrations; seeds never run remotely).
3. Bucket `hive-photos` comes from the migration; verify it is private.
4. Auth (dashboard → Authentication → Providers → Email): email provider on, **Confirm email off**, minimum password length 8, signups on (same as `supabase/config.toml`); site URL = admin URL from D2; redirect `landak://`.
5. Iván keeps the project's secret key in his password manager for `scripts/reset-password.sh` (the only password recovery in the pilot).
6. Iván creates his account (app or Studio → Authentication → Add user), then in the SQL editor: `update public.profiles set is_platform_admin = true where email = '<his email>';`.
7. GitHub secrets for the backup workflow: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `BACKUP_PASSPHRASE` (also in Iván's password manager: without it a backup cannot be opened).
8. `docs/deploy.md` (Spanish): every step above, how to apply a new migration (`supabase db push` from `main` after a release), how to restore a paused project, where the keys live.

## Security constraints

Service-role key and DB password never leave the Supabase dashboard / password manager / GitHub secrets. The app and the admin get only the URL and the publishable key.

## Out of scope

Custom domain for the API, Pro plan, staging project.
