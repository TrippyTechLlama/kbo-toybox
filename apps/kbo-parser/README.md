# KBO parser

Script to load KBO Open Data CSV's into Postgres with staging + transforms. Files expected in `apps/kbo-parser/files` (already present: code, enterprise, establishment, branch, denomination, address, contact, activity, meta).

## Waarom TEXT voor IDs
EnterpriseNumber, EstablishmentNumber en Branch Id bevatten punten en leading zeros; sla ze altijd als `text` op.

## Vereisten
- PostgreSQL 14+
- Node 18+
- Packages: `pg`, `pg-copy-streams` (installed in this workspace)

## Snelstart
1) Zorg dat Postgres draait (bijv. `docker compose up -d db`).  
2) Zet `DATABASE_URL` (of gebruik default `postgres://kbo:kbo@localhost:5432/kbo`).  
3) Run import:  
```bash
pnpm --filter kbo-parser install   # first time, if not yet installed
pnpm --filter kbo-parser run import   # let op: gebruik 'run' om de script aan te roepen
```
4) De script maakt schemas/tables, importeert CSV's via COPY, en draait transforms naar final tables.

## Wat de script doet
- Maakt schemas `kbo_stg` (staging) en `kbo` (final).
- Maakt final tables: code, enterprise, establishment, branch, denomination, address, contact, activity, extract_meta.
- Maakt staging tables met exact de CSV headers.
- COPY per CSV uit `apps/kbo-parser/files`.
- Transforms van staging naar final met upserts en datum parsing (`DD-MM-YYYY`).
- Laadt `NACEBEL_2025.csv` als categorie `NACEBEL_2025` in `kbo.code` (NL/FR/DE/EN labels).
- Print tellingen voor enterprise, establishment, address, contact, activity.

## Handige SQL checks (psql)
```sql
select count(*) from kbo.enterprise;
select count(*) from kbo.establishment;
select count(*) from kbo.address;
select count(*) from kbo.contact;
select count(*) from kbo.activity;

select * from kbo.enterprise where enterprise_number = '0200.065.765';
```

## Bestanden
- `import.js` — hoofdscript
- `files/` — bron CSV's (code, enterprise, establishment, branch, denomination, address, contact, activity, meta)

Wil je extra indexen/queries voor een snelle search endpoint? Laat weten.
