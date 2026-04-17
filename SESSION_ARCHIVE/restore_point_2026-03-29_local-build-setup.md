# Session State
Last updated: 2026-03-29

## Current Goal
Establish proper local build environment at ~/dev/shipops/ with professional project management (portiq pattern). Then resume Phase C: schema finalization + migration.

## Completed This Session
- Cloned repo from GitHub to ~/dev/shipops/ (clean local copy, off Google Drive)
- Created `dev` branch
- Installed pnpm dependencies
- Created SESSION_ARCHIVE/ directory
- Rewrote CLAUDE.md in professional format (portiq pattern: environment, read-first rules, phase task list)
- Verified shipops_db Docker container already running on port 5433

## Prior Build History (Phases A+B — completed on GDrive)
- Phase A: full monorepo foundation (Turborepo, shared types/enums/validation, Prisma schema, service interfaces, Docker, Next.js skeleton)
- Phase B: shell layout (shadcn/ui, sidebar, topbar, OmniBar), seed data (10 port calls), working dashboard
- Prisma P1010 workaround: switched to raw pg Pool (will re-integrate Prisma on Azure)
- Docker PostgreSQL on port 5433 (5432 occupied by system Postgres)
- Schema gap analysis completed but NOT yet migrated (see GDrive HANDOFF.md)

## In Progress
- Setting up project management infrastructure (memory, settings, .gitignore updates)

## Next Steps
1. Configure .claude project settings (permissions, memory)
2. Update .gitignore for local dev artifacts
3. Verify DB connection + existing data from Phase B seeds
4. Copy over uncommitted work from GDrive (schema gaps, field inventory, seed SQL) — read-only reference
5. Resume Phase C: finalize schema gap analysis → write migration → update Prisma

## Key Decisions Made
- ~/dev/shipops/ is the canonical build location (Google Drive copy = read-only archive)
- Dev branch workflow (same as portiq): work on dev, merge to main after milestones
- Bake-in gate discipline: complete → test → commit → next
- Docker container `shipops_db` on port 5433 stays as-is (already healthy)
- Prisma P1010 workaround stays: raw pg Pool for local dev, Prisma for schema/types

## Files Modified
- CLAUDE.md — rewritten in professional format
- SESSION_STATE.md — fresh for new location
- SESSION_ARCHIVE/ — created

## Context / Notes
- Original GDrive build has uncommitted schema work (FIELD_INVENTORY.md, seed_offices_users.sql, HANDOFF.md)
- These need to be reviewed and ported to this clean build
- Dev server: `pnpm dev` → port 3001 (or 3000 if free)
- Docker: `docker compose up -d` (already running)
- This is session 1 at the new location

## Running Commands
```bash
# Start DB
docker compose up -d

# Start app
pnpm dev    # from monorepo root

# DB pre-seeded with 10 port calls from Phase B
```
