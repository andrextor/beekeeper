# Roadmap — Landak Apiario

Two repos, one module per spec + plan, one branch per plan. Iván tests each module before the next one starts (each plan ends with **How Iván tests it**).

| Repo | Folder | Content |
|------|--------|---------|
| `andrextor/beekeeper` | `supabase/`, `admin/` | Backend (Supabase) + platform admin web panel |
| `andrextor/beekeeper-mobile` | — | Android app (Expo), starts after the backend and the admin are done |

Shared decisions that every module relies on: `DESIGN.md` (admin) / `beekeeper-mobile/DESIGN.md` (app), `docs/api.md` (contract), `AGENTS.md` (rules).

## Phase 1 — Backend (`beekeeper`)

| # | Module | Spec | Plan | Version |
|---|--------|------|------|---------|
| B1 | Tooling, local stack, CI, API doc skeleton | `specs/2026-10-25-backend-01-tooling-design.md` | `plans/2026-10-25-backend-01-tooling.md` | 0.1.0 |
| B2 | Tenancy: profiles, organizations, members, invites, roles, platform admin | `specs/2026-10-25-backend-02-tenancy-design.md` | `plans/2026-10-25-backend-02-tenancy.md` | 0.2.0 |
| B3 | Apiaries and hives (QR identity) | `specs/2026-10-25-backend-03-apiaries-hives-design.md` | `plans/2026-10-25-backend-03-apiaries-hives.md` | 0.3.0 |
| B4 | Inspections, events and field notes | `specs/2026-10-25-backend-04-inspections-events-design.md` | `plans/ok-2026-10-25-backend-04-inspections-events.md` | 0.4.0 |
| B5 | Photos: table + private bucket | `specs/2026-10-25-backend-05-photos-design.md` | `plans/ok-2026-10-25-backend-05-photos.md` | 0.5.0 |
| B6 | Platform admin read API | `specs/2026-10-25-backend-06-admin-api-design.md` | `plans/ok-2026-10-25-backend-06-admin-api.md` | 0.6.0 |

## Phase 2 — Admin panel (`beekeeper/admin`)

| # | Module | Spec | Plan | Version |
|---|--------|------|------|---------|
| A1 | Scaffold + design system (Vite, React, Tailwind 4, Lucide, tokens, shell) | `specs/2026-10-25-admin-01-scaffold-design.md` | `plans/ok-2026-10-25-admin-01-scaffold.md` | 0.7.0 |
| A2 | Sign-in (email + password) and access gate | `specs/2026-10-25-admin-02-sign-in-design.md` | `plans/ok-2026-10-25-admin-02-sign-in.md` | 0.8.0 |
| A3 | Dashboard and beekeepers list | `specs/2026-10-25-admin-03-dashboard-design.md` | `plans/ok-2026-10-25-admin-03-dashboard.md` | 0.9.0 |
| A4 | Organization detail: members, apiaries, hives | `specs/2026-10-25-admin-04-organization-design.md` | `plans/ok-2026-10-25-admin-04-organization.md` | 0.10.0 |
| A5 | Hive detail: timeline, inspections, events, photos | `specs/2026-10-25-admin-05-hive-timeline-design.md` | `plans/ok-2026-10-25-admin-05-hive-timeline.md` | 0.11.0 |
| A6 | Platform admin creates beekeepers and reviewers; print reports | `specs/2026-10-25-admin-06-create-users-design.md` | `plans/ok-2026-10-25-admin-06-create-users.md` | 0.14.0 |

## Phase 3 — Go live (external accounts, each step asks first)

| # | Module | Spec | Plan | Version |
|---|--------|------|------|---------|
| D1 | Remote Supabase project, auth settings, first platform admin | `specs/2026-10-25-deploy-01-supabase-design.md` | `plans/ok-2026-10-25-deploy-01-supabase.md` | 0.12.0 |
| D2 | Admin panel on Vercel | `specs/2026-10-25-deploy-02-admin-vercel-design.md` | `plans/ok-2026-10-25-deploy-02-admin-vercel.md` | 0.13.0 |

## Phase 4 — Mobile (`beekeeper-mobile`)

See `beekeeper-mobile/docs/ROADMAP.md` (M1 scaffold … M12 APK distribution).

## Later

- Public landing (download, APK install guide, FAQ) with **Astro**, its own spec. The admin stays Vite + React (Iván, 2026-10-25: same React model as the mobile app).

## Decisions taken by default (Iván can overturn them at any OK)

1. A reviewer inspects existing hives; only the owner creates or edits apiaries and hives.
2. No pure read-only role in V1 (the reviewer reads everything and writes only inspections, events, notes and photos).
3. A reviewer sees every apiary of the organization (no per-apiary assignment in V1).
4. ~~Sign-in by email one-time code~~ → **email + password, no emails sent; reviewers join with a single-use invite code** (Iván, 2026-10-25: there is no domain to send email from). Google sign-in later.
5. No `farms` table: an apiary carries an optional `farm_name`.
