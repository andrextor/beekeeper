# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- The dashboard, the beekeeper list and the apiary cards no longer count inspections and events of deleted hives, so an apiary no longer shows a recent inspection on a hive that is gone.

## [0.11.0] - 2026-10-28

### Added

- Colmena page: QR code, type, brood boxes and supers, queen, origin, age, race and notes, with breadcrumbs back to the apiary and a "no existe" state.
- Historial view: inspections and events newest first, 30 at a time with "Cargar más". Each inspection shows a one-line summary, its source and attention, and opens to every recorded field, the dictated text and its notes; each event shows one line in Spanish.
- Fotos view: thumbnails 48 per page, the full photo on click with its date, caption and inspection.
- Spanish labels for feeding, treatment, harvest, loss and queen change details, in the panel and in `docs/api.md`.
- `pnpm seed:photos` uploads two sample photos to C-01 after a local reset.

### Changed

- `docs/api.md` labels `attention_level = none` "Sin novedad", as the panel and the app show it.

## [0.10.0] - 2026-10-28

### Added

- Apicultor page: name, sign-up date, apiaries, active hives of the total and people; an Apiarios view (one card per apiary with active hives and last inspection) and a Personas view (members with their role and since when, pending invitations with label and expiry). The view lives in the link.
- Apiario page: farm, place, altitude, flora, water, notes and a map link when it has coordinates; its hives with type, status, brood boxes and supers, queen year and marking colour, and colony age; Activas by default, Todas on demand.
- Breadcrumbs on both pages, and a "no existe" state for unknown or deleted beekeepers and apiaries.

### Fixed

- The light/dark toggle froze the panel when clicked.

## [0.9.0] - 2026-10-28

### Added

- Resumen: beekeepers, users, reviewers, apiaries, active hives of the total, inspections and events of the last 30 days, photos, photo storage against the 1 GB free limit (honey from 70 %, red from 90 %) and the 5 most recently inspected beekeepers.
- Apicultores: every beekeeper with owners, members, apiaries, active hives, inspections in 30 days and last inspection; search by name or owner email; search and page live in the link, so a copied link opens the same list. Deleted beekeepers carry "Eliminado".
- Usuarios: email, name, each organization with its role (links to the beekeeper), the Admin badge and the sign-up date; same search and pages.
- Phones get cards instead of tables.

## [0.8.1] - 2026-10-28

### Fixed

- Panel totals no longer count apiaries, hives, inspections, events, photos or reviewers of deleted beekeepers.
- The users list says when one of a person's organizations was deleted (`deleted_at` on each membership).
- The keyboard focus ring and the outline of text fields are visible on the glass panels in light and dark mode.
- The theme button in the sidebar and in the phone menu always agree.
- The return address after signing in is parsed, so a crafted link cannot point the panel at another site.

## [0.8.0] - 2026-10-26

### Added

- Admin sign-in (`/ingresar`) with email and password, show/hide password and Spanish error messages.
- Only platform admins get into the panel: other accounts see "Esta cuenta no tiene acceso al panel de administración." with a sign-out button; signed-out visitors are sent to sign in and come back to the page they asked for (internal paths only).
- Signed-in email and "Cerrar sesión" in the sidebar.
- `pnpm admin:env` writes `admin/.env.local` from the local stack (API URL and publishable key only).

### Changed

- The whole admin design system is glass (sidebar, top bar, cards, secondary buttons, inputs, badges) over a softly lit background, instead of the heavy deep-green sidebar.
- New palette "Bosque claro": soft sage background by day, olive black by night (no more deep-teal dark background); green only for actions and states.
- Entrance, stagger and page-transition animations, and hover/press motion on every control (off with reduced motion).

## [0.7.0] - 2026-10-26

### Added

- Admin panel base (`admin/`): Vite + React 19 + TypeScript strict, Tailwind 4 with the `DESIGN.md` tokens, light/dark/system theme, Plus Jakarta Sans (headings, big numbers) + Inter self-hosted, Lucide icons.
- App shell: sidebar on desktop, top bar with a menu on phones, placeholder pages for Resumen, Apicultores and Usuarios.
- Base components (button, icon button, input, card, badge, skeleton, empty and error states) and a dev-only `/_design` gallery.
- Spanish dates, numbers and labels for every API enum; typed Supabase client generated from the database (`pnpm db:types`).
- `pnpm admin:check` (typecheck, tests, build), part of `pnpm ci:check` and of CI.
- `on-danger` color token (white text on the dark-mode danger red was unreadable).

## [0.6.0] - 2026-10-26

### Added

- Platform admin read API: `admin_stats` (totals, last-30-day activity, photo storage used), `admin_list_organizations` (beekeepers with owners, members, apiaries, active hives and last inspection; search by name or owner email), `admin_organization_summary` (members, pending invites, apiaries with counts) and `admin_list_users`.
- Only the platform admin can call them, and they read through the same row-level security as everything else; none of them writes.

## [0.5.0] - 2026-10-26

### Added

