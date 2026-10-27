# A8 · Admin UI refresh: buttons, fields, select, tables — design

Status: **approved 2026-10-26** · Version: 0.16.0 · Branch: `feat/admin-08-ui-refresh`

## Problem

Iván (2026-10-26): the admin components "look like a 2000s Bootstrap app". Reading `admin/src/components/ui/` the causes are concrete:

- **Everything moves.** Buttons lift on hover (`hover:-translate-y-0.5`), shrink on press (`active:scale-[0.97]`), glow (`hover:shadow-lg shadow-primary/25`) and brighten; icon buttons grow to 110 %; badges, cards and photos grow too.
- **Everything is 44 px and `text-base`** on desktop. Modern admins use 32–40 px controls with `text-sm`.
- **Glass on every card, table, field and badge:** translucent with a white hairline, washed out on the sage page, no clear edge.
- **Fields** have a heavy dark outline (`#7f8d83`) and no focus ring of their own.
- **No select component.**
- **Tables have no structure:** header in body text, no header band, borders that barely show, pagination is two lone icons with no total.
- **The segmented control is a solid green block** (the "Apiarios / Personas" tabs in Iván's screenshot), the loudest thing on the page.
- **Empty states give no next step** ("Aún no hay apiarios" without saying who creates them).

## Research (2026-10-26)

`distriweb.pro` does not resolve (DNS), so it could not be reviewed. References used:

- **shadcn/ui** (`button.tsx`, new-york v4): `h-9` default, `h-8` sm, `h-10` lg, `size-9` icon, `text-sm font-medium`, `rounded-md`, hover only changes background (`bg-primary/90`), focus `ring-[3px] ring-ring/50`, outline variant `border bg-background shadow-xs`. No motion.
- **Setproduct, data table guide 2026**: quiet headers, 1 px row dividers instead of grid borders, subtle hover, right-aligned numbers, skeleton rows of the real row height, pagination always shows the total, actions never hover-only; on mobile pick one strategy (cards for record-by-record reading).
- **Pencil & Paper, enterprise data tables**: rows 40 / 48 / 56 px, dividers over zebra stripes (zebra fights hover and selection), headers aligned with their column, never center-aligned columns, whole-row hover signals a detail view.
- **Ninja Tables, mobile-first tables 2026**: on phones keep 2–3 critical fields, the rest stacked as label/value lines or hidden; never shrink text to fit.
- Tonal anchors from the same research: Linear, Vercel dashboard, Stripe dashboard (solid white surfaces, hairline borders, tiny shadows, muted header bands, small pill badges).

## Decision

Keep the palette, fonts and icons (unchanged in DESIGN.md, so `beekeeper-mobile` is not affected). Change how components are drawn:

1. **Surfaces:** cards, tables, dialogs, list items become **solid** `surface` + 1 px `border` + `shadow-xs`. Glass stays only on the shell (sidebar, top bar) and modal backdrops. The page glows stay.
2. **No hover motion anywhere:** hover changes color only (150 ms). Page enter animations stay.
3. **Density (shadcn sizes):** from `md` up, `sm` 32 px, `md` 36 px, `lg` 40 px, icon 36 px, all `text-sm`. Below `md` every control stays 44 px (touch rule).
4. **Buttons:** `primary` solid, hover `primary/90`; `secondary` = surface + border + `shadow-xs`, hover `muted-surface`; `ghost` hover `muted-surface`; `danger` solid; new `link`. Icons 16 px. Focus = 3 px `ring`.
5. **Fields:** `Input`, new `Select`, `SearchInput` share one style: surface fill, `input` border, `shadow-xs`, focus = primary border + 3 px ring, error = danger border + danger ring. `SearchInput` gets a leading search icon.
6. **Select = native `<select>`** styled (`appearance-none` + Lucide `ChevronDown`): keyboard, screen readers and the phone's own picker for free.
7. **Segmented = tabs:** `muted-surface` track; the pressed option is a surface pill with `shadow-xs` and `text` color, not solid green.
8. **Badge:** small pill, tinted background + inset 1 px ring of the same tone, optional leading dot; no hover, no blur.
9. **DataTable (desktop):** bordered rounded container; header band `muted-surface`, `text-xs font-medium` muted, aligned with its column; rows 48 px, 1 px dividers, hover `muted-surface`; a column can be `align: 'right'` for counts; a trailing chevron column when `rowHref` is set so the detail view is visible without hover; skeleton rows are 48 px.
10. **DataTable (below `md`):** each row is a solid card: title line (primary field + badge), then 2–3 label/value lines, chevron at the right when it links. Feature `card` renderers keep deciding the content; a shared `MobileRow` component gives them the layout.
11. **Pagination:** "1–25 de 132" on the left (uses the `total` the pages already have), `Anterior` / `Siguiente` secondary `sm` buttons on the right.
12. **Empty states with a next step:** `EmptyState` gets the existing `hint` used where the admin cannot act. Apiaries empty: "El apicultor los crea desde la app." (the admin writes only accounts and memberships, CLAUDE.md → Roles). Same for hives.

13. **User page (`/usuarios/:id`) without a save button per field** (Iván 2026-10-26: "guardar cada formulario es molesto, feo"):
    - **Datos:** one form, Nombre + Correo, a single `Guardar cambios` in the card footer, disabled until something changed, with `Descartar` beside it. It calls only what changed (`setDisplayName`, `updateUserAuth set_email`, in that order); a failure shows under its field and keeps the other result. "Cambios guardados." appears in the footer.
    - **Contraseña:** no longer an always-open form. A `Cambiar contraseña` secondary button opens a dialog (field + Generar); on success the dialog shows the new password with copy, same warning as today.
    - **Fincas:** the always-open search list goes. Each membership is a row (name, role badge, since) with `Hacer revisor/propietario` and `Quitar` as `sm` buttons. `Agregar a una finca` opens a dialog: farm combobox (search field with a dropdown of results under it, only after focus/typing, farms the user already belongs to are left out) + role `Select` + `Agregar`.
    - Mi cuenta (`/mi-cuenta`) gets the same footer pattern for its name, and its password form moves into the same dialog.
    - `FarmPicker` becomes the combobox (input + floating result list, `role="combobox"` / `listbox`, arrows + Enter + Esc); `/usuarios/nuevo` uses it too.

New semantic tokens (light / dark): `--color-muted-surface` (`#f1f4ef` / `#21261f`), `--color-input` (`#c9d3c6` / `#353c32`), `--color-ring` (primary at 25 %), `--shadow-xs`. `--color-field-border` and `--color-glass-field` are removed once nothing uses them.

## Alternatives rejected

- **Install shadcn/ui, Radix or a table library:** new dependencies for what Tailwind and native elements already do here.
- **Custom listbox select:** more code and accessibility work; no list in the admin needs search inside a select (the farm picker keeps its search list).
- **Horizontal scroll tables on mobile:** the research calls it the typical mistake for record-by-record reading, which is what the admin lists are.
- **Density switcher, column hiding, sorting, bulk selection:** lists are 25 rows of a few columns, no bulk actions exist. Add when a list needs them.
- **New palette:** the colors are not the problem and are shared with the app.
- **New-user wizard** (first draft): dropped by Iván 2026-10-26; the page only picks up the new components.

## Security constraints

None: presentation only.

## Impact on the mobile contract

None. Shared tokens do not change; the new ones are admin-only.

## Accessibility

- The primary border plus the 3 px ring keeps ≥ 3:1 for the field focus (WCAG 1.4.11); the global `:focus-visible` outline stays for everything else.
- 44 px targets below `md` (DESIGN.md rule 5, now "below md").
- The chevron column is decorative (`aria-hidden`); the link inside the row stays the keyboard path.
- Native `table` / `thead` / `th scope` kept.

## Out of scope

- Creating apiaries or hives from the admin (by design the owner does it in the app).
- Sidebar and top bar layout (only the `hover:translate-x-1` of nav items goes).
- Toasts, charts, new screens.
