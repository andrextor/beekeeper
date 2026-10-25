# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-25

### Added

- Local Supabase stack (API, Auth, Storage, Studio, Mailpit) driven by `pnpm db:start`, `pnpm db:reset` and `pnpm test:db`.
- Spanish sign-in email with a 6-digit code.
- pgTAP test harness with helpers to create users and act as them.
- CI on every pull request: Biome lint, migrations from scratch and pgTAP tests; automatic GitHub release when the version is bumped.
- API contract conventions for the apps (`docs/api.md`): client ids, timestamps, soft delete, errors, sync pull and push.
