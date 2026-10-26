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
3. **Esquema**: `pnpm exec supabase db push --linked`. Sube todas las migraciones; el seed nunca se corre en el remoto.
4. **Fotos**: el bucket `hive-photos` lo crea una migración. En Storage debe aparecer como privado.
5. **Auth** (Authentication → Sign In / Providers → Email): proveedor de email activo, **Confirm email apagado**, contraseña mínima de 8, registros activos. En URL Configuration: Site URL = la URL del panel (D2) y `landak://` en Redirect URLs.
6. **Primer admin**: crea tu cuenta (desde la app o Authentication → Add user, marcando auto-confirm) y en el SQL Editor:
   ```sql
   update public.profiles set is_platform_admin = true where email = 'tu-correo@ejemplo.com';
   ```
7. **Secretos de GitHub** (Settings → Secrets and variables → Actions → Secrets): `SUPABASE_DB_URL` (Dashboard → Connect → Session pooler, con `[YOUR-PASSWORD]` reemplazado por la contraseña de la base) y `BACKUP_PASSPHRASE` (una frase larga nueva).

## Panel de administración (Vercel)

URL: **https://beekeeper-one.vercel.app** (también es la Site URL de Supabase Auth).

Proyecto de Vercel Hobby conectado a `andrextor/beekeeper`: cada merge a `main` publica el panel solo y cada PR tiene su URL de prueba (protegida con el login de Vercel de Iván, contra el mismo backend de producción; el panel solo lee).

Conexión, una vez (Vercel → Add New → Project):

1. Importar `andrextor/beekeeper`.
2. **Root Directory**: `admin`. Framework: Vite (lo detecta solo). Build y output por defecto (`pnpm build`, `dist`).
3. **Environment Variables** (Production y Preview):
   - `VITE_SUPABASE_URL` = `https://dhacyrwngqegqjffpten.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = la `sb_publishable_…`. Nunca la `sb_secret_…`: Supabase la rechaza en un navegador y habría que rotarla.
4. Deploy. Con la URL `https://….vercel.app`: Supabase → Authentication → URL Configuration → Site URL.

`admin/vercel.json` manda toda ruta a `index.html` (recargar `/apicultores` no da 404) y fija los encabezados de seguridad. Su `Content-Security-Policy` nombra el proyecto `dhacyrwngqegqjffpten`: si el backend cambia de proyecto, hay que cambiarlo ahí también o el panel no podrá conectarse.

## Crear cuentas desde el panel (A6)

Los admins de plataforma crean apicultores, revisores y otros admins en Usuarios → Nuevo usuario. Lo hace la Edge Function `admin-create-user`, que usa la clave secreta que Supabase le inyecta: la clave nunca sale de Supabase.

Publicar las funciones (la primera vez y cada vez que cambien; las dos comparten `supabase/functions/_shared/`, así que si cambia ese archivo se publican las dos), en tu terminal después de mergear:

```bash
pnpm exec supabase functions deploy admin-create-user
pnpm exec supabase functions deploy admin-update-user
```

Desde A7 la página de cada usuario (Usuarios → el correo) cambia nombre, correo y contraseña, sus fincas y su rol, el permiso de administrador, y **desactiva** o reactiva la cuenta. No hay borrado: desactivar es borrar, porque el historial guarda quién hizo cada cosa. Cambiar la contraseña no cierra las sesiones que la persona ya tenga abiertas, y una cuenta desactivada conserva hasta una hora la sesión que tenía.

Si una persona debe desaparecer del todo (un pedido legal), es una tarea manual con Iván: reemplazar su nombre y correo en `profiles` y en Authentication → Users por datos anónimos y dejarla desactivada; nunca borrar la fila, porque el historial apunta a ella.

Quién es admin: Usuarios muestra la insignia **Admin**. Para quitarle el permiso a alguien, en el SQL Editor:

```sql
update public.profiles set is_platform_admin = false where email = 'correo@ejemplo.com';
```

Comprobar que un no-admin es rechazado (con la sesión de esa cuenta; debe responder `not_platform_admin`):

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/admin-create-user" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" -d '{}'
```

`ACCESS_TOKEN` es el token de sesión de esa cuenta (DevTools → Application → Local Storage → `sb-…-auth-token` → `access_token`); se pega en la terminal, nunca en un archivo.

## Subir una migración nueva

Después de mergear el release a `main`:

```bash
git switch main && git pull
pnpm exec supabase db push --linked
```

`--linked` porque el CLI pronto apuntará a la base local por defecto. `db push` solo aplica las migraciones que el remoto no tiene y pide confirmación antes de hacerlo.

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

No se envían correos. Lo normal es el panel: Usuarios → la persona → Contraseña (A7). Si el panel no está disponible, en la máquina de Iván:

```bash
SUPABASE_URL=https://dhacyrwngqegqjffpten.supabase.co SUPABASE_SECRET_KEY=… scripts/reset-password.sh correo@ejemplo.com
```

Pide la nueva contraseña sin mostrarla; compártela por un canal privado.
