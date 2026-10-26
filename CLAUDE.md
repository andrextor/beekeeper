# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**Mandatory workflow (see AGENTS.md):** spec → plan → wait for Iván's explicit OK → implement. Never implement in the same turn the plan is written. Work goes module by module in the order of `docs/ROADMAP.md`; Iván tests each module (the plan's *How Iván tests it*) before the next starts.

**Never run tests or checks.** Iván runs them, always (2026-10-26). Do not run `pnpm test:db`, `pnpm check:quick`, `pnpm ci:check`, `pnpm test` or any test command, not even the test just written. Write the code and the tests, commit each task, and at the end hand Iván the exact one-line command to run; he pastes back whatever fails.

**Never start dev servers or long-running processes.** Iván starts them (2026-10-26): no `pnpm --filter admin dev`, `vite`, `supabase start`/`pnpm db:start` or background shells. Hand him the command; for a browser check, ask him to start the server. One-shot commands that apply or inspect state (`pnpm db:migrate`, `pnpm db:reset`, `pnpm db:types`, git) are fine.

## Project

Landak Apiario: a free, multi-beekeeper hive management system. Beekeepers own an organization, register apiaries (sites such as "Vallecito 1") and hives, and record inspections, events, notes and photos from an offline-first Android app (`beekeeper-mobile`). They invite other users as reviewers; a platform admin reads everything through `admin/` and writes only one thing: creating accounts (A6).

Status: greenfield. The September prototype (V0.3.1 ZIPs, Supabase project `kcqnnlzmhzkrwwlgxlmu`) was not recovered; nothing here derives from it.

## Stack

- **Backend = Supabase free plan, no server of our own**: PostgREST is the API, RLS the authorization, Auth by email + password with no emails sent (no domain yet; reviewers join with single-use invite codes), Storage for photos, region `us-east-1`. Edge Functions only when SQL cannot do it.
- **Admin**: Vite + React 19 + TypeScript + Tailwind 4 + React Router 7 + TanStack Query + `lucide-react`, static build on Vercel Hobby.
- Tooling: pnpm workspace, Biome, Supabase CLI local stack (Docker), pgTAP (`supabase test db`), Vitest in `admin/`.

## Architecture

- **Tenancy is row-level.** Every domain row carries `organization_id`; reads use `organization_id in (select private.my_organization_ids()) or (select private.is_platform_admin())`, writes `private.is_member(org)` / `private.has_role(org, role)`. Child rows denormalize `organization_id` and `private.check_parent` checks it against the parent, so policies never join.
- **Roles:** `owner` (everything in the org), `reviewer` (reads the org, writes inspections/events/notes/photos, edits only their own), platform admin flag `profiles.is_platform_admin` (read-only everywhere except creating accounts through the `admin-create-user` Edge Function; set by SQL or by another admin there).
- **The app writes tables directly** with client-generated UUIDs and idempotent upserts; RPCs only for multi-row or privileged operations (tenancy, admin reads, timeline).
- **Sync contract:** server-owned `updated_at`, soft delete via `deleted_at`, pulls by `updated_at > cursor` in pages of 500 with a 2-minute overlap. Spelled out in `docs/api.md`.
- **Photos:** private bucket `hive-photos`, `{organization_id}/{hive_id}/{photo_id}.jpg` + `.thumb.jpg` made on the phone; storage policies authorize by the path's first folder.

## Review lessons

Code reviews live in `docs/superpowers/audits/`. Their recurring findings are rules, not memories: `.claude/rules/sql.md` (column grants for secrets, lock before check, `on conflict` creates, soft-deleted parents, helper grants), `.claude/rules/tenancy.md` (read pattern, lock order, explicit invite columns), `.claude/rules/scripts.md` (curl and JSON error handling). Read the rule file of the area before writing code there.
