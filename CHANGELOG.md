# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
