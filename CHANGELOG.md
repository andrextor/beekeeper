# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
