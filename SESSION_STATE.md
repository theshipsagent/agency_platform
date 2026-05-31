# Session State
Last updated: 2026-05-31 (S2 audit trail complete — helper + 7 routes + CI guard + smoke test, all green, NOT YET COMMITTED)

## Current Goal
**S2 — Audit trail: STRUCTURALLY COMPLETE, pending commit.** All four sub-tasks shipped:
- S2a getRequestContext + Actor discriminated union
- S2b `auditedMutation` helper (atomic transaction, before/after jsonb)
- S2c — all 7 mutation route files migrated (vessels, port-calls POST/PATCH, port-calls/[id]/route, port-calls/[id]/phase, port-calls/[id]/sub-status, ports)
- S2d CI grep-guard (`scripts/ci-audit-trail-guard.sh`, wired into `.github/workflows/ci.yml`) + DB smoke test (`db:verify-audit-trail`, 16 checks pass)

**Zod-at-boundary explicitly deferred** — originally bundled with S2 but it's mostly per-route schema work, structurally orthogonal to audit. Belongs in its own sub-session (S2.5 or S3).

## S2 Scout Findings (2026-05-31)

- **`audit_logs` table fully modeled.** schema.prisma:970-988. Columns: `tenant_id`, `user_id` (FK → users.id), `action`, `resource_type`, `resource_id`, `before` (jsonb), `after` (jsonb), `created_at`. Indexed three ways.
- **Zero audit writes in app code.** Truly greenfield — confirms the memory note.
- **`audit_logs.user_id` is NOT NULL with FK to users.id.** Big design implication: every audited request needs a real User row, not just a Clerk session. Drove the `Actor` discriminated union design (UserActor vs SystemActor) and the request-scoped `clerk_user_id → users.id` lookup in `getRequestContext`.
- **Mutation surface: ~11 sites across 7 route files.** Smaller than S1's 26 across 12.
- **Seed surprise discovered during smoke-test failure:** `seed_offices_users.sql` is an orphan SQL script — never wired into `db:seed`. The CEO/ADMIN user (`user-hq-ceo`) chosen as the dev actor doesn't exist in the live DB. Falled back to `user-mg-001` (MANAGER, the most senior actually-seeded user). Spawn-task chip flagged to consolidate the two seed sources later.

## Architecture Decisions

- **App-layer wrapper, not DB triggers** (S1 mental-model continuity — explicit > implicit, grep-able failure mode).
- **One context object: `RequestContext = {tenantId, actor}`** — replaces `getTenantId()` as a thin alias to avoid the "remembered tenant scope, forgot actor" bug.
- **Single mutation + single audit row per transaction.** Cross-write atomicity (e.g. port_call + cargo_lines) is a separate concern; pre-existing gap, not introduced by S2.
- **SystemActor explicitly rejected at runtime** until `audit_logs.user_id` is made nullable or a system sentinel user is seeded. Better than letting Postgres bubble a cryptic FK error.

## S2 Sub-tasks (all done)

- [x] **S2a** — Extended `apps/web/lib/api/auth.ts`. New `getRequestContext()` returns `{tenantId, actor}`. `Actor = UserActor | SystemActor` discriminated union. Dev shim returns a literal `DEV_CONTEXT` (no DB roundtrip) pointing at `user-mg-001` (MANAGER, most-senior actually-seeded user). Prod path looks up users by `(tenant_id, clerk_user_id)` defense-in-depth. `getTenantId()` retained as a thin alias for S1's pre-existing call sites.
- [x] **S2b** — New `packages/db/src/audit.ts` with `auditedMutation`. Atomic: BEGIN → SELECT `row_to_json` for `before` → mutation with RETURNING → INSERT audit_logs → COMMIT (ROLLBACK on any error, including mutation failures). SystemActor calls throw a typed error.
- [x] **S2c** — All 7 mutation route files migrated:
  - `vessels/route.ts` (1 INSERT — `CREATE vessel`)
  - `port-calls/route.ts` (2 INSERTs — `CREATE port_call`, `CREATE cargo_line`)
  - `port-calls/[id]/route.ts` (1 UPDATE — `UPDATE_FILE_STATUS`)
  - `port-calls/[id]/phase/route.ts` (1 UPDATE — `PHASE_TRANSITION`)
  - `port-calls/[id]/sub-status/route.ts` (2 UPDATEs — `ACTIVE_SUB_STATUS_CHANGE`, `SETTLED_SUB_STATUS_CHANGE`)
  - `ports/route.ts` (2 INSERTs — `CREATE port` US + foreign)
  - INSERT routes generate UUID via `crypto.randomUUID()` in JS so the same id is both the SQL param and the audit `resourceId`.