- Photos: private `hive-photos` bucket (5 MB, JPEG only) and a `photos` table linked to a hive and optionally to an inspection of the same hive. Files live under `{organization}/{hive}/{photo}.jpg` plus a `.thumb.jpg` made on the phone.
- Members upload only into live hives of their own organization; other beekeepers cannot see or download the files; the platform admin only reads; nothing is ever hard-deleted by the app.

### Changed

- Moving an inspection or a photo to another hive is refused with "Un registro no puede cambiar de colmena." (was "Una revisión…").
- Deleting an inspection now also deletes the photos taken during it, as it already did with its notes and events.

## [0.4.0] - 2026-10-26

### Added

- Inspections: strength, temperament, queen, eggs and larvae, queen cells, brood/honey/pollen frames, brood pattern, stores, varroa (method, count, sample), pests, observed disease signs, weather, temperature, attention level, planned actions, next inspection date, notes and the original dictation. Only the hive, date and source are required; every observation accepts "not checked".
- Hive events: note (field-mode Nota 1, Nota 2…), feeding, treatment, queen change, harvest, split, merge, transfer, swarm, loss and QR relabel, optionally linked to an inspection of the same hive.
- Owners and reviewers record inspections and events; reviewers edit only their own, owners edit all of them (also those of a member who left); the platform admin only reads.
- Open tasks per hive (`hive_open_tasks`): the planned actions of its latest inspection, e.g. "colmenas por alimentar".
- `hive_timeline`: inspections and events of a hive merged newest first, paged by date and id.
- Dates more than a day in the future (now one rule and one message for hives too), inspectors outside the organization, events linked to another hive's inspection and moving an inspection to another hive are refused. Deleting an inspection deletes the notes and events recorded with it.
- Local demo data: three inspections, two notes, a feeding and a treatment on C-01, and the loss of C-03.

## [0.3.0] - 2026-10-26

### Added

- Apiaries (name, farm, place, optional coordinates and altitude, flora, water, notes) and hives (type, boxes and supers, colony origin and start date, race, queen year/colour/mark/origin, status, notes).
- Every hive has a 10-character QR code that is unique across all beekeepers; the label carries only `landak://h/<code>`. Deleting a hive frees its code, so the printed label can go on a new colony.
- Owners create and edit apiaries and hives; reviewers and the platform admin read them; other beekeepers never see them.
- Hive names are unique per apiary (C-01 can exist in every apiary).
- An apiary cannot be deleted while it still has hives; a hive cannot point to, move into or be restored into another beekeeper's apiary or a deleted one, even when both happen at the same moment.
- Local demo data: "Vallecito 1" (C-01, C-02, C-03 dead) and "La Loma" (L-01, L-02) in Finca Landak, plus one hive of the other beekeeper.

## [0.2.1] - 2026-10-26

### Security

- Invite code hashes can no longer be read by any client. Before, an owner or the platform admin could have recovered a pending code from its hash.
- Revoking an invite that was accepted at the same moment now fails instead of reporting success.
- Role changes and removals check the caller's role after taking the organization lock, so someone demoted at that moment cannot act.

### Fixed

- Invite codes of a deleted organization no longer work, and owners cannot act on a deleted organization.
- Creating an organization twice in parallel (offline retries) returns the same id instead of an error.
- `scripts/reset-password.sh` shows the API error instead of exiting silently.

### Added

- `pnpm db:migrate` (only new migrations, ~3 s) and `pnpm check:quick` (lint + tests without a reset, ~9 s) for the daily loop; `pnpm ci:check` stays the full from-scratch check.

### Changed

- Clients must list the columns they read from `organization_invites` (`select=*` is refused).
- Access policies evaluate membership once per query instead of once per row.

## [0.2.0] - 2026-10-25

### Added

- Organizations with two roles: owner (manages everything) and reviewer (reads everything, records field work). A person can belong to several organizations.
- Sign-up and sign-in with email and password (minimum 8 characters). No emails are sent.
- Single-use invite codes (`XXXX-XXXX`, valid 7 days) that an owner shares by WhatsApp; the invited person creates their own account and types the code.
- Owners can change roles and remove people; anyone can leave. An organization always keeps at least one owner.
- Read-only platform admin that sees every organization.
- `scripts/reset-password.sh` to set a new password while there is no recovery email.
- Local demo data: two organizations and four users with the password `landak-2026`.

### Changed

- Email sign-in codes from 0.1.0 were replaced by passwords; the Spanish code email template was removed.

## [0.1.0] - 2026-10-25

### Added

- Local Supabase stack (API, Auth, Storage, Studio, Mailpit) driven by `pnpm db:start`, `pnpm db:reset` and `pnpm test:db`.
- Spanish sign-in email with a 6-digit code.
- pgTAP test harness with helpers to create users and act as them.
- CI on every pull request: Biome lint, migrations from scratch and pgTAP tests; automatic GitHub release when the version is bumped.
- API contract conventions for the apps (`docs/api.md`): client ids, timestamps, soft delete, errors, sync pull and push.
