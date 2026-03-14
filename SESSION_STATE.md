# Session State
Last updated: 2026-03-14 (autonomous run)

## Current Goal
Build ShipOps — Phase B in progress: shell + dashboard working

## Completed This Session
- Phase A: full monorepo foundation (Turborepo, shared types/enums/validation, Prisma schema, service interfaces, Docker, .env, Next.js skeleton, Clerk auth)
- Phase B Step 1: shadcn/ui installed (17 components)
- Phase B Step 2: Shell layout — Sidebar, Topbar, OmniBar (Cmd+K), dev auth bypass
- Phase B Step 3: Seed data — 10 port calls across all 9 phases, Gulf Coast maritime data
- Phase B Step 4: Dashboard — port call list with phase filter chips, live data from DB
- Fixed: Prisma P1010 bug (PG16 + Prisma 5) — switched to direct `pg` Pool
- Fixed: Port conflict — local system PG on 5432, Docker moved to 5433
- Fixed: next.config.ts → next.config.mjs (Next 14 compat)
- Fixed: Clerk dev bypass — app runs without Clerk keys in development
- App serving at http://localhost:3000 — HTTP 200 on /port-calls

## In Progress
- Nothing blocking — app is running

## Next Steps (Phase B continued)
1. Port call detail page — tabbed view (summary, timeline, disbursement, funding, documents, tasks)
2. API routes — port-calls CRUD with phase transition validation
3. Mock service adapters (storage/local, pdf/react-pdf) for document upload
4. Clerk webhook handler — sync user/org to DB on creation
5. Add Clerk keys when ready for demo with real auth

## Key Decisions Made
- Prisma P1010 workaround: switched to raw `pg` Pool for all DB queries
  - Prisma schema still maintained for migrations and type reference
  - Will re-integrate Prisma client on Azure PostgreSQL (production)
- Docker Compose PostgreSQL on port 5433 (5432 occupied by system Postgres)
- Dev auth bypass: Clerk skipped when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is stub
- All money stored as cents (integers) in DB

## Files Modified (key ones)
- packages/db/src/client.ts — switched from Prisma to raw pg Pool
- packages/db/src/index.ts — exports pool, query, queryOne helpers
- apps/web/app/(dashboard)/port-calls/page.tsx — dashboard with raw SQL query
- apps/web/components/layout/Sidebar.tsx — nav shell
- apps/web/components/layout/Topbar.tsx — topbar with dev badge
- apps/web/components/layout/OmniBar.tsx — Cmd+K search modal
- apps/web/components/shared/PhaseBadge.tsx — phase status badge
- apps/web/middleware.ts — Clerk bypass in dev
- apps/web/app/layout.tsx — conditional ClerkProvider
- apps/web/next.config.mjs — renamed from .ts
- docker-compose.yml — port 5433

## Running Commands
```bash
# Start DB
docker compose up -d

# Start app
cd apps/web && pnpm dev
# → http://localhost:3000

# DB is pre-seeded — 10 port calls across all 9 phases
# If re-seeding needed: docker exec -i shipops_db psql -U shipops -d shipops < /tmp/seed.sql
```

## Context / Notes
- GitHub: https://github.com/theshipsagent/agency_platform
- PostgreSQL: localhost:5433 (Docker) — DO NOT use 5432 (system PG)
- System PG on 5432 has no shipops user — this was the cause of the role error
- Clerk keys: get from https://clerk.com — add to apps/web/.env.local when ready
