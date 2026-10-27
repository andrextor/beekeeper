# Invite codes last 30 days — plan

Spec: none (trivial change, Iván 2026-10-26: "el código de invitado puede durar 30 días"). Branch: `feat/invite-30-days` from `main`. Version: 0.19.0.

## Why

Owners send the code by WhatsApp and the other person often installs the app days later; 7 days runs out. 30 days keeps the code single use, hashed and revocable, so the risk does not change: a 40-bit code with no read access to its hash is not guessable in a month.

## Tasks

1. **`feat(db): invite codes last 30 days`**
   - `supabase/migrations/20261031090000_invite_30_days.sql`: `create or replace function public.create_invite` copied from `20261025120300_tenancy_rpcs.sql` with `now() + interval '30 days'`. Codes already issued keep their 7 days.
   - `supabase/tests/invites.test.sql`: one more test, `expires_at` of a new code is between 29 and 31 days from now (plan +1).
   - Check: `pnpm db:migrate && pnpm check:quick`.
2. **`docs: invite codes last 30 days`**
   - `docs/api.md` `accept_invite` row: "Single use, 30 days".
   - `admin/manual.html`: the three "vence en 7 días" become "30 días".
   - `CHANGELOG.md` under `[Unreleased]` → `Changed`.
3. **`chore(release): 0.19.0`**.

## Mobile contract

Not breaking: the app already shows the server's `expires_at` ("Vence el …") and the WhatsApp message uses it too.

## Out of scope here (mobile, `beekeeper-mobile`)

"Compartir por WhatsApp" today opens Android's share sheet (`Share.share`), where WhatsApp is one option. Opening WhatsApp directly is a mobile change: `Linking.openURL('whatsapp://send?text=…')` with a fallback to the share sheet when WhatsApp is not installed. On a computer, `https://wa.me/?text=…` opens WhatsApp Web, but only the app creates codes; the admin panel does not. Prompt for the mobile session below.

## How Iván tests it

1. `pnpm db:migrate && pnpm check:quick` passes.
2. In the app, create an invite: "Vence el" shows a date 30 days ahead.
