# Session State
Last updated: 2026-05-28 (S1 complete — all sub-tasks shipped, isolation verified)

## Current Goal
**S1 — Tenant isolation enforcement: COMPLETE.** All 12 importer files migrated to `tenantQuery(tenantId, sql, params)` with TypeScript-enforced signature. CI grep-guard added. Two-org smoke test passes against the real DB. Multiple cross-tenant leaks fixed during migration (shared helpers + queries that had no tenant filter at all). Next session = S2 (audit trail + Zod-at-boundary).

## S1 Scout Findings (2026-05-28)

- **No Prisma at runtime.** `packages/db/src/client.ts` exports a `pg.Pool` and `query()`/`queryOne()` helpers. Prisma is type-stub only. Comment: "Direct pg pool — bypasses Prisma's P1010 permission check bug with PG16. Prisma ORM will be re-integrated once production DB is on Azure PostgreSQL."
- **Hardcode is a SQL literal, not a variable.** ~26 occurrences across 12 files. Embedded directly in template strings, e.g. `WHERE pc.tenant_id = 'tenant-gca-001'`. Migration requires rewriting SQL to `WHERE tenant_id = $N` + threading the param.
- **Clerk is bypassed in dev.** `apps/web/middleware.ts:17` — no real key ⇒ `devBypassMiddleware` lets all requests through with no session. Need a dev shim before any session-based code can be tested locally.
- **Files affected** (raw counts): `apps/web/app/api/ports/route.ts` (6), `port-calls/route.ts` (5), `vessels/route.ts` (3), `port-calls/[id]/route.ts` (2), `port-calls/[id]/phase/route.ts` (2), `(dashboard)/port-calls/page.tsx` (2), `port-calls/[id]/sub-status/route.ts` (1), `organizations/route.ts` (1), `offices/route.ts` (1), `(dashboard)/port-calls/[id]/page.tsx` (1), `(dashboard)/port-calls/[id]/layout.tsx` (1). Plus `prisma/seed.ts` (1, legitimate).

## Architecture Decision

**Explicit `tenantQuery(tenantId, sql, params)` helper** chosen over AsyncLocalStorage implicit context.
- **Why:** structural safety. TypeScript enforces tenantId at every call site; AsyncLocalStorage's failure mode is silent (forgotten context = unfiltered query).
- **Pattern:** rename current `query` → `unscopedQuery` (seed/migrations only). New `tenantQuery(tenantId, sql, params)` is the default for app code. Makes the unsafe path grep-able — analogous to Rust's `unsafe {}` block.
- **CI guard:** grep-fail on any new `'tenant-gca-001'` literal in `apps/` outside seed.

## S1 Sub-tasks (all done)

- [x] **S1a** — `getTenantId()` helper at `apps/web/lib/api/auth.ts`. Three modes: dev-without-Clerk → DEV_TENANT_ID; dev-with-Clerk-but-no-orgId → fallback with console.warn (pragmatic dev choice); prod → strict throw on missing orgId. `DEV_TENANT_ID` is the single source of truth for the literal `'tenant-gca-001'`.
- [x] **S1b** — Renamed `query`/`queryOne` → `unscopedQuery`/`unscopedQueryOne` (reserved for seed/migrations). Added `tenantQuery(tenantId, sql, params)` / `tenantQueryOne(tenantId, sql, params)`. TypeScript-enforced at call site.
- [x] **S1c** — Migrated all 12 importer files. Replaced 26 hardcoded literals with $-parameters. Threaded tenantId through shared helper `lib/phase-transitions.ts` (public API now `validatePhaseTransition(tenantId, portCallId, ...)`). Closed cross-tenant leaks in: `phase-transitions.ts` (8 queries with no tenant filter), `(dashboard)/port-calls/[id]/page.tsx` (3 follow-up queries), `(dashboard)/port-calls/page.tsx` (string-interpolated phase filter, now $-param), `api/offices/route.ts` (office_ports query), `api/port-calls/[id]/sub-status/route.ts` (2 UPDATEs with no tenant filter — cross-tenant **write** leak).
- [x] **S1d** — CI grep-guard at `scripts/ci-tenant-isolation-guard.sh` (invoked by `.github/workflows/ci.yml`): fails build if `tenant-gca-001` appears outside `auth.ts` or if `unscopedQuery` is imported from app code. Two-tenant smoke test at `packages/db/scripts/verify-tenant-isolation.ts` (run via `pnpm --filter @shipops/db db:verify-isolation`): creates a sentinel org under a synthetic tenant, verifies real tenant cannot see it and synthetic tenant can. Passed locally against shipops_db.

