# Landak Apiario · backend y panel admin

Backend (Supabase) y panel de administración de **Landak Apiario**, una app gratuita para que los apicultores gestionen apiarios, colmenas y revisiones, incluso sin señal. La app Android vive en [`beekeeper-mobile`](https://github.com/andrextor/beekeeper-mobile).

- Contrato de la API para las apps: [`docs/api.md`](docs/api.md)
- Orden de módulos: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Reglas para agentes y flujo de trabajo: [`AGENTS.md`](AGENTS.md)

## Requisitos

- Node 22 y pnpm (`corepack enable`)
- Docker Desktop encendido (Supabase local corre en contenedores)

## Arrancar

```bash
pnpm install
pnpm db:start     # Supabase local: API :54321, Studio :54323, Mailpit :54324
pnpm db:reset     # aplica todas las migraciones + seed desde cero
pnpm test:db      # tests pgTAP (RLS y RPCs)
pnpm lint         # Biome
pnpm ci:check     # todo lo anterior
pnpm db:stop
```

Usuarios de prueba (seed): `owner@landak.test`, `reviewer@landak.test`, `other@landak.test` y `admin@landak.test`, todos con la contraseña `landak-2026`.

No se envían correos (no hay dominio todavía). Si alguien olvida su contraseña:

```bash
SUPABASE_URL=… SUPABASE_SECRET_KEY=… scripts/reset-password.sh correo@ejemplo.com
```

Si cambias `supabase/config.toml`, reinicia con `pnpm db:stop && pnpm db:start` (`db:reset` no recarga la configuración de Auth).
