# DESIGN.md — Landak Apiario admin panel

Design system of the web admin (`admin/`). The Android app has its own `beekeeper-mobile/DESIGN.md` built on **the same palette, fonts and icon set**; a change to a token here is copied there in the same week.

Source: *Manual de Identidad Finca Landak 2025* (colors; its typeface, Arsenal, was tried in the admin and replaced by Plus Jakarta Sans on 2026-10-26). The product must not look like every account belongs to Finca Landak: the brand colors are used as an agricultural, honey-and-leaf palette, the Finca Landak logo is not used.

## Palette

### Brand

| Token | Hex | Use |
|-------|-----|-----|
| `deep` | `#04303b` | Text on light, sidebar background, dark-mode surface base |
| `leaf` | `#0c6511` | Primary actions, links, success (7.4:1 on white — AA for any text) |
| `sprout` | `#82c75c` | Decorative accents, charts, primary in dark mode. **Never text on white** (2.1:1) |
| `honey` | `#ffb545` | Accent, highlights, "pending" states. Text on it is always `deep` (8:1); **never white on honey** |
| `pollen` | `#e8e454` | Decorative only (charts, illustrations); never a background for body text |

### Neutrals (warm stone, so the brand greens do not look cold)

| Token | Hex |
|-------|-----|
| `stone-50` | `#fafaf7` (page background, light) |
| `stone-100` | `#f2f1ec` (cards on tinted areas) |
| `stone-200` | `#e4e2da` (borders) |
| `stone-300` | `#cfccc1` (disabled borders) |
| `stone-500` | `#7a766b` (muted text, 4.6:1 on white) |
| `stone-700` | `#4a473f` (secondary text) |
| `stone-900` | `#1f1d19` (body text when not `deep`) |

### Semantic tokens (the only names components use)