- [x] **S2d** — CI grep-guard at `scripts/ci-audit-trail-guard.sh` (wired into `.github/workflows/ci.yml`): fails build if any file under `apps/web/app/api/` has a mutation verb in a SQL template literal but doesn't import `auditedMutation`. Discriminator: backtick prefix (handles multi-line `UPDATE ... \n SET ...`). Negative test passes (a synthetic regression triggers EXIT=1). DB smoke test at `packages/db/scripts/verify-audit-trail.ts` (run via `pnpm --filter @shipops/db db:verify-audit-trail`): 16 checks covering happy path + ROLLBACK on bad SQL + SystemActor rejection — all pass against the real DB.

## S2 Files Touched

- **New:**
  - `packages/db/src/audit.ts` — the helper.
  - `packages/db/scripts/verify-audit-trail.ts` — DB smoke test.
  - `scripts/ci-audit-trail-guard.sh` — CI grep guard.
- **Modified (helpers/infra):**
  - `apps/web/lib/api/auth.ts` — `getRequestContext`, `Actor` type, `DEV_USER_ID`.
  - `packages/db/src/index.ts` — re-exports for `auditedMutation` + types.
  - `packages/db/package.json` — `db:verify-audit-trail` script + `typecheck` script (the latter added externally during the session).
  - `.github/workflows/ci.yml` — added `Audit trail guard` step.
- **Modified (route migrations, 7 files):** `apps/web/app/api/{vessels,ports,port-calls}/route.ts`, `apps/web/app/api/port-calls/[id]/{route,phase/route,sub-status/route}.ts`.

## S2 Final Verification

- `pnpm --filter web exec tsc --noEmit` → clean
- `pnpm --filter web lint` → no warnings/errors
- `bash scripts/ci-tenant-isolation-guard.sh` → ✓ S1 guards still pass (no regression)
- `bash scripts/ci-audit-trail-guard.sh` → ✓ 6 mutation files checked, all import auditedMutation; negative test (synthetic raw mutation) correctly fails with EXIT=1
- `pnpm --filter @shipops/db db:verify-audit-trail` → ✓ all 16 checks pass against real DB (happy path + ROLLBACK on bad SQL + SystemActor rejection)
- `pnpm --filter @shipops/db db:verify-isolation` → ✓ S1 isolation still verified
- **Known pre-existing failure (not S2's fault):** `pnpm --filter @shipops/db exec tsc --noEmit` fails on `seed.ts` lines 504-505 (ActiveSubStatus/SettledSubStatus enum vs string). Confirmed via stash test against `a17c3b9`. Spawn-task chip flagged.

## Open Items (for next session or commit-time)

- **NOT YET COMMITTED.** Per project rule, awaiting explicit ask.
- **Zod-at-boundary** still ahead — was originally bundled with S2 but is structurally orthogonal (per-route schemas, not a global helper). Belongs in its own short session.
- **Production blocker #3** — service adapters throwing "Phase B not implemented" — is next on the roadmap.
- **created_by/updated_by on rows still write the literal `'system'`.** The audit_logs row is now the source of truth for forensics; row-level attribution columns are a separate cleanup, deliberately out of S2 scope.
- **Multi-write atomicity gap** in `port-calls/route.ts` POST (port_call + cargo_line in separate transactions) is pre-existing and unchanged. Worth fixing whenever a follow-up touches that route.

## Completed Previous Session (S1 — 2026-05-28)

(prior S1 detail preserved below for restore-point continuity)

## S1 Scout Findings (2026-05-28)

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
