# A6 · Platform admin creates beekeepers and reviewers, and prints reports — spec

Date: 2026-10-25 · Branch: `feat/admin-create-users` · Status: **approved 2026-10-25** · Version: 0.14.0

## Problem

Until the app ships (M1–M12) nobody can sign up, create a farm or accept an invite. Iván wants to onboard the pilot himself from the panel:

- a **beekeeper**: account + their farm (organization), as its owner;
- a **reviewer**: account + membership in an existing farm, as reviewer;
- another **platform admin**: account with `is_platform_admin = true`, no farm (added 2026-10-25);

with the password set right away, so the person can sign in without email (the project sends none).

## Decision

**Only platform admins** (`profiles.is_platform_admin`) can create accounts, including other platform admins. Beekeepers (owners) and reviewers can never create accounts: not from the app, not by calling the function or the SQL directly. The panel stays read-only for everything else; this is the one write it gets.

Owners keep inviting reviewers with invite codes (B2) once the app exists: a code never creates an account, it only gives an existing account access to one farm. Removing that is a separate decision, not part of A6.

### Why an Edge Function

Creating an Auth user with a password and a confirmed email needs the Auth admin API, which needs the secret key. The secret key can never reach a browser (D1: Supabase refuses it there). An Edge Function runs inside Supabase, where the platform injects the key and it never leaves. This is the case CLAUDE.md keeps Edge Functions for: SQL cannot create Auth users.

Rejected:

- **Insert into `auth.users` from SQL**: unsupported by Supabase, skips Auth's own hashing and identities, breaks on the next Auth upgrade.
- **A script like `scripts/reset-password.sh`**: works today, but Iván asked for the panel.
- **Invite codes from the panel**: they need the app to redeem them, which does not exist yet.

### The function: `admin-create-user`

`POST {SUPABASE_URL}/functions/v1/admin-create-user`, called by the panel with `supabase.functions.invoke`, which sends the signed-in admin's session token.

**Gateway.** `verify_jwt = false` in `supabase/config.toml`: with the new API keys Supabase recommends verifying in the function, and step 1 does it against Auth itself, which is authoritative (a revoked session fails there, not at a gateway cache).

**Keys.** The function reads `SUPABASE_URL` and the secret key from the platform-injected environment (`SUPABASE_SECRET_KEYS` → `default`, falling back to `SUPABASE_SERVICE_ROLE_KEY`, which the local stack provides). Nothing is configured by hand; no key is added to the repo, Vercel or GitHub.

Steps, in order; the first failure answers and stops:

