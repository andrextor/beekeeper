# AGENTS.md

Rules for every coding agent (Claude Code, Codex, Cursor, OpenCode, Gemini…) working in this repository. Project owner: Iván Andrés López.

This repo is the **backend** of Landak Apiario (Supabase: Postgres, Auth, RLS, Storage; no server of our own) and the **platform admin web panel** (`admin/`, Vite + React + Tailwind 4, hosted on Vercel). The Android app lives in the sibling repo `beekeeper-mobile` and consumes the contract in `docs/api.md`. Product context: `docs/landak-apiario-overview.md`. Module order: `docs/ROADMAP.md`.

## Workflow: spec → plan → OK → code

No code, config, migration or dependency change starts without an approved plan.

1. Read this file, `CLAUDE.md`, the `.claude/rules/` file of the area, the specs in `docs/superpowers/specs/` that cover it, and `DESIGN.md` for anything in `admin/`.
2. **Spec** at `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md`: problem, decision and why, alternatives rejected, security constraints, impact on the mobile contract, out of scope.
3. **Plan** at `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`: link to the spec, branch name, numbered tasks (one commit each) naming exact files, and the checks that prove each task.
4. **Stop and wait for an explicit OK from Iván.** Never implement in the same turn. Once approved, rename the plan to `ok-YYYY-MM-DD-<slug>.md`.
5. Implement only what the approved plan says. If reality diverges, stop, update the plan and ask again.

Trivial fixes may skip the spec, never the OK. Code reviews go to `docs/superpowers/audits/YYYY-MM-DD-<topic>.md`, never only in chat.

## Where things live

| Path | Content |
|------|---------|
| `supabase/migrations/` | The full schema, one timestamped migration per change. This repo is the schema's source of truth |
| `supabase/tests/` | pgTAP tests (`supabase test db`): RLS isolation and every RPC |
| `supabase/functions/` | Edge Functions (Deno), only when SQL + RLS cannot do it |
| `supabase/seed.sql` | Local demo data only, never run against the remote |
| `docs/api.md` | The contract the mobile app relies on: tables, RPCs, storage paths, sync rules |
| `admin/` | Platform admin panel. `src/features/<screen>/` imports `components/` and `lib/`, never another feature |
| `DESIGN.md` | Admin design system (palette, fonts, Lucide icons, Tailwind tokens, components). Read it before any UI work |
| `docs/ROADMAP.md` | Every module in order, with its spec, plan and version |
| `.claude/rules/` | Path-scoped rules per domain (tenancy, sync, storage…) |

## Code rules

- All code, identifiers, file names and comments in **English**. User-facing copy (error messages raised to the app) in **Spanish**.
- Comments only for non-obvious logic.
- TypeScript strict, no `any` (`unknown` + type guards). Biome lints and formats (2 spaces, single quotes, no semicolons).
- pnpm only. No dependency added, removed or upgraded without approval. No new top-level folders without approval.
- **The second copy is the extraction.** A policy predicate, a trigger body or a check written a second time becomes a shared SQL function.

## Security boundaries

- **RLS is on for every table and every storage bucket, no exceptions.** Access is decided by organization membership and role in SQL (`private.is_member`, `private.has_role`), never by the client hiding a button.
- A QR code identifies a hive; it never authorizes. The session and the membership authorize.
- `security definer` functions set `search_path = ''`, live in the `private` schema unless they are an RPC, and revoke `execute` from `public` before granting it.
- Never put the service-role key, the database password or SMTP secrets in the repo, in an app env var or in chat. `.env.example` lists names only.
- History is never hard-deleted by the app: rows carry `deleted_at`; corrections are new rows or updates with an author.

## Before a branch is handed over: the integration review

Walk what the branch added against the mobile sync and the free-tier limits:

- **No list walked whole.** Every pull is bounded by `updated_at > cursor` and a page size.
- **No loop without an end.** Retries have a cap and a backoff; a trigger never writes a row that fires itself again.
- **No request that is not needed.** An RPC replaces several round trips when one screen needs them together.
- **Free tier counts.** Note the cost of anything that grows storage, egress or database size.

## Checks

```bash
pnpm lint          # Biome
supabase start     # local stack (Docker)
supabase db reset  # apply every migration + seed from scratch (~75 s, restarts the stack)
pnpm db:migrate    # apply only new migrations (~3 s)
supabase test db   # pgTAP
pnpm check:quick   # lint + pgTAP without a reset (~9 s), the inner loop
pnpm admin:check   # admin typecheck + Vitest + build
pnpm db:types      # regenerate admin/src/lib/database.types.ts after a migration
pnpm ci:check      # lint + admin:check + reset + pgTAP (~2 min), what CI runs
```

**Iván runs the tests and checks, never the session** (Iván, 2026-10-26). The session does not run `pnpm test:db`, `pnpm check:quick`, `pnpm ci:check` or any test command, not even the one test it just wrote. Write the code and the tests, commit each task, and when every task is done hand Iván the exact command to run (`pnpm db:migrate && pnpm check:quick`, or `pnpm ci:check` before merging); he pastes back whatever fails. Applying migrations to the local stack (`pnpm db:migrate`, `pnpm db:reset`) to inspect data is allowed; running tests is not. The session also never starts dev servers or long-running processes (`pnpm --filter admin dev`, `supabase start`); Iván starts them and the session asks when it needs one.

## Changelog

`CHANGELOG.md` follows Keep a Changelog and SemVer. Every PR adds its changes under `## [Unreleased]` and its last commit, `chore(release): x.y.z`, bumps `package.json` `version` (`feat` → minor, only fixes → patch). A change to `docs/api.md` that breaks the app is called out under `Changed` with **BREAKING**.

## Git

- Never commit to `main`. One branch per plan, one commit per task, Conventional Commits.
- Do not push, open PRs, link or push to the remote Supabase project without being asked.
