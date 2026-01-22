# kbo-toybox

Full-stack starter that pairs a NestJS API with a Next.js app router frontend, managed via pnpm workspaces.

## Project structure
- `apps/server`: NestJS HTTP API (listens on port 4000 by default)
- `apps/web`: Next.js application (app router, served on port 3000)

## Getting started
1. Install dependencies: `pnpm install`
2. Run both dev servers: `pnpm dev` (Next.js at http://localhost:3000, API at http://localhost:4000)
3. The web app fetches the API from `API_URL` (default `http://localhost:4000`). Override in `apps/web/.env.local` with `API_URL=<your-api-url>` if needed.
4. The API reads env vars from `apps/server/.env` (falling back to root `.env`). Set `DATABASE_URL` there.

## Useful scripts
- `pnpm dev` — start Next.js and NestJS together with live reload
- `pnpm dev:web` / `pnpm dev:server` — run each app individually
- `pnpm build` — build both projects
- `pnpm start` — start the built Next.js app

## Postgres with Docker Compose
- Bring up Postgres: `docker compose up -d db`
- Default credentials: user `kbo`, password `kbo`, database `kbo`
- Connection string example: `postgres://kbo:kbo@localhost:5432/kbo`
- A sample env file for the API lives at `apps/server/.env.example`; copy to `.env` and adjust as needed.
