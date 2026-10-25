# B3 · Apiaries and hives (QR identity) — spec

Date: 2026-10-25 · Branch: `feat/b3-apiaries-hives` · Status: **implemented** (2026-10-26) · Version: 0.3.0

## Problem

A beekeeper keeps hives in several sites ("Vallecito 1"). Each hive needs a stable identity that a printed QR can point to, plus the facts that describe the colony: type, size, origin, age, queen. Everything is created offline on the phone first.

## Decisions

### Hierarchy

`organization → apiary → hive`. No `farms` table; the apiary has an optional `farm_name`. Only owners create and edit apiaries and hives (default decision 1 in `docs/ROADMAP.md`).

### Common columns (every domain table from here on)

```sql
id uuid primary key,                                   -- client-generated
organization_id uuid not null references organizations,
created_by uuid not null default auth.uid() references profiles,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),         -- trigger
deleted_at timestamptz
```

Plus index `(organization_id, updated_at)` for the sync pull.

Shared triggers, written once in this module and reused by B4/B5 (the second copy is the extraction):

- `private.force_author()` before insert: `created_by := auth.uid()` (server-side writes without a session must name one: `missing_author`); before update: `created_by` silently keeps its value (idempotent upserts resend it) and a change of `organization_id` raises `immutable_column`. `created_at` is owned by `private.set_timestamps()` (B2).
- `private.check_parent(parent_table, parent_column)` before insert or update: the parent row (apiary for a hive, hive for children) belongs to the same `organization_id` and is not deleted (`parent_mismatch`). One function reading `TG_ARGV`; a null optional parent and an unchanged one on update are skipped.
- Triggers are named `<table>_<NN>_<purpose>` because Postgres fires them in name order: `10_set_timestamps`, `20_force_author`, `30_check_<parent>`, `40+` table-specific.

### `apiaries`

| Column | Type | Rule |
|--------|------|------|
| `name` | text | 1..80, unique per organization among non-deleted (case-insensitive) — `duplicate_name` |
| `farm_name` | text | ≤ 80 |
| `place` | text | ≤ 120 (municipio, vereda) |
| `latitude`, `longitude` | numeric(9,6) | −90..90 / −180..180, both or neither |
| `altitude_m` | integer | −100..6000 |
| `flora_notes` | text | ≤ 2000 (main bloom, crops nearby) |
| `water_source` | text | ≤ 200 |
| `notes` | text | ≤ 2000 |

Location is optional and only visible inside the organization (and to the platform admin).

### `hives`

| Column | Type | Rule |
|--------|------|------|
| `apiary_id` | uuid → apiaries | same organization (`check_parent`); moving to another apiary of the same organization is an update |
| `name` | text | 1..40 ("C-12"), unique per apiary among non-deleted (beekeepers number hives per site) — `duplicate_name` |
| `qr_code` | text | unique across organizations among non-deleted hives (a deleted hive frees its printed label), `^[0-9A-HJKMNP-TV-Z]{10}$` (Crockford base32, client-generated) — `qr_taken` |
| `hive_type` | text | `langstroth`, `dadant`, `top_bar`, `warre`, `nucleus`, `rustic`, `other` |
| `brood_boxes` | smallint | 0..5 |
| `supers` | smallint | 0..10 (alzas) |
| `colony_origin` | text | `swarm_capture`, `split`, `package`, `nucleus_purchase`, `colony_purchase`, `unknown` |
| `colony_started_on` | date | not after tomorrow (`future_date`, trigger: phone clocks and time zones drift); the app shows the age from it |
| `bee_race` | text | ≤ 60, free text (most Colombian colonies: "africanizada") |
| `queen_year` | smallint | 2000..2100 |
| `queen_marked` | boolean | null = unknown |
| `queen_color` | text | `white`, `yellow`, `red`, `green`, `blue` (international code: year ending 1/6 white, 2/7 yellow, 3/8 red, 4/9 green, 5/0 blue; the app suggests it from `queen_year`) |
| `queen_origin` | text | `own_rearing`, `purchased`, `natural`, `unknown` |
| `status` | text | `active` (default), `inactive`, `dead`, `absconded`, `merged`, `sold` |
| `notes` | text | ≤ 2000 |

Every enum is a named `check` (not a Postgres `enum` type), so adding a value is a one-line migration.

### QR

- The printed QR encodes `landak://h/<qr_code>`. It carries no name, location or organization.
- The app looks the code up in its local SQLite; online, `select … from hives where qr_code = :code` under RLS. A code from another organization returns no row; the app shows "Esta colmena no pertenece a tus apiarios".
- Re-labelling (damaged label) is an owner update of `qr_code`; the app writes a `qr_relabel` event (`{ old_qr_code, new_qr_code }`, B4) so the history keeps the trail.
- Collision: 32^10 ≈ 10^15 codes; the unique index turns the impossible collision into `qr_taken` and the app regenerates.

### RLS

| Table | select | insert | update |
|-------|--------|--------|--------|
| `apiaries`, `hives` | `organization_id in (select private.my_organization_ids()) or (select private.is_platform_admin())` | `private.has_role(organization_id, 'owner')` | `private.has_role(organization_id, 'owner')` (with check the same) |

No `delete` grant: deletion is `deleted_at`. Soft-deleting an apiary that still has any hive with `deleted_at is null` (whatever its `status`, dead hives included) is refused (`apiary_not_empty`, "El apiario todavía tiene colmenas."); the owner moves or deletes the hives first. Same rule as `check_parent`, which refuses children of a deleted parent.

Unique index names (mapped in `docs/api.md`, B1): `apiaries_org_name_key`, `hives_apiary_name_key`, `hives_qr_code_key`. Revised after the code review of 2026-10-26 (`docs/superpowers/audits/2026-10-26-b3-code-review.md`).

## Tests

`apiaries_hives.test.sql`: owner creates apiary + hive; reviewer select works, insert/update refused; other organization sees nothing; `qr_code` duplicate across organizations → `qr_taken`; bad QR format refused; hive pointing at another organization's apiary → `parent_mismatch`; `created_by` forged → overwritten; soft-deleting an apiary with active hives → `apiary_not_empty`; platform admin reads, cannot update.

## API contract (`docs/api.md` → Apiaries, Hives)

Column tables above, enum values with their Spanish labels (the app and the admin show the same words: e.g. `swarm_capture` → "Captura de enjambre", `top_bar` → "Kenyana / barra superior"), the QR URL format, the lookup sequence.

## Out of scope

Printing labels (mobile M5), apiary maps, hive photos (B5), per-apiary reviewer access.

## Mobile impact

M4 (apiaries & hives), M5 (QR), M6 (hive detail).
