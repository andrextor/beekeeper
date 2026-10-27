# B8 · Read-only role "Observador" (`viewer`) — design

Status: **approved 2026-10-26** (name: Observador) · Version: 0.17.0 · Branch: `feat/b8-viewer-role`

## Problem

Iván (2026-10-26): a farm needs someone who **only reads**: the inspections, how the colonies are doing, the visits, the history. Today there are two roles and both write: `owner` (everything) and `reviewer` (inspections, events, notes, photos). Roadmap default decision 2 ("no pure read-only role in V1") is overturned.

## Decision

A third organization role, code **`viewer`**, shown as **Observador** in Spanish.

- Why "Observador": the original product overview already planned `viewer` / "observador: consulta sin editar". "Auditor" suggests someone who checks and signs off, which this role does not do. Alternatives Iván can pick instead at the OK: *Auditor*, *Consultor*, *Lector*. Only the Spanish label changes; the code stays `viewer`.

| Who | Reads | Writes |
|-----|-------|--------|
| `owner` | whole organization | everything |
| `reviewer` | whole organization | inspections, events, notes, photos; edits only their own |
| **`viewer`** | **whole organization** (apiaries, hives, inspections, events, notes, photos, members) | **nothing** |

- **Reads stay as they are**: `private.my_organization_ids()` already includes every membership, so a viewer reads exactly what a reviewer reads. Pending invites stay owner-only.
- **Writes**: a new helper `private.can_record(org)` = member with role `owner` or `reviewer`. It replaces `private.is_member` in every *write* check: insert and update policies of `inspections`, `hive_events` and `photos`, and the `hive-photos` upload check (`private.can_upload_photo` path predicate). `is_member` keeps its meaning (any role) for reads.
- **Roles accepted**: `organization_members.role` and `organization_invites.role` check constraints add `viewer`; `create_invite`, `set_member_role`, `admin_set_member_role`, `admin_add_member` and `private.require_role_value` accept it. The last-owner rule is unchanged (a viewer is not an owner).
- **Admin (A6/A7)**: `admin-create-user` gets kind `viewer` (account + `viewer` of an existing farm, same as `reviewer`); the panel offers "Observador" in Nuevo usuario, in "Agregar a una finca" and in a role `Select` per membership (replacing the "Hacer revisor / propietario" toggle, which cannot express three roles). `admin_stats` is unchanged (its `reviewers` count stays reviewers).
- **Leaving**: a viewer can leave a farm like anyone else.

## Security constraints

- RLS decides, not the client: a viewer's app hiding buttons is a convenience; the server refuses any write (`42501`), tested for every table and the bucket.
- A viewer cannot invite, change roles, or create apiaries/hives (already owner-only).
- `security definer` helpers set `search_path = ''`, live in `private`, revoke from `public` before granting (`.claude/rules/sql.md`).

## Impact on the mobile contract — **BREAKING**

- `organization_members.role`, `my_memberships()` and the members list can now return `viewer`. The app parses roles with `z.enum(['owner', 'reviewer'])` (`src/features/sync/members.ts`): **an installed APK that meets a viewer fails to parse**, both for the viewer's own memberships and for an owner's Personas list.
- Order: the mobile app ships the new role (M14, its own spec in `beekeeper-mobile`) **before** anyone is given the role. The backend can deploy first: nothing returns `viewer` until a viewer exists.
- M14 in the app: role enum + label "Observador"; hide Nueva revisión, Dictar, Foto, Registrar actividad, notes and edit/delete for viewers; invite and role pickers offer three roles; a viewer's Inicio drops "Tareas" actions but keeps "Para revisar" as reading.
- `docs/api.md` documents the role and the write refusals under **Changed (BREAKING)**.

## Alternatives rejected

- **A flag on `reviewer`** ("read-only reviewer"): two places to check instead of one role; the role is what every policy already reads.
- **Change `is_member` to exclude viewers**: it also gates reads (`can_read`); viewers would lose reading.
- **Per-apiary viewers**: no per-apiary assignment exists for any role in V1 (decision 3).

## Out of scope

- Read-only links without an account (a QR never authorizes).
- Exporting reports for viewers (the admin's print already exists; the app has none).
- The mobile screens themselves: M14 in `beekeeper-mobile`.
