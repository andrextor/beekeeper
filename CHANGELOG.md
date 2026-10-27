# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.17.0] - 2026-10-26

### Added

- New farm role **Observador** (`viewer`): sees the whole farm (hives, inspections, visits, notes, photos, people) and changes nothing. Owners invite with it, and the platform admin creates and assigns it.
- Sidebar: "Manual de uso" opens the user manual in a new tab.

### Changed

- **BREAKING** (`docs/api.md` → Organizations): `organization_members.role`, `my_memberships()` and the members list can return `viewer`. Installed apps that know only owner and reviewer must update (mobile M14) before anyone gets the role.
- Writing inspections, events, notes and photos (rows and Storage files) now requires owner or reviewer; viewers get `42501`.
- Admin: each farm of a user has a role select (Propietario, Revisor, Observador) with a confirmation that says what the role allows; Nuevo usuario offers Observador.
- Sign-in and "Sin acceso" are a split screen: the app's deep "Panal" band with the product in one sentence on the left, the form on the right; on a phone the band is a hero on top with the theme button, and the form rises over it as a sheet.

## [0.16.0] - 2026-10-26

### Changed

- Admin panel restyled (A8): solid cards with a fine border instead of glass, buttons that no longer jump on hover, denser 36 px controls on desktop (44 px on phones), a soft focus ring on fields and buttons.
- Tables have a header band, row dividers, a chevron on rows that open a page and "1–25 de N" with Anterior / Siguiente; on phones each row is a solid card.
- The Apiarios / Personas switch and similar filters are light tabs instead of a green block; badges are soft pills.
- User page: name and email are saved together with one "Guardar cambios"; changing the password and adding to a farm open a dialog. The farm search is a dropdown that skips farms the person already belongs to.
- Mi cuenta: the same single save and password dialog.
- Light theme uses the app's warm stone page instead of sage, with fainter background glows, so the panel and the app look alike.
- A faint honeycomb in the page corners, the same cell as the app's "Panal" bands; with a mouse, the cells near the pointer light up softly. Printed reports carry a strip of it at the top and bottom of each page.
- Sidebar footer: an account block (initial, "Mi cuenta", email) with the theme and sign-out icon buttons beside it.
- Empty apiaries and hives say the beekeeper creates them from the app.
- Deactivating, demoting or removing the only owner of a farm now says what to do: make someone else owner first.

### Fixed

- Keyboard focus on buttons is a solid outline again, and field borders are visible enough on white (WCAG 1.4.11).
- Esc in the farm search closes only the dropdown, not the dialog around it.
- Printed reports (apiary, farm) showed an empty "Colmenas" list: the paper now gets the table, with no animations.

### Added

- Native `Select`, `Dialog`, `SectionCard` and `MobileCard` components, shown in the `/_design` gallery.

## [0.15.1] - 2026-10-25

### Fixed

- Deleting something offline no longer fails when someone else already deleted the hive or inspection it belonged to.
- A deleted farm no longer shows its apiaries, hives and records to its members, and accepts no new records; the platform admin still sees everything.
- `docs/api.md`: `profiles.deactivated_at`, push order (live rows parent-first, deletes child-first), deleted farms.
- CI: the admin tests failed without `admin/.env.local` (A7); they now get placeholder Supabase values.

### Changed

- A record whose hive, apiary or inspection was deleted now answers `parent_deleted` ("El registro relacionado fue eliminado."); `parent_mismatch` ("El registro relacionado no existe o es de otra organización.") is only for a broken link.

## [0.15.0] - 2026-10-25

### Added

- Each user has a page in the panel (Usuarios → their email): change name, email and password (shown once to share), make them owner or reviewer of a farm, add or remove them from farms, grant or remove the admin permission, and deactivate or reactivate the account. Every change of access asks first.
- A deactivated account cannot sign in ("Esta cuenta está desactivada.") and shows "Desactivado" in Usuarios and Personas; everything it recorded is kept. There is no delete: history always keeps who did the work.
- Mi cuenta (the email in the menu): change your own name, and your password after typing the current one.
- Safeguards: a farm always keeps an active owner, the platform always keeps an active admin, and no admin can remove their own permission or deactivate themselves. A deactivated admin loses admin powers at once, and your own email and password are changed only from Mi cuenta.

### Changed

- Resetting someone's password is done in the panel; `scripts/reset-password.sh` stays only for when the panel is down.

## [0.14.0] - 2026-10-25

### Added

- Platform admins create accounts from Usuarios → Nuevo usuario: a beekeeper with their own farm, a reviewer in an existing farm, or another admin. The account is ready to sign in with the password the admin sets or generates; the panel shows it once to share privately. Beekeepers and reviewers can never create accounts.
- Imprimir on the beekeeper, apiary and hive pages: the browser's print dialog, where "Guardar como PDF" downloads the report. It prints on a white page without the menu or buttons, with inspections expanded and the print date.

### Changed

- The platform admin is no longer only a reader: creating accounts is its one write. Everything else in the panel stays read-only.

## [0.13.1] - 2026-10-25

### Fixed

- The published panel loads every font: the browser blocked the smallest ones, which the build embeds in the page.

## [0.13.0] - 2026-10-25

### Added

- The admin panel is published on Vercel from `main`, with its own preview link for every pull request. Reloading any page opens it instead of a 404.
- Browser security headers on the panel: it only talks to the Supabase project, cannot be framed by another site and is not indexed by search engines.
- `docs/deploy.md`: how the panel is connected to Vercel and which values it needs.

## [0.12.1] - 2026-10-25

### Fixed

- CI lint passes again: the backup workflow is formatted, and the local `.mcp.json`, committed by mistake in 0.12.0, is no longer in the repository (it is now ignored).

## [0.12.0] - 2026-10-25

### Added

- Remote Supabase project `landak-apiario` (free plan, `us-east-1`): every migration, private photo bucket, sign-in by email and password with no email confirmation.
- Weekly backup of the remote database (roles, schema and data), encrypted and kept 90 days as a GitHub artifact; it can also be run by hand.
- `docs/deploy.md`: where each key lives, how to push a new migration, restore a backup or a paused project, and reset a password.

## [0.11.1] - 2026-10-28

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
