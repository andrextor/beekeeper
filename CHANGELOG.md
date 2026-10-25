# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
