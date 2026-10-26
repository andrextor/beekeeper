# A1 · Admin scaffold — plan

Spec: `docs/superpowers/specs/2026-10-25-admin-01-scaffold-design.md` · Branch: `feat/a1-admin-scaffold` · Status: **awaiting OK** (revised 2026-10-26)

New dependencies (approval asked here, current versions on 2026-10-26):

| Runtime | Version | Dev | Version |
|---------|---------|-----|---------|
| `react`, `react-dom` | 19.3.1 | `vite` | 8.3.5 |
| `react-router` | 8.5.0 | `@vitejs/plugin-react` | 6.1.2 |
| `@tanstack/react-query` | 5.104.5 | `tailwindcss`, `@tailwindcss/vite` | 4.3.3 |
| `@supabase/supabase-js` | 2.118.0 | `typescript` | 7.0.2 |
| `lucide-react` | 1.61.0 | `@types/react`, `@types/react-dom` | 19.3.0 |
| `@fontsource/arsenal`, `@fontsource-variable/inter` | 5.3.0 | `vitest` | 5.0.5 |

Exact versions pinned (no `^`), like the root.

1. **Vite app** — `admin/package.json`, `admin/tsconfig.json` (strict, `noUncheckedIndexedAccess`), `admin/vite.config.ts`, `admin/index.html` (`lang="es"`), `admin/src/main.tsx`, `admin/.env.example`, `admin/src/vite-env.d.ts`.
2. **Types and client** — root script `db:types`; `admin/src/lib/database.types.ts` (generated), `admin/src/lib/supabase.ts` (typed client, fails loudly on missing env).
3. **Tokens** — `admin/src/styles/theme.css` (all of `DESIGN.md`), `components/layout/ThemeToggle.tsx` (system / light / dark, remembered in `localStorage`).
4. **Formatting and labels** — `lib/format.ts` + `format.test.ts`, `lib/labels.ts` + `labels.test.ts` (every enum value in `docs/api.md` has a label).
5. **Base components** — `components/ui/{Button,IconButton,Input,Card,Badge,Skeleton,EmptyState,ErrorState}.tsx`.
6. **Shell** — `components/layout/{AppShell,Sidebar,TopBar}.tsx`, `src/routes.tsx` with placeholder pages (Resumen, Apicultores, Usuarios) and the dev-only `/_design` gallery.
7. **Scripts and CI** — root `admin:check`, `ci:check` += `admin:check`; `.github/workflows/ci.yml` job `admin`.
8. **Release** — `chore(release): 0.7.0`, CHANGELOG, ROADMAP.

Visual check by the session: dev server + Chrome at 390 px and 1440 px, light and dark.

## How Iván tests it

1. `pnpm install && pnpm ci:check` → green.
2. `pnpm --filter admin dev` → http://localhost:5173/_design: every component, light and dark (toggle), 390 px in DevTools → the sidebar becomes a top bar with a menu.
3. Tab through `/_design`: every control shows the honey focus ring.
4. `pnpm --filter admin build` → `admin/dist`, and `/_design` is not in the production routes.