## S1 Files Touched

- **New:** `apps/web/lib/api/auth.ts`, `scripts/ci-tenant-isolation-guard.sh`, `packages/db/scripts/verify-tenant-isolation.ts`
- **Modified (12 importers):** `apps/web/lib/phase-transitions.ts`, `apps/web/app/api/{offices,organizations,ports,vessels}/route.ts`, `apps/web/app/api/port-calls/route.ts`, `apps/web/app/api/port-calls/[id]/{route,phase/route,sub-status/route}.ts`, `apps/web/app/(dashboard)/port-calls/page.tsx`, `apps/web/app/(dashboard)/port-calls/[id]/{layout,page}.tsx`
- **Modified (infra):** `packages/db/src/{client,index}.ts`, `packages/db/package.json`, `.github/workflows/ci.yml`

## S1 Final Verification

- `pnpm --filter web exec tsc --noEmit` → clean
- `pnpm --filter web lint` → no warnings/errors
- `bash scripts/ci-tenant-isolation-guard.sh` → ✓ guards passed
- `pnpm --filter @shipops/db db:verify-isolation` → ✓ all 4 isolation checks passed against real DB

## Completed Earlier This Session

- Session ritual + S0 commits pushed to `origin/main` (6 commits: `b5a7647`..`fc4d9c2`)
- Scout for S1 — discovered Prisma-vs-pg mismatch in roadmap assumptions
- Decision: explicit `tenantQuery` helper (S1 architecture fork)

## Completed Previous Session (2026-05-28 — S0 restructure)

- **CLAUDE.md change committed standalone** (`b5a7647`) — Directory Map + `_inbox/` intake rules.
- **Dead pre-architecture artifacts removed:**
  - `data_fields_v1_031726` (266 lines) — commit `15cdff7`.
  - `ship-agency-platform.jsx` (524 lines) — commit `ccc4b5f`.
  - `demo`, `demo_1`, `demo_extracted/` (untracked ZIPs + extracts) — pruned, no commit.
- **Completed-task docs archived to `_archive/`** (`4a7561e`): `HANDOFF.md`, `user_convo_shipops.md`.
- **Working docs migrated to Obsidian** (`1113f81`, 18 files, -4828 lines):
  - `FIELD_INVENTORY.md`, `BRAINSTORM_PORT_CALL_UX.md`, `SERVICE_FILE_PATTERN.md` → `~/Documents/Claude/10_Projects/ShipOps/`
  - `agency_docs/`, `market_study/` → same destination.
- **`.gitignore`** updated: `_inbox/`, `market_study/`.
- **Obsidian roadmap promoted** to `~/Documents/Claude/10_Projects/ShipOps/ROADMAP.md`.

## Key Facts

- Canonical repo path: `/Users/wsd/agency_platform`
- Origin/main: at `fc4d9c2` (S0 pushed). Local now equal to origin.
- DB client: **`pg.Pool` direct, not Prisma at runtime** (per client.ts comment, until Azure PG migration).
- DB: `shipops_db` Docker container on port 5433, schema synced, seed includes 11 port calls spanning all 9 phases.
- Dev Clerk bypass: middleware currently passes all requests in dev without a real pk_ key.
- CI: `.github/workflows/ci.yml` runs typecheck + lint + build on push/PR to main.
- Project memory: pointer to roadmap saved at `~/.claude/projects/-Users-wsd-agency-platform/memory/project_shipops_roadmap.md`.
- Three production blockers — S1 (in progress) addresses #1:
  1. Tenant isolation hardcoded — S1 (THIS SESSION)
  2. Zero audit-trail writes — S2
  3. All 7 service adapters throw "Phase B not implemented" — S3+

## Rollback
- Soft (back to pre-S1): `git reset --hard fc4d9c2`
- Restore points in `SESSION_ARCHIVE/`:
  - `restore_point_2026-05-28_s0-complete.md` (pre-S1 baseline)
- Tag preserved: `consolidation-complete-2026-04-17`

## Context / Notes
- Dev server: `pnpm --filter web dev` → port 3000
- Docker DB: `docker compose up -d` from project root → Postgres on 5433
- William chose "Recommended: explicit `tenantQuery` helper" on the S1 architecture fork — codifies the safer-than-implicit-context preference.