| Token | Light | Dark |
|-------|-------|------|
| `--color-bg` | `stone-50` `#fafaf7` (warm stone, the app's `bg-soft`) | `#121511` (olive black) |
| `--color-surface` | `#ffffff` | `#1a1e18` |
| `--color-border` | `stone-200` `#e4e2da` | `#242a22` |
| `--color-text` | `stone-900` `#1f1d19` | `#eaeee7` |
| `--color-text-muted` | `#6b675d` (5:1 on bg) | `#9aa595` |
| `--color-primary` | `leaf` | `sprout` |
| `--color-on-primary` | `#ffffff` | `#121511` |
| `--color-accent` | `honey` | `honey` |
| `--color-on-accent` | `#18211a` | `#121511` |
| `--color-danger` | `#b42318` | `#f97066` |
| `--color-on-danger` | `#ffffff` | `#121511` (white on `#f97066` is 2.6:1) |
| `--color-warning-bg` | `#fff4e0` | `#3a2f17` |
| `--color-success-bg` | `#e7f4e4` | `#1c3317` |
| `--color-muted-surface` | `stone-100` `#f2f1ec` | `#21261f` (table header band, hovers, segmented track) |
| `--color-input` | `#949085` | `#646d5f` (field borders, ≥ 3:1 on surface) |
| `--color-ring` | `primary` at 25 % | `primary` at 25 % (soft halo around a focused field, on top of its `primary` border) |
| `--color-glass` | `rgb(255 255 255 / .66)` | `rgb(29 34 27 / .6)` (shell only) |
| `--color-glass-border` | `rgb(255 255 255 / .85)` | `rgb(255 255 255 / .07)` (shell only) |

Palette **"Bosque claro"** (chosen 2026-10-26 among five, after the deep-teal dark background was rejected as too heavy; on 2026-10-26 the light page moved from sage to the app's warm stone, with the page glows halved, so admin and app read as one product): green never fills a background, it marks actions and states; honey marks what is active or pending. `deep` stays a brand color but is no longer a surface.

### Record states (shared vocabulary with the app)

| State | Label (es) | Color | Lucide icon |
|-------|------------|-------|-------------|
| Synced | Sincronizado | `primary` | `cloud-check` |
| Pending | Pendiente | `accent` / `on-accent` | `cloud-upload` |
| Saved on device (app only) | Guardado en este dispositivo | `accent` | `smartphone` |
| Requires attention | Requiere atención | `danger` | `triangle-alert` |
| Hive status `active` / `inactive` / `dead` / `absconded` / `merged` / `sold` | Activa / Inactiva / Muerta / Fugada / Unida / Vendida | `primary` / `stone-500` / `danger` / `danger` / `stone-500` / `stone-500` | `hexagon` |
| Attention `none` / `soon` / `urgent` | Sin novedad / Pronto / Urgente | `stone-500` / `accent` / `danger` | `circle-check` / `clock` / `siren` |

## Typography

- **Plus Jakarta Sans** (Google Fonts, OFL; `@fontsource-variable/plus-jakarta-sans`) for headings and numbers in stat cards: 700 for h1/h2, 600 for h3.
- **Inter** (Google Fonts, OFL) for UI and body, `font-feature-settings: 'tnum'` in tables.
- Not used: *pastyu* (license not confirmed) and *Bellota Text* (adds weight with little gain).
- Scale (rem): 0.75 caption · 0.875 table/body-sm · 1 body · 1.25 h3 · 1.5 h2 · 2 h1 · 2.5 stat number.

## Icons

**Lucide** (`lucide-react`), stroke 2, sizes 16 (inline), 20 (buttons, nav), 24 (empty states 48). Same set as the app (`lucide-react-native`). Domain glyphs: hive `hexagon`, apiary `map-pin`, inspection `clipboard-check`, event `calendar-clock`, note `sticky-note`, photo `camera`, voice `mic`, QR `qr-code`, feeding `droplet`, treatment `syringe`, harvest `package`, queen `crown`, reviewer `user-check`, owner `user-cog`. If Lucide lacks a glyph (a bee), one custom SVG in `admin/src/components/icons/` drawn on Lucide's 24-px grid, stroke 2, round caps.

Icon-only buttons always have `aria-label` and a tooltip.

## Tailwind 4

Tokens live in `admin/src/styles/theme.css` under `@theme` (brand + stone scales) and `:root` / `[data-theme=dark]` (semantic). Dark mode follows `prefers-color-scheme` with a manual override stored in `localStorage`. Components use semantic utilities only (`bg-surface`, `text-muted`, `bg-primary text-on-primary`), never raw hex or brand names, except charts.

## Layout

- Mobile first (390 px), then 1024 and 1440. The admin is used mostly on a laptop but must work on a phone.
- Shell: sidebar 248 px on ≥ `lg` (glass panel; nav items `text-sm`, active item a `surface` pill with `shadow-xs` and a `primary` icon); on smaller screens a glass top bar with a menu sheet.
- **Surfaces (A8, 2026-10-26):** cards, tables, dialogs and list items are **solid** `surface` + 1 px `border` + `shadow-xs`. **Glass** (16 px blur over the page's two soft glows) is kept only for the shell: sidebar and top bar. The look follows shadcn/ui, Linear and the Vercel dashboard; the earlier all-glass look read as washed out.
- **Honeycomb ("Panal", like the app's M13 hero bands):** the page carries a faint honey honeycomb (the app's 42 × 72.75 cell) in the top-left and bottom-right corners, fading before the content; `--app-honeycomb` is a darker amber (honey + stone-700) at 30 % by day, honey at 12 % by night. With a mouse, the cells within ~12 rem of the pointer light up (`--app-honeycomb-glow`, `src/lib/pointer-glow.ts`, one update per frame). On paper a lighter strip of it runs along the top and bottom of every sheet.
- **Sign-in:** split screen from `lg` (left: `panal-band` utility, deep with the honey honeycomb, logo, one sentence, three facts; right: the form, no card). On a phone the band is a hero and the form a sheet with a 28 px top radius over it.
- **Motion:** nothing moves on hover (no lift, scale or glow); hover changes color in 150 ms. Page enter animations and view transitions stay.
- **Density:** from `md` up controls are 32 / 36 / 40 px (`sm` / `md` / `lg`), icon buttons 36 px, all `text-sm`; below `md` every control is 44 px.
- Content max width 1200 px, gutter 16 px (mobile) / 32 px (desktop), 8-px spacing grid.
- Radius: 8 px controls, 12 px cards. Shadow `xs` on cards and controls, `lg` on dropdowns, `2xl` on dialogs.
- **Tables** (from `md` up): bordered container, header band `muted-surface` in `text-xs` muted, 48 px rows split by 1 px dividers (no zebra), hover `muted-surface`, numbers right-aligned, a trailing chevron when the row opens a page. Pagination shows "1–25 de N" and Anterior / Siguiente.
- **Tables below `md`** become `MobileCard`s: a solid card with the title line (name + badge), 2–3 muted lines, chevron when it links. Never horizontal scroll, never smaller text.

## Components (`admin/src/components/ui/`)

`Button` (primary / secondary / ghost / danger / link, sizes sm/md/lg, loading state), `IconButton` (ghost / secondary), `Input` (+ `Field`, `fieldClass`, `leading` / `trailing` slots), `Select` (native select + chevron), `SearchInput` (debounced 300 ms, search icon), `Segmented` (tabs: `muted-surface` track, pressed = `surface` pill), `Badge` (tone, optional `dot`, tinted fill + inset ring), `Card`, `SectionCard` (title, description, footer bar for actions: one save per form), `DataTable` + `MobileCard`, `Pagination`, `Dialog` (native dialog, header, footer bar) + `ConfirmDialog`, `EmptyState` (icon in a circle + title + hint), `Skeleton`, `ErrorState` (Spanish message + retry). Feature-level: the farm combobox (`FarmPicker`, search + dropdown, `exclude`). Gallery at `/_design`.

**Forms:** one form, one `Guardar cambios` in the `SectionCard` footer, disabled until something changed, with `Descartar`. Rare or risky actions (a new password, adding to a farm) open a `Dialog` from a footer button instead of living open on the page.

## Standing rules

1. Semantic tokens only in components; a raw hex outside `theme.css` is a review finding.
2. Every list names its source column and shows an empty state, a loading skeleton and an error state.
3. Dates in Spanish (`Intl.DateTimeFormat('es-CO')`), relative for < 7 days ("hace 3 días"), absolute otherwise; times in the browser's zone.
4. Numbers with `Intl.NumberFormat('es-CO')`.
5. Focus visible on every interactive element: the 2 px `--app-focus` outline + 2 px offset (`leaf` by day, `honey` by night, ≥ 3:1); fields instead turn their border `primary` with a soft 3 px `ring`. Touch targets ≥ 44 px below `md`.
6. Copy is Spanish, short, and never blames the user.
