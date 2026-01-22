# kbo-toybox

Full-stack starter that pairs a NestJS API with a Next.js app router frontend, managed via pnpm workspaces.

This is a proof-of-concept built in ~2 hours with modern AI tooling (ChatGPT + Codex) to show what's possible; for demo purposes only. Focused on Belgian KBO data; expect rough edges (not production-clean), it's just for fun.

License: MIT (see LICENSE).

## Project structure
- `apps/server`: NestJS HTTP API (listens on port 4000 by default)
- `apps/web`: Next.js application (app router, served on port 3000)
- `apps/kbo-parser`: scripts to import KBO open data CSV's into Postgres (staging + transforms)

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

## KBO open data & imports
- Download the KBO CSV's yourself from the official portal: https://kbopub.economie.fgov.be/kbo-open-data/login?lang=nl
- Place them under `apps/kbo-parser/files/` (the repo ignores everything there except `NACEBEL_2025.csv`).
- Run `pnpm kbo:import` to create staging/final tables and load data into Postgres (needs `DATABASE_URL` in `apps/server/.env`).

## Postgres with Docker Compose
- Bring up Postgres: `docker compose up -d db`
- Default credentials: user `kbo`, password `kbo`, database `kbo`
- Connection string example: `postgres://kbo:kbo@localhost:5432/kbo`
- A sample env file for the API lives at `apps/server/.env.example`; copy to `.env` and adjust as needed.

## Run locally (quick)
- `pnpm install`
- Ensure Postgres is running (e.g. `docker compose up -d db`) and set `DATABASE_URL` in `apps/server/.env`
- (Optional) download KBO CSV's into `apps/kbo-parser/files/` and run `pnpm kbo:import`
- Start both apps: `pnpm dev` (web on http://localhost:3000, API on http://localhost:4000)
- If needed, set `API_URL` in `apps/web/.env.local` to point the frontend at your API

## Screenshots
*(Replace with your own)*  
![Companies page](docs/screenshots/companies.png)  
![Detail page](docs/screenshots/detail.png)
