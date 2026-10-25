# B4 · Inspections, events and field notes — spec

Date: 2026-10-25 · Branch: `feat/b4-inspections-events` · Status: **awaiting OK** · Version: 0.4.0

## Problem

The core of the product: in the field, an owner or a reviewer records what they saw in a hive (structured fields, the original dictation, quick notes) and what they did (feeding, treatment, harvest…). Records are created offline, must never be lost or duplicated, and must not turn a doubtful observation into a confirmed fact.

## Decisions

### Who writes

| Action | owner | reviewer | platform admin |
|--------|-------|----------|----------------|
| Create inspection / event | yes | yes | no |
| Edit or soft-delete | any in the org | only rows they created | no |

### `inspections`

Common columns (B3) plus:

| Column | Type | Rule / meaning |
|--------|------|----------------|
| `hive_id` | uuid → hives | same organization (`check_parent`) |
| `inspected_at` | timestamptz | not null; ≤ now + 1 day (phone clocks drift) |
| `inspected_by` | uuid → profiles | default `auth.uid()`; must be a member of the organization (`not_member`) |
| `source` | text | `manual`, `voice` |
| `transcript` | text | ≤ 10000; the original dictation, never rewritten by the server |
| `population_strength` | smallint | 1..5 (1 very weak, 5 very strong) |
| `temperament` | smallint | 1..5 (1 calm, 5 very defensive) |
| `queen_seen`, `eggs_seen`, `larvae_seen` | text | `yes`, `no`, `not_checked` |
| `queen_cells` | text | `none`, `swarm`, `supersedure`, `not_checked` |
| `brood_frames`, `honey_frames`, `pollen_frames` | smallint | 0..40 |
| `brood_pattern` | text | `compact`, `spotty`, `not_checked` |
| `stores` | text | `low`, `ok`, `high`, `not_checked` |
| `varroa_method` | text | `alcohol_wash`, `sugar_roll`, `sticky_board`, `visual` |
| `varroa_count` | integer | ≥ 0 |
| `varroa_sample_size` | integer | > 0; `varroa_count` and `varroa_method` both set or both null; sample size required for wash/roll |
| `pests` | text[] | subset of `wax_moth`, `small_hive_beetle`, `ants`, `wasps`, `mice`, `other` |
| `disease_signs` | text[] | subset of `chalkbrood`, `sacbrood`, `foulbrood_signs`, `deformed_wings`, `dysentery`, `dead_bees`, `other` — **observed signs, not diagnoses** |
| `weather` | text | `sunny`, `cloudy`, `rain`, `windy` |
| `temperature_c` | numeric(4,1) | −20..60 |
| `attention_level` | text | `none`, `soon`, `urgent` |
| `planned_actions` | text[] | subset of `feed`, `treat`, `change_queen`, `add_super`, `remove_super`, `harvest`, `split`, `merge`, `move`, `check_queen`, `other` — work left to do on this hive (detail in `notes`). The hive's open tasks are the `planned_actions` of its **latest** non-deleted inspection |
| `next_inspection_on` | date | |
| `notes` | text | ≤ 4000 |

`null` means "not recorded"; `not_checked` means "looked for it but could not check". No field is required except `hive_id`, `inspected_at`, `source`: a half-filled inspection saved in the rain is better than none.

Indexes: `(organization_id, updated_at)`, `(hive_id, inspected_at desc)` for the timeline, GIN on `planned_actions` for "colmenas por alimentar" style filters.

View `hive_open_tasks` (`security_invoker = true`): one row per hive with `hive_id`, `organization_id`, `planned_actions`, `inspected_at` of the latest non-deleted inspection, used by the admin and, later, by an app filter.

### `hive_events`

Common columns plus `hive_id`, `inspection_id` (nullable, same hive — `parent_mismatch`), `type`, `occurred_at`, `details jsonb not null default '{}'`.

