# B6–A2 code review — admin API, admin scaffold and sign-in

Date: 2026-10-28 · Branch: `fix/b6-a2-code-review` · Scope: `git diff 095c7a4 9d76952` (B6, A1 and A2, merged without a review).

| # | Finding | Verdict | Fix |
|---|---------|---------|-----|
| F1 | `admin_stats` leaves deleted organizations out of `organizations` but counts their apiaries, hives, inspections, events, photos and reviewers (deleting an organization does not cascade) | Valid | Every count except `users` and `storage_bytes` only covers live organizations; test with a deleted organization |
| F2 | `admin_list_users` lists memberships in deleted organizations as if they were live | Valid | Each membership carries the organization's `deleted_at` (additive); `docs/api.md` updated |
| F3 | Focus ring is `honey` on the sage page: 1.7:1, below the 3:1 of WCAG 2.4.11/1.4.11 | Valid | `--app-focus` token: `leaf` by day, `honey` by night |
| F4 | Inputs outline with `glass-border` (white on near-white glass by day, 7 % white by night): the field boundary is invisible | Valid | `--color-field-border` (`#86948a` / `#66705f`, ≥ 3:1) on inputs; badges keep the hairline |
| F5 | The sidebar and the phone menu each mount a `ThemeToggle` with its own state; after switching in one, the other shows the old icon and cycles from the old value (resizing across `lg`) | Valid | `useSyncExternalStore` over a listener set in `lib/theme.ts` |
| F6 | `safeNextPath` checks prefixes only: `/\t/evil.com` passes and browsers strip the tab to `//evil.com`. React Router's `pushState` throws on another origin, so it crashes the page rather than redirecting | Valid (hardening) | Parse with `URL.parse` against a fixed origin and keep path, query and hash only; test added |
| F7 | `.env.example` says `pnpm db:start` prints the values; `pnpm admin:env` writes them since A2 | Valid (docs) | Comment updated |
| F8 | Every component calling `useSession` opens its own Auth subscription | Rejected: each gets the stored session from memory at once; a shared provider is worth it when a screen needs the session in many places | None |
| F9 | Deep links (`/apicultores`) will 404 on Vercel without an SPA rewrite | Deferred to D2 (deploy), where `vercel.json` is created | None now |
| F10 | `admin_list_organizations` runs per-row subqueries with offset paging | Already marked `ponytail:` in B6; fine for tens of beekeepers | None |

## Second pass (`/code-review` of this branch)

| # | Finding | Verdict | Fix |
|---|---------|---------|-----|
| R1 | `safeNextPath` returned the parsed path, and `/.//evil.com` parses to `//evil.com` | Valid | A parsed path starting with `//` is refused; test added |
| R2 | `URL.parse` is missing before Safari 18 / Chrome 126, so sign-in would go blank there | Valid | `new URL` in a `try` |
| R3 | With blocked storage the toggle re-read `system` on every render and could never reach dark | Valid | `lib/theme.ts` keeps the preference in memory |
| R4 | A theme change in another tab left this tab stale | Valid | `storage` event applies it and notifies the toggles |
| R5 | `#86948a` is 2.94:1 against the sage page, not 3:1 | Valid | `#7f8d83` (3.2:1) |
| R6 | Inputs kept `focus:outline-none`, so the new focus ring never showed on fields | Valid | Inputs use the global `:focus-visible` ring plus the primary border |
| R7 | The deleted-organization test only checked apiaries | Valid | The deleted organization gets a hive, inspection, event and photo; events and photos asserted, hives and inspections already were |
| R8 | "Live organization" filter repeated per aggregate; extract a helper or cascade the organization's soft delete | Rejected: within `admin_stats` it is one array (`v_orgs`); the other admin RPCs show deleted organizations on purpose, labelled with `deleted_at`. Cascading an organization's deletion is a product decision for the tenancy module, not a review fix | None |