1. **Preflight.** `OPTIONS` answers the CORS headers (`Access-Control-Allow-Origin: *`, headers `authorization, x-client-info, apikey, content-type`, method `POST`). `*` is safe: the request carries a bearer token, not cookies. Any method other than `POST`/`OPTIONS` → 405.
2. **Caller.** Bearer token from `Authorization`; missing → 401 `not_signed_in`. `auth.getUser(token)` with the secret-key client; invalid or expired → 401 `not_signed_in`. Read `profiles.is_platform_admin` for that user; not admin → 403 `not_platform_admin`.
3. **Input.** JSON body, validated by a type guard (no `any`):

   | Field | Rule | Error code |
   |-------|------|-----------|
   | `kind` | `beekeeper`, `reviewer` or `admin` | `invalid_kind` |
   | `email` | trimmed, lowercased, `x@y.z` shape, ≤ 254 | `invalid_email` |
   | `password` | at least 8 characters and at most 72 bytes in UTF-8 (Auth's minimum; bcrypt counts bytes) | `invalid_password` |
   | `display_name` | trimmed, 1–80 (the `profiles` check) | `invalid_name` |
   | `organization_name` | beekeeper only: trimmed, 1–120 (the `create_organization` rule) | `invalid_organization_name` |
   | `organization_id` | reviewer only: a UUID | `invalid_organization` |

   Not JSON or not an object → 400 `invalid_body`. Every validation error → 400.
4. *(Removed by the code review, R9: a pre-check outside the lock was a second copy of step 6's check and could not prevent the race; step 6 checks under the lock and step 6's rollback handles a missing farm.)*
5. **Account.** `auth.admin.createUser({ email, password, email_confirm: true })`. Email already registered (Auth `email_exists`) → 409 `email_taken`; an email or password Auth refuses (`email_address_invalid`, `validation_failed`, `weak_password`) → 400 `invalid_email` / `invalid_password`. The `on_auth_user_created` trigger makes the `profiles` row as for any sign-up.
6. **Membership.** One RPC, `public.admin_provision_member` (below). On any error the function **deletes the Auth user it created in step 5** (no half-made accounts; the profile goes with it by `on delete cascade`) and answers with the RPC's code (`not_platform_admin` → 403, `organization_not_found` → 404, anything else → 500 `server_error`). If that delete fails too, the function logs the user id so Iván can delete it in Authentication → Users.
7. **Answer.** 200 `{ "user_id": "…", "organization_id": "…" | null }`. The password is never echoed, logged or stored outside Auth.

Errors always answer `{ "error": "<code>" }`, never Auth's or Postgres' English text. Unexpected exceptions → 500 `server_error`, with the detail only in the function logs (no password in them: the body is never logged).

### SQL: `public.admin_provision_member`

```
admin_provision_member(
  p_actor_id uuid,          -- the admin from step 2
  p_user_id uuid,           -- the account from step 5
  p_display_name text,
  p_role text,              -- 'owner' | 'reviewer' | 'admin'
  p_organization_id uuid,   -- reviewer
  p_organization_name text  -- owner
) returns uuid              -- the organization id; null for an admin
```

- `security definer`, `set search_path = ''`, fully qualified names.
- `execute` revoked from `public`, `anon` and `authenticated`, granted **only to `service_role`**. No client can call it, admin or not; PostgREST answers "permission denied".
- Checks again that `p_actor_id` is a platform admin (`not_platform_admin` otherwise): the admin rule lives in SQL too, where pgTAP can test it.
- Sets `profiles.display_name` for `p_user_id`.
- `owner`: inserts `organizations (id = gen_random_uuid(), name, created_by = p_user_id)` and the `owner` membership. The organization is the beekeeper's own from the start, exactly as if they had created it in the app.
- `reviewer`: `private.lock_organization(p_organization_id)` **first** (before the admin check, which reads the actor's profile `for share`), then reads it; missing or `deleted_at` set → `organization_not_found`. Inserts the `reviewer` membership.
- `admin`: sets `profiles.is_platform_admin = true`; no organization, no membership; returns null.
- Any other role → `invalid_role`.
- Errors in the house style: `raise exception '<Spanish>' using errcode = 'P0001', detail = '<code>'`.

### Panel

- **Usuarios** gets a **Nuevo usuario** button (Lucide `UserPlus`) next to the search → `/usuarios/nuevo`.
- `/usuarios/nuevo`, breadcrumbs Usuarios › Nuevo usuario, one card:
  - **Tipo**: Segmented, Apicultor (default) / Revisor / Admin. The kind lives in the link (`?tipo=revisor`, `?tipo=admin`), like the other views.
  - Admin shows a warning before the button: "Podrá ver todos los apicultores y crear usuarios, también otros administradores."
  - **Nombre** (required), **Correo** (required, `type="email"`, `autocomplete="off"`).
  - **Contraseña** (required, min 8): show/hide like sign-in, plus **Generar**, which fills a random 12-character password from `crypto.getRandomValues` over letters and digits without look-alikes (`0 O 1 l I`), and shows it.
  - Apicultor: **Nombre de la finca** (required).
  - Revisor: **Finca**: a search by name over live farms (`organizations` where `deleted_at is null`, 10 results); picking one shows it as chosen with a "Cambiar" link.
  - **Crear usuario** button, disabled while sending; the form validates the same rules as the function before sending.
- **Done**: the form is replaced by a card: "Usuario creado", the email and the password each with a copy button, the text "Compártela por un canal privado. No se vuelve a mostrar.", links **Ver apicultor** (the farm; not for an admin) and **Crear otro**. The users, beekeepers and dashboard queries are invalidated so the lists show the new account.
- **Errors** under the button, in Spanish, by code:

  | Code | Message |
  |------|---------|
  | `email_taken` | Ya existe una cuenta con ese correo. |
  | `organization_not_found` | Esa finca ya no existe. Elige otra. |
  | `not_platform_admin`, `not_signed_in` | Tu sesión no tiene permiso para crear usuarios. Vuelve a ingresar. |
  | `invalid_*` | Revisa los datos del formulario. |
  | no connection | No hay conexión. Revisa tu internet e inténtalo de nuevo. |
  | anything else | No pudimos crear el usuario. Inténtalo de nuevo. |

  Never technical text (no codes, no English).

## Print and save as PDF

Iván asked (2026-10-25) for a print button that lets the reader save a report as PDF.

**Decision: the browser's own print, no library.** A **Imprimir** button calls `window.print()`; the browser's print dialog has "Guardar como PDF" (Chrome, Edge, Safari, Firefox), so the PDF is downloaded without any code or dependency of ours. A print stylesheet makes the page read as a report.

Rejected: generating the PDF in JavaScript (`jspdf`, `react-pdf`, `html2canvas`): a new dependency of hundreds of KB, its own layout to maintain, and worse text (often an image). A server-side PDF: needs a server or an Edge Function with a headless browser, far beyond the free tier's spirit.

Where the button goes (top right of the page title, `print:hidden`):

| Page | What prints |
|------|-------------|
| Apicultor | name, sign-up date, counts, and the view on screen (Apiarios or Personas) |
| Apiario | its details and its hive table (the filter on screen: Activas or Todas) |
| Colmena | its details and the view on screen: Historial (every loaded item, inspections **expanded**) or Fotos |

- The button opens every `<details>` on the page before printing and closes the ones it opened afterwards, so inspections print with all their fields.
- Historial prints what is loaded. To include older items, "Cargar más" first; the printed page ends with "Mostrando los N registros cargados." when more exist, so the reader knows it is not the whole history.
- A print-only line under the title: "Impreso el <fecha y hora>".

Print stylesheet (`admin/src/styles/theme.css`, `@media print`):

- Always the light palette, even in dark mode; white page, black text; no glows, no blur, no shadows, no animations.
- Sidebar, top bar, buttons, search, pagination, the Segmented control and the theme toggle hidden (`print:hidden`); the content uses the full page width.
- Cards become a thin grey border; a card, a timeline item and a table row never split across pages (`break-inside: avoid`).
- Links print as plain text.

## Security constraints

- The secret key stays in the Supabase function runtime. The panel and Vercel keep only the URL and the publishable key.
- Two admin checks: the function (before anything is created) and the SQL function (in the same transaction as the write). The SQL function is unreachable from `anon` and `authenticated`.
- Passwords travel only in the HTTPS request body; never logged, echoed or stored outside Auth.
- An admin account can now create accounts, other admins included, so a stolen admin session can mint admins. Accepted for the pilot (Iván is the only admin and the panel is read-only otherwise); the flag is otherwise still set by SQL only, and `docs/deploy.md` says how to remove an admin (`update public.profiles set is_platform_admin = false …`) and to check the Usuarios list for the Admin badge. Removing admins from the panel is out of scope.
- CLAUDE.md, AGENTS.md and `.claude/rules/tenancy.md` change from "the admin writes nothing" to "the admin writes nothing except creating accounts through `admin-create-user`".
- `.claude/rules/tenancy.md` "Access comes from creating an organization or from an invite code" gains "or from a platform admin (A6)".

## Impact on the mobile contract

None. An account made here is identical to one made in the app: same `auth.users` row, profile, organization and membership, same RLS. `docs/api.md` lists the function under Admin as admin-only, with its codes, so the app never calls it.

## Free tier

One function invocation per account created; the free plan allows 500,000 a month. No storage or egress worth counting.

## Integration review

- No list walked whole: the farm picker asks for 10 matches at a time.
- No loop: one request per click, no retries in the function; the panel does not retry a create (a retry could double-create after a timeout; the second attempt gets `email_taken`, which is the honest answer).
- No extra round trips: one function call creates everything.

## Out of scope

Printing the Resumen or the lists, a PDF made without the print dialog, editing or deleting users, adding an existing account to another farm, resetting passwords from the panel (a natural next step that would retire `scripts/reset-password.sh`), forcing a password change on first sign-in, removing owners' invite codes.
