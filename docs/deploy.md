# Despliegue del backend (Supabase)

Proyecto remoto `landak-apiario`, plan gratis, región `us-east-1`, ref `dhacyrwngqegqjffpten`.
URL de la API: `https://dhacyrwngqegqjffpten.supabase.co`. El entorno de desarrollo es el stack local; no hay staging remoto.

## Dónde vive cada clave

| Valor | Dónde está | Quién lo usa |
|-------|-----------|--------------|
| URL de la API y **publishable key** (`sb_publishable_…`) | Dashboard → Project Settings → API Keys | La app y el panel. No es secreta: RLS protege los datos |
| **Secret key** (`sb_secret_…`) | Dashboard → API Keys y el gestor de contraseñas de Iván | Solo `scripts/reset-password.sh`, en la máquina de Iván. Salta RLS |
| Contraseña de la base | Gestor de contraseñas | `supabase link` y `db push` |
| Cadena de conexión (Session pooler, con la contraseña) | Secreto `SUPABASE_DB_URL` de GitHub | Solo el backup. Llega a esta base y a nada más |
| Token de acceso de Supabase | Solo el llavero del Mac (`supabase login`) | El CLI. Controla toda la cuenta: nunca en GitHub |
| Frase del backup | Gestor de contraseñas y el secreto `BACKUP_PASSPHRASE` de GitHub | Cifrar y abrir los backups. Sin ella un backup no se puede abrir |

La secret key, la contraseña de la base y el token nunca van al repositorio, a una variable de la app ni a un chat.

## Puesta en marcha (una vez)

1. **Proyecto**: creado el 2026-10-25 en `us-east-1`; desde Colombia el tráfico sale por Miami y Virginia suele responder más rápido que São Paulo. La región no se puede cambiar.
2. **Sesión del CLI**, en una terminal propia (pide navegador):
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref dhacyrwngqegqjffpten   # pide la contraseña de la base
   ```
3. **Esquema**: `pnpm exec supabase db push`. Sube todas las migraciones; el seed nunca se corre en el remoto.
4. **Fotos**: el bucket `hive-photos` lo crea una migración. En Storage debe aparecer como privado.
5. **Auth** (Authentication → Sign In / Providers → Email): proveedor de email activo, **Confirm email apagado**, contraseña mínima de 8, registros activos. En URL Configuration: Site URL = la URL del panel (D2) y `landak://` en Redirect URLs.
6. **Primer admin**: crea tu cuenta (desde la app o Authentication → Add user, marcando auto-confirm) y en el SQL Editor:
   ```sql
   update public.profiles set is_platform_admin = true where email = 'tu-correo@ejemplo.com';
   ```
7. **Secretos de GitHub** (Settings → Secrets and variables → Actions → Secrets): `SUPABASE_DB_URL` (Dashboard → Connect → Session pooler, con `[YOUR-PASSWORD]` reemplazado por la contraseña de la base) y `BACKUP_PASSPHRASE` (una frase larga nueva).

## Subir una migración nueva

Después de mergear el release a `main`:

```bash
git switch main && git pull
pnpm exec supabase db push
```

`db push` solo aplica las migraciones que el remoto no tiene y pide confirmación antes de hacerlo.

## Backups

`.github/workflows/backup.yml` corre los lunes a las 07:00 UTC (y a mano en Actions → Backup → Run workflow). Guarda roles, esquema y datos cifrados con `gpg` como artefacto por 90 días: el repositorio es público y cualquier usuario de GitHub puede descargar sus artefactos. Las fotos no tienen backup en V1.

GitHub apaga los workflows programados de un repositorio público tras 60 días sin commits; si pasa, se reactiva en Actions.

Restaurar en un proyecto vacío:

```bash
gpg -d backup.tar.gz.gpg | tar -xz        # pide la frase del backup
psql "$DB_URL" -f backup/roles.sql
psql "$DB_URL" -f backup/schema.sql
psql "$DB_URL" -c 'set session_replication_role = replica' -f backup/data.sql
```

`DB_URL` es la cadena de conexión del proyecto de destino (Dashboard → Connect → Session pooler); se escribe en la terminal, nunca en un archivo del repositorio.

## Proyecto pausado

Un proyecto gratis se pausa tras 7 días sin uso. Se restaura en el Dashboard con **Restore project** (unos minutos); los datos no se pierden.

## Recuperar una contraseña

No se envían correos, así que la contraseña se cambia a mano en la máquina de Iván:

```bash
SUPABASE_URL=https://dhacyrwngqegqjffpten.supabase.co SUPABASE_SECRET_KEY=… scripts/reset-password.sh correo@ejemplo.com
```

Pide la nueva contraseña sin mostrarla; compártela por un canal privado.
