# A8 · Admin UI refresh — plan

Spec: `docs/superpowers/specs/2026-10-26-admin-08-ui-refresh-design.md` · Branch: `feat/admin-08-ui-refresh` · Status: **approved 2026-10-26** · Version: 0.16.0

No new dependencies. All paths under `admin/src/` unless noted.

## Tasks (one commit each)

1. **Tokens** `styles/theme.css`: `--app-muted-surface`, `--app-input`, `--app-ring` (light, dark, print) with `@theme inline` names `muted-surface`, `input`, `ring`; `--shadow-xs`; `button:not(:disabled) { cursor: pointer }` (Tailwind 4 default is `default`). `feat(admin): A8 tokens for solid surfaces and fields`
2. **Button + IconButton** `components/ui/Button.tsx`, `IconButton.tsx`: spec §3–4 (variants incl. `link`, sizes sm/md/lg, 44 px below `md`, no motion, 3 px ring). IconButton takes `variant` (`ghost` default, `secondary`) and is `size-11 md:size-9`. `feat(admin): A8 calm, dense buttons`
3. **Fields** `components/ui/Input.tsx` (exported `fieldClass`, `leading` slot), new `components/ui/Select.tsx` (native select + `ChevronDown`, same label/hint/error API), `SearchInput.tsx` (leading `Search` icon). `feat(admin): A8 field style and native Select`
4. **Segmented + Badge** `components/ui/Segmented.tsx` (tabs), `Badge.tsx` (tinted + ring, `dot` prop). `feat(admin): A8 tabs and soft badges`
5. **Card, DataTable, Pagination, ConfirmDialog, EmptyState** `components/ui/Card.tsx` (solid), `DataTable.tsx` (spec §9–10: header band, 48 px rows, dividers, `align` on `Column`, chevron column, 48 px skeletons), new `components/ui/MobileRow.tsx` (title + badge + label/value lines + chevron), `Pagination.tsx` (gets `total` and `pageSize`: "1–25 de 132" + Anterior/Siguiente), `ConfirmDialog.tsx` (solid panel), `EmptyState.tsx` (hint styling). `feat(admin): A8 solid cards and structured tables`
6. **Feature sweep**: callers of `Pagination` pass `total` (`OrganizationsPage.tsx`, `UsersPage.tsx`, `hives/PhotosTab.tsx`); mobile `card` renderers use `MobileRow`; replace ad-hoc `glass` cards, `hover:-translate-y-0.5`, `hover:scale-*` and `glass-field` hovers in `apiaries/ApiaryPage.tsx`, `organizations/OrganizationsPage.tsx`, `OrganizationPage.tsx`, `users/UsersPage.tsx`, `UserPage.tsx`, `fields.tsx`, `dashboard/DashboardPage.tsx`, `hives/TimelineList.tsx`, `PhotosTab.tsx`, `components/layout/Sidebar.tsx`; empty apiaries/hives get the hint "El apicultor los crea desde la app."; remove `--app-field-border` / `--app-glass-field` if unused. `refactor(admin): A8 features use the new components`
7. **User and account forms** (spec §13): `features/users/UserPage.tsx` (one Datos form with footer, password dialog, membership rows, add-to-farm dialog), `features/users/fields.tsx` (`FarmPicker` → combobox with an `exclude` list of organization ids; `PasswordField` unchanged), `features/account/AccountPage.tsx` (footer save, password dialog), generic `components/ui/Dialog.tsx` (native `<dialog>` shell extracted from `ConfirmDialog`, which then uses it). Mutations and `lib/manage-user.ts` unchanged. `feat(admin): A8 one save per form, dialogs for password and farms`
8. **Gallery + docs**: `features/design/DesignPage.tsx` shows every button variant and size, Select, fields (error/disabled), Segmented, Badge tones, a DataTable with pagination and its mobile rows; `DESIGN.md` (solid surfaces, glass only on shell, sizes, Select, table and mobile row rules, new tokens); `docs/ROADMAP.md` row A8. `docs(admin): A8 design system and gallery`
9. **Release** CHANGELOG `### Changed` + `package.json` 0.16.0. `chore(release): 0.16.0`

## Divergences while implementing

- `MobileCard` lives in `components/ui/DataTable.tsx` and `SectionCard` in `Card.tsx` (one component each, no new files); `Dialog` was extracted in task 5 together with `ConfirmDialog`.
- Columns keep `className: 'text-right'` instead of a new `align` prop.
- `last_owner` message made actionable (Iván's screenshot while deactivating the only owner).

## Checks

You run them: `pnpm lint && pnpm admin:check` after task 9 (`pnpm ci:check` before merging).

## How Iván tests it

Start `pnpm --filter admin dev`, then:

1. `/_design` in light and dark, at 1440 and 390 px: nothing moves on hover, controls are 36 px on desktop and 44 px on phone, the select opens the native picker, fields show the soft ring on focus.
2. `/apicultores` and `/usuarios`: header band, row hover, chevron at the end, "1–25 de N" with Anterior/Siguiente; at 390 px each row is a solid card with title, badge and 2–3 lines.
3. A farm with no apiaries (your "Finca Nueva"): tabs are a light pill, not a green block; the empty state says the beekeeper creates them from the app.
4. A user page: change name and email, one `Guardar cambios` saves both; `Descartar` restores them. `Cambiar contraseña` opens a dialog with Generar and copy. `Agregar a una finca` opens a dialog; typing shows a dropdown that skips farms the user already has; pick a role and add.
5. `/mi-cuenta`: same footer save and password dialog. `/usuarios/nuevo`: the farm field is the same dropdown.

## Impact on the mobile contract

None.

## Free tier

None: CSS/TSX only, no dependency.
