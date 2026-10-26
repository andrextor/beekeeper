# DESIGN.md — Landak Apiario admin panel

Design system of the web admin (`admin/`). The Android app has its own `beekeeper-mobile/DESIGN.md` built on **the same palette, fonts and icon set**; a change to a token here is copied there in the same week.

Source: *Manual de Identidad Finca Landak 2025* (colors and Arsenal). The product must not look like every account belongs to Finca Landak: the brand colors are used as an agricultural, honey-and-leaf palette, the Finca Landak logo is not used.

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
| `--color-bg` | `stone-50` | `#021e25` |
| `--color-surface` | `#ffffff` | `deep` `#04303b` |
| `--color-border` | `stone-200` | `#0d4654` |
| `--color-text` | `deep` | `stone-100` |
| `--color-text-muted` | `stone-500` | `#9fb3b8` |
| `--color-primary` | `leaf` | `sprout` |
| `--color-on-primary` | `#ffffff` | `deep` |
| `--color-accent` | `honey` | `honey` |
| `--color-on-accent` | `deep` | `deep` |
| `--color-danger` | `#b42318` | `#f97066` |
| `--color-on-danger` | `#ffffff` | `deep` (white on `#f97066` is 2.6:1) |
| `--color-warning-bg` | `#fff4e0` | `#3d2e10` |
| `--color-success-bg` | `#e7f4e4` | `#0b3a1f` |

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

- **Arsenal** (Google Fonts, OFL) for headings and numbers in stat cards: 700 for h1/h2, 400 for h3.
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
- Shell: sidebar 248 px on ≥ `lg` (background `deep`, text `stone-100`, active item `honey` left bar); on smaller screens a top bar with a menu sheet.
- Content max width 1200 px, gutter 16 px (mobile) / 32 px (desktop), 8-px spacing grid.
- Radius: 8 px controls, 12 px cards. Shadow only on overlays.
- Tables become stacked cards below `md`.

## Components (`admin/src/components/ui/`)

`Button` (primary / secondary / ghost / danger, sizes sm/md, loading state), `IconButton`, `Input`, `SearchInput` (debounced 300 ms), `Badge` (tone = semantic token), `StatCard`, `Card`, `DataTable` (columns config, empty, loading skeleton, pagination), `Pagination`, `EmptyState` (icon + title + hint), `Skeleton`, `Timeline` (+ `TimelineItem`), `PhotoGrid` + `Lightbox`, `Toast`, `ErrorState` (Spanish message + retry).

## Standing rules

1. Semantic tokens only in components; a raw hex outside `theme.css` is a review finding.
2. Every list names its source column and shows an empty state, a loading skeleton and an error state.
3. Dates in Spanish (`Intl.DateTimeFormat('es-CO')`), relative for < 7 days ("hace 3 días"), absolute otherwise; times in the browser's zone.
4. Numbers with `Intl.NumberFormat('es-CO')`.
5. Focus visible on every interactive element (2 px `honey` ring + 2 px offset); touch targets ≥ 44 px.
6. Copy is Spanish, short, and never blames the user.