| `type` | `details` shape (validated in the app; the database checks only what is marked *db*) |
|--------|--------------------------------------------------------|
| `note` | `{ text: string (db: required, ≤ 2000), source: 'voice' \| 'text', slot?: number }` — the field-mode "Nota 1, Nota 2…" buttons |
| `feeding` | `{ feed: 'sugar_syrup' \| 'fondant' \| 'pollen_patty' \| 'honey' \| 'other', amount?: number, unit?: 'l' \| 'kg' \| 'g', ratio?: '1:1' \| '2:1' }` |
| `treatment` | `{ product: string, active_ingredient?: string, dose?: string, method?: 'strip' \| 'drip' \| 'vapor' \| 'dust' \| 'other', withdrawal_days?: number, ends_on?: date }` |
| `queen_change` | `{ queen_year?: number, queen_color?: string, queen_origin?: string, reason?: 'failing' \| 'aggressive' \| 'lost' \| 'planned' }` |
| `harvest` | `{ product: 'honey' \| 'pollen' \| 'propolis' \| 'wax', kg: number, supers_taken?: number }` |
| `split` | `{ new_hive_id?: uuid }` |
| `merge` | `{ merged_hive_id?: uuid }` |
| `transfer` | `{ from_apiary_id?: uuid, to_apiary_id?: uuid }` |
| `swarm` | `{ captured: boolean, new_hive_id?: uuid }` |
| `loss` | `{ cause?: 'starvation' \| 'pests' \| 'disease' \| 'absconding' \| 'pesticide' \| 'unknown' }` |
| `qr_relabel` | `{ old_qr_code: string, new_qr_code: string }` |

*db* checks: `type` in the list, `jsonb_typeof(details) = 'object'`, `pg_column_size(details) ≤ 8192`, `note` has a `text` string. The shapes live in `docs/api.md` and in the app's Zod schemas; a new optional key does not need a migration.

Events do not change the hive by themselves (a `loss` does not set `hives.status`): the owner's app updates the hive in the same outbox batch, a reviewer's app shows "Avisa al propietario" (explicit, no hidden write a reviewer is not allowed to do). The event and the hive update are two upserts, not one transaction: if the hive update is refused, the event stays and the hive update shows "Requiere atención" in the app. Accepted in V1 (`ponytail:` single RPC `record_event_with_hive_update` if it causes real confusion).

Indexes: `(organization_id, updated_at)`, `(hive_id, occurred_at desc)`.

### RLS

| Table | select | insert | update |
|-------|--------|--------|--------|
| `inspections`, `hive_events` | `organization_id in (select private.my_organization_ids()) or (select private.is_platform_admin())` | `is_member(organization_id)` | `has_role(organization_id, 'owner') or created_by = auth.uid()` (with check `is_member`) |

### Hive timeline RPC

`hive_timeline(p_hive_id uuid, p_before timestamptz default null, p_limit int default 30)` returns inspections and events merged by date (`kind` `'inspection' | 'event'`, `id`, `at`, `created_by`, `author_name`, `row jsonb` = `to_jsonb()` of the full row, so clients build their own Spanish summary from the same columns they store locally), `security invoker` so RLS applies. Used by the admin (A5) and by the app when online for hives it has not synced. The app's offline timeline reads its local tables instead.

## Tests

`inspections_events.test.sql`: reviewer creates inspection and note; reviewer cannot edit the owner's inspection, can edit their own; owner edits anyone's; inspection on another organization's hive → `parent_mismatch`; `inspected_by` set to a non-member → `not_member`; unknown pest value refused; unknown `planned_actions` value refused; `hive_open_tasks` returns only the latest inspection's actions and respects RLS; varroa count without method refused; `note` without text refused; event linked to an inspection of another hive refused; upsert twice with the same id → one row, second write wins; platform admin cannot insert; `hive_timeline` returns both kinds ordered and respects RLS.

## Out of scope

Voice parsing (mobile M8), reminders from `next_inspection_on` (later), treatment withdrawal alerts (later), statistics.

## Mobile impact

M6 (timeline), M7 (field-mode inspection + notes), M8 (voice), M10 (events).
