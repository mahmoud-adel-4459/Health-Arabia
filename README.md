# Health Arabia

Medical recruitment platform connecting doctors with healthcare facilities across the GCC, with the platform mediating approvals and hiring.

Status: **Stage 2 (data model)**. Apps start and respond, and the initial Prisma data model and migration exist. No product pages, authentication, or business endpoints exist yet.

Prisma 7 notes: the CLI reads `apps/api/prisma.config.ts` (which loads `apps/api/.env`), and the client is generated into `apps/api/src/generated/prisma` (git-ignored). `pnpm install` regenerates it; after schema changes run `pnpm db:migrate` and then `pnpm db:generate`.

## Structure

```
apps/
  web/         Next.js + TypeScript      public website          http://localhost:3000
  dashboard/   React + Vite + TypeScript  dashboards              http://localhost:5173
  api/         Express + TypeScript      backend API (/api)      http://localhost:4000/api
    prisma/    Prisma schema (PostgreSQL)
docs/          UX audit and project docs
reference/     Figma screenshots used as design reference
docker-compose.yml   Local PostgreSQL
```

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- pnpm 9 (`corepack enable` or `npm i -g pnpm@9`)
- Docker Desktop (for PostgreSQL)

## First-time setup

```bash
pnpm install

# Environment files (development values only; never commit real secrets)
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/dashboard/.env.example apps/dashboard/.env.local

# Database
pnpm db:up          # start PostgreSQL in Docker
pnpm db:generate    # generate the Prisma client
```

On Windows PowerShell, use `Copy-Item` instead of `cp`.

## Running locally

| Command | What it does |
|---|---|
| `pnpm dev` | Run web, dashboard, and api together |
| `pnpm dev:web` | Public website on http://localhost:3000 |
| `pnpm dev:dashboard` | Dashboards on http://localhost:5173 |
| `pnpm dev:api` | API on http://localhost:4000/api (Express, reloads on change via `tsx watch`) |
| `pnpm build` | Build all apps |
| `pnpm typecheck` | Type-check all apps |
| `pnpm db:up` / `pnpm db:down` | Start / stop PostgreSQL |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Create and apply a migration (once models exist) |
| `pnpm db:studio` | Open Prisma Studio |

Health checks:

- `GET http://localhost:4000/api/health` returns `{ "status": "ok" }`
- `GET http://localhost:4000/api/health/db` returns `{ "status": "ok", "database": "up" }` when PostgreSQL is reachable

## Environment variables

| File | Variables |
|---|---|
| `.env` | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` (Docker database) |
| `apps/api/.env` | `PORT`, `DATABASE_URL`, `CORS_ORIGINS` |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DASHBOARD_URL` |
| `apps/dashboard/.env.local` | `VITE_API_URL`, `VITE_WEB_URL` |

`NEXT_PUBLIC_*` and `VITE_*` values are visible in the browser. Keep secrets only in `apps/api/.env`.

## Design and requirements

- Figma source and confirmed business rules: `.cursor/rules/project.mdc`
- UX audit: `docs/ux-audit.md`
- Screen references: `reference/figma/`
"# Health-Arabia" 

## Production build and migration

Never run `pnpm db:migrate` (`prisma migrate dev`), `db:seed:demo` or any seed against production. Use:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm db:migrate:deploy        # applies committed migrations only; DATABASE_URL points at the production database
API_ORIGIN=https://<api-host> corepack pnpm build   # API_ORIGIN is read at build time for the website's /api rewrite
NODE_ENV=production node apps/api/dist/server.js
corepack pnpm --filter @health-arabia/web start     # website (next start)
# apps/dashboard/dist is a static site: serve it from any static host
```

API variables: `DATABASE_URL` (required), `PORT`, `CORS_ORIGINS` (required in production), `PRIVATE_STORAGE_PATH` (required in production: an absolute persistent path outside the Git checkout), `TRUST_PROXY`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (first start only, 12+ characters, no placeholder), `NODE_ENV=production`. Uploaded private files are stored on the API's local disk: back up `PRIVATE_STORAGE_PATH` together with the database.

### Dashboard sign-in and private-file safeguards
- The admin dashboard authenticates only with the API's HttpOnly `ha_admin_session` cookie (`credentials: "include"`); no token is stored in browser storage. The dashboard and the API must share a registrable domain (for example `admin.example.com` and `api.example.com`) so the SameSite=Lax cookie is sent. State-changing requests from origins not listed in `CORS_ORIGINS` are refused.
- `pnpm install` enables the versioned Git hook in `.githooks`, and CI runs the same check (`.github/workflows/private-storage-guard.yml`): new or modified files under `private-storage/` are rejected; deletions are allowed. Run it manually with `pnpm guard:private-storage`.
