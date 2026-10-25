# A1 · Admin scaffold — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-01-scaffold-design.md` · Branch: `feat/a1-admin-scaffold` · Status: **awaiting OK**

New dependencies (approval asked here): `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `@supabase/supabase-js`, `lucide-react`, `@fontsource/arsenal`, `@fontsource-variable/inter`; dev: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`.

1. **Vite app** — `admin/package.json`, `admin/tsconfig.json` (strict, `noUncheckedIndexedAccess`), `admin/vite.config.ts`, `admin/index.html` (`lang="es"`), `admin/src/main.tsx`, `admin/.env.example`; Biome includes `admin/src/**`.
   Check: `pnpm --filter admin dev` shows a blank page with the right fonts.
2. **Tokens** — `admin/src/styles/theme.css` (all of `DESIGN.md`), `ThemeToggle`.
3. **Formatting and labels** — `lib/format.ts` + `format.test.ts`, `lib/labels.ts` + `labels.test.ts` (every enum value has a label).
4. **UI components** — `components/ui/*` (Button, IconButton, Input, SearchInput, Badge, Card, StatCard, DataTable, Pagination, EmptyState, ErrorState, Skeleton, Timeline, PhotoGrid, Lightbox, Toast).
5. **Shell** — `components/layout/{AppShell,Sidebar,TopBar}.tsx`, `routes.tsx` with placeholder pages and the dev-only `/_design` gallery.
6. **CI** — root `ci:check` and `.github/workflows/ci.yml` admin job.
7. **Release** — `chore(release): 0.7.0`. Check: `pnpm ci:check`.

## How Iván tests it

1. `pnpm install && pnpm --filter admin dev` → http://localhost:5173.
2. Open `/_design`: every component in light; toggle dark; resize to 390 px (DevTools) → sidebar becomes a top bar with a menu.
3. Tab through `/_design` with the keyboard: every control shows the honey focus ring.
4. `pnpm --filter admin build` → `admin/dist` created, no `/_design` route in it.
