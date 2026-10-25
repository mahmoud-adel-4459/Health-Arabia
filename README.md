# Health Arabia

Medical recruitment platform connecting doctors with healthcare facilities across the GCC, with the platform mediating approvals and hiring.

Status: **Stage 1 (foundation)**. Apps start and respond, but no product pages, authentication, database models, or business workflows exist yet.

## Structure

```
apps/
  web/         Next.js + TypeScript      public website          http://localhost:3000
  dashboard/   React + Vite + TypeScript  dashboards              http://localhost:5173
  api/         NestJS + TypeScript       backend API (/api)      http://localhost:4000/api
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
| `pnpm dev:api` | API on http://localhost:4000/api |
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
