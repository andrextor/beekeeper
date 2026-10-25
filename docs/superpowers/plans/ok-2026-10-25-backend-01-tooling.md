# B1 · Tooling — plan

Spec: `docs/superpowers/specs/2026-10-25-backend-01-tooling-design.md` · Branch: `chore/b1-tooling` · Status: **awaiting OK**

1. **Workspace and lint** — `package.json` (`name: beekeeper`, `version: 0.0.0`, `private`, `packageManager` pinned pnpm, `engines.node: 22.x`, scripts `lint`, `lint:fix`, `db:start`, `db:stop`, `db:reset`, `test:db`, `ci:check`), devDependencies `@biomejs/biome`, `supabase`; `pnpm-workspace.yaml` (`packages: [admin]`), `biome.json`, `.editorconfig`, `.gitignore`, `.env.example`.
   Check: `pnpm install && pnpm lint`.
2. **Supabase local stack** — `pnpm exec supabase init`, then edit `supabase/config.toml` per the spec; `supabase/templates/otp.html` (Spanish OTP email); empty `supabase/seed.sql`.
   Check: `pnpm db:start` prints the local URLs; Studio opens at http://localhost:54323; Mailpit at http://localhost:54324.
3. **pgTAP harness** — `supabase/tests/_helpers.psql`, `supabase/tests/00_smoke.test.sql` (plan 2: `pgtap` extension present, `tests.create_user` creates a profile-less user for now).
   Check: `pnpm test:db` green.
4. **CI and release** — `.github/workflows/ci.yml` (pnpm setup, `supabase/setup-cli` with the pinned version, `pnpm lint`, `supabase start`, `supabase db reset`, `supabase test db`), `.github/workflows/release.yml`.
   Check: workflow YAML valid (`actionlint` if available); real run happens on the first PR.
5. **Docs** — `docs/api.md` (conventions section from the spec + empty sections: Auth, Organizations, Apiaries, Hives, Inspections, Events, Photos, Admin), `.claude/rules/sql.md`, `README.md` (Spanish), `CHANGELOG.md` with `## [Unreleased]`.
   Check: read-through.
6. **Release** — `chore(release): 0.1.0`.
   Check: `pnpm ci:check`.

## How Iván tests it

1. `pnpm install`
2. `pnpm db:start` → open Studio (http://localhost:54323) and Mailpit (http://localhost:54324).
3. `pnpm test:db` → all green.
4. `pnpm db:stop`.
5. Open the PR on GitHub and see the CI job pass.
