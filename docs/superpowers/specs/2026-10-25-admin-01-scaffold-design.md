# A1 · Admin scaffold and design system — spec

Date: 2026-10-25 · Branch: `feat/a1-admin-scaffold` · Status: **awaiting OK** · Version: 0.7.0

## Problem

The platform admin needs a web panel to read every beekeeper's records. It is read-only, signed-in only, and small (five screens). It needs the design system from `DESIGN.md` before any screen is built.

## Decisions

### Stack

| Need | Choice | Why |
|------|--------|-----|
| Build | **Vite** + React 19 + TypeScript strict | A signed-in SPA; no SEO, no server rendering needed. Static build, free hosting |
| Styling | **Tailwind 4** (`@tailwindcss/vite`) | Iván's standard; tokens in `@theme` |
| Routing | **React Router 7** (library mode, `createBrowserRouter`) | Five routes, loaders not needed |
| Server state | **TanStack Query 5** | Caching, pagination and retries without hand-written loading/error state on every screen |
| Data | `@supabase/supabase-js` with the publishable key | RLS + admin RPCs (B6) are the authorization |
| Icons | `lucide-react` | Same set as the app |
| Fonts | `@fontsource/arsenal`, `@fontsource-variable/inter` | Self-hosted, no Google Fonts request |
| Tests | **Vitest** for pure logic (`*.test.ts` next to the file) | Native to Vite |

Rejected: Next.js (server runtime not needed; the browser talks to Supabase under RLS, there is no secret to hide), Astro (good for content sites, not for an app shell), a component kit such as shadcn/ui (ten small components are enough and stay on our tokens).

### Folder layout (`admin/`)

```text
admin/
  index.html
  src/
    main.tsx            router + QueryClientProvider
    routes.tsx          route table
    styles/theme.css    Tailwind import, @theme tokens, light/dark semantic tokens
    lib/supabase.ts     client (env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
    lib/format.ts       dates, numbers, relative time (es-CO) + tests
    lib/labels.ts       enum value → Spanish label, mirrors docs/api.md + tests
    components/ui/      design-system components
    components/layout/  AppShell, Sidebar, TopBar, ThemeToggle
    features/<screen>/  one folder per screen (A2–A5), imports components/ and lib/, never another feature
```

### Design system work in this module

- `theme.css` with every token from `DESIGN.md`, dark mode by `prefers-color-scheme` + `data-theme` override.
- Components from `DESIGN.md` → Components, each with its states, built against a `/_design` route (dev only, removed from the production router) that shows every component in light and dark at 390 px and 1440 px.
- `AppShell` with sidebar entries: Resumen (`layout-dashboard`), Apicultores (`users`), Usuarios (`user-round`), and the signed-in email + Cerrar sesión at the bottom.
- `lib/labels.ts`: one record per enum from `docs/api.md` (hive type, status, origin, queen color, inspection tri-states, pests, disease signs, event types…).

### Tooling

`admin/package.json` scripts: `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`). Root `ci:check` adds `pnpm --filter admin typecheck test build`; CI job runs them. Biome `files.includes` adds `admin/src/**`.

## Security constraints

Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` reach the bundle. No service-role key, ever (`AGENTS.md`). Content-Security-Policy set in D2 hosting config.

## Mobile

The admin works at 390 px: top bar + sheet menu, tables as stacked cards, 44-px targets.

## Out of scope

Sign-in (A2), any real screen (A3–A5), deployment (D2).
