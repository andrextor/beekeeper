# D1 · Remote Supabase project, SMTP, first platform admin — spec

Date: 2026-10-25 · Branch: `chore/d1-supabase-remote` · Status: **awaiting OK** · Version: 0.12.0

## Problem

Everything so far runs on the local stack. The app and the admin need a real backend, free, with sign-in emails that actually arrive.

## Decisions

### The backend has no server of its own

| Layer | Runs on | Cost |
|-------|---------|------|
| REST API (PostgREST over the schema), RPCs | Supabase | Free plan |
| Auth (email OTP) | Supabase Auth + Resend SMTP | Free plan / Resend free 3,000 emails/month, 100/day |
| Database | Supabase Postgres 17, `sa-east-1` | Free: 500 MB |
| Photos | Supabase Storage | Free: 1 GB |
| Custom logic (only if ever needed) | Supabase Edge Functions | Free: 500k invocations/month |
| Admin panel (static) | Vercel (D2) | Hobby, free |

Rejected: a Node/Nest/Express server on Render/Railway/Fly. Free tiers there sleep or expire, it duplicates what PostgREST + RLS already do, and it is one more thing to secure and update.

### Free-plan caveats accepted

- A free project **pauses after 7 days without requests**; restoring takes a click in the dashboard. During the pilot, daily use keeps it awake. If it becomes a problem: a scheduled GitHub Action that calls one cheap RPC daily (separate spec).
- No automatic daily backups on the free plan: `.github/workflows/backup.yml` runs `supabase db dump` weekly into a private artifact (90-day retention). Photos are not backed up in V1 (`ponytail:` note; R2 or a Pro plan when it matters).
- Two free projects per account: one `landak-apiario` (production). Local stack is the development environment; no remote staging in V1.

### Steps (each one Iván confirms; they touch his accounts)

1. Create project `landak-apiario` in `sa-east-1`, strong DB password into Iván's password manager.
2. `pnpm exec supabase link --project-ref <ref>`; `pnpm exec supabase db push` (all migrations; seeds never run remotely).
3. Bucket `hive-photos` comes from the migration; verify it is private.
4. Auth: email OTP length 6, expiry 600 s, confirmations on, signup on; Spanish OTP template pasted from `supabase/templates/otp.html`; site URL = admin URL from D2; redirect `landak://`.
5. Resend: verify a sending domain (Iván's domain, SPF/DKIM DNS records), create an API key, set it as SMTP in Supabase (host `smtp.resend.com`, port 465, user `resend`), sender `Landak Apiario <no-reply@…>`; raise Auth's email rate limit to 30/hour.
6. Iván signs in once through the admin, then in the SQL editor: `update public.profiles set is_platform_admin = true where email = '<his email>';`.
7. GitHub secrets for the backup workflow: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`.
8. `docs/deploy.md` (Spanish): every step above, how to apply a new migration (`supabase db push` from `main` after a release), how to restore a paused project, where the keys live.

## Security constraints

Service-role key and DB password never leave the Supabase dashboard / password manager / GitHub secrets. The app and the admin get only the URL and the publishable key.

## Out of scope

Custom domain for the API, Pro plan, staging project.
