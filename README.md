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

Los códigos de ingreso en local no se envían: se leen en Mailpit (http://127.0.0.1:54324).
