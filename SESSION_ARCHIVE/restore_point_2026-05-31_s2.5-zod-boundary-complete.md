# Session State
Last updated: 2026-05-31 (S2.5 Zod-at-boundary structurally complete — guard + smoke test green, NOT YET COMMITTED)

## Current Goal
**S2.5 — Zod-at-boundary: STRUCTURALLY COMPLETE, pending commit.** Three layers of structural defense now in place:
- **S1** (committed `a17c3b9`): tenant isolation via `tenantQuery` helper + CI guard
- **S2** (committed `5bbea3b` + follow-up `a891c41`): atomic audit trail via `auditedMutation` + CI guard + DB smoke test
- **S2.5** (pending): Zod input validation via `parseBody` helper + 6 new `*BodySchema` exports + CI guard + in-process smoke test (18/18 green)

## S2.5 Scout Findings (2026-05-31)

- **Zod already installed** in `apps/web/package.json` and `packages/shared/package.json`. No new top-level deps needed.
- **`packages/shared/src/validation/index.ts` already exists** with 14 pre-built schemas — but ZERO routes import them. Pre-built scaffold dead code.
- **Pre-built schemas diverged from current route bodies.** `CreatePortCallSchema` has 8 fields; the actual route accepts 18. `CreateVesselSchema` is for full vessel creation; the route POSTs just `{ imo }` and looks up from `ships_register`. `PhaseTransitionSchema` expects `portCallId` in body; the route gets it from URL params.
- **PortCallPhase numeric-vs-string mismatch.** `PortCallPhase` is the only enum in `packages/shared/src/enums/index.ts` with numeric values (1–9) — every other enum uses string values matching the key. `z.nativeEnum(PortCallPhase)` validates numbers, but the API + Postgres both use string keys. Required `z.enum([...string keys])` in the schema. Spawn-task chip filed to flip PortCallPhase to string values.

## S2.5 Architecture Decisions

- **New `*BodySchema` exports alongside aspirational schemas, not replacing them.** The pre-built schemas (CreatePortCallSchema, etc.) represent a future-state API; the routes diverged. Adding suffixed `*BodySchema` versions matching current route bodies avoids breaking working frontends while preserving the aspirational shape for a future redesign.
- **`.strict()` by default.** Rejects unknown fields so client-side typos like `{ portCallTpye: ... }` fail loudly instead of silently dropping. Combined with S1 (tenant) and S2 (audit), forms a third "no silent surprises" layer.
- **XOR refine for sub-status.** What was a runtime branch in the route (`if (body.activeSubStatus) {} else if (body.settledSubStatus) {}`) is now a schema invariant via `.refine()`. Schema-as-documentation: the type itself says "exactly one."
- **Discriminated union return from `parseBody`.** Returns `{ok: true, data} | {ok: false, response}` so routes type-narrow without try/catch. Keeps validation in the normal return path; matches Next.js route handler style.

## S2.5 Sub-tasks (all done)

- [x] **S2.5a** — `apps/web/lib/api/parse.ts`: `parseBody(schema, body)` discriminated-union helper. 400 response includes flattened `[{path, message}]` issue list, omits Zod's `received`/`expected` (potential type leak).
- [x] **S2.5b** — 6 new `*BodySchema` exports in `packages/shared/src/validation/index.ts`: `CreateVesselBodySchema`, `RegisterPortBodySchema`, `CreatePortCallBodySchema` (with nested `CargoLineBodySchema`), `UpdatePortCallFileStatusBodySchema`, `PhaseTransitionBodySchema` (string-key enum), `UpdateSubStatusBodySchema` (XOR refine).
- [x] **S2.5c** — All 6 routes migrated through `parseBody`. Removed obsolete runtime validation guards now subsumed by schemas (`VALID_STATUSES.includes`, `DB_PHASES.includes`, `VALID_ACTIVE_SUBS.includes`, `VALID_SETTLED_SUBS.includes`, the manual `if (!portCallType || ...)` required-field check). Sub-status route simplified: no more two-branch XOR check, schema guarantees structural invariant.
- [x] **S2.5d** — `scripts/ci-input-validation-guard.sh` (wired into `.github/workflows/ci.yml`): fails build on `req.json() as ` literal in `apps/web/app/api/`. Discriminator is the `as ` cast suffix — bare `req.json()` is legitimate inside `parseBody`. Negative test passes (synthetic regression → EXIT=1). Smoke test at `packages/shared/scripts/verify-input-validation.ts` (run via `pnpm --filter @shipops/shared verify-input-validation`): 18 in-process assertions covering `.strict()` enforcement, PortCallPhase string-vs-number regression guard, XOR refine, required-field enforcement, RegisterPortBody field constraints.

## S2.5 Files Touched

- **New:**
  - `apps/web/lib/api/parse.ts` — the helper.
  - `packages/shared/scripts/verify-input-validation.ts` — in-process smoke test.
  - `scripts/ci-input-validation-guard.sh` — CI grep guard.
- **Modified (helpers/infra):**
  - `packages/shared/src/validation/index.ts` — appended 6 BodySchemas.
  - `packages/shared/package.json` — added `tsx` devDep + `verify-input-validation` script.
  - `.github/workflows/ci.yml` — added `Input validation guard` step.
- **Modified (route migrations, 6 files):** `apps/web/app/api/{vessels,ports,port-calls}/route.ts`, `apps/web/app/api/port-calls/[id]/{route,phase/route,sub-status/route}.ts`.

## S2.5 Final Verification

- `pnpm --filter web exec tsc --noEmit` → clean
- `pnpm --filter @shipops/shared exec tsc --noEmit` → clean
- `pnpm --filter web lint` → no warnings/errors
- `bash scripts/ci-tenant-isolation-guard.sh` → ✓ S1 still green
- `bash scripts/ci-audit-trail-guard.sh` → ✓ S2 still green
- `bash scripts/ci-input-validation-guard.sh` → ✓ S2.5 green; negative test (synthetic raw cast) correctly fails with EXIT=1
- `pnpm --filter @shipops/db db:verify-audit-trail` → ✓ S2's 16/16 still pass
- `pnpm --filter @shipops/db db:verify-isolation` → ✓ S1 isolation still verified
- `pnpm --filter @shipops/shared verify-input-validation` → ✓ all 18 in-process checks pass

## Original S2 Reference (kept for restore-point continuity)

## S2 Scout Findings (2026-05-31)

- **`audit_logs` table fully modeled.** schema.prisma:970-988. Columns: `tenant_id`, `user_id` (FK → users.id), `action`, `resource_type`, `resource_id`, `before` (jsonb), `after` (jsonb), `created_at`. Indexed three ways.
- **Zero audit writes in app code.** Truly greenfield — confirms the memory note.
- **`audit_logs.user_id` is NOT NULL with FK to users.id.** Big design implication: every audited request needs a real User row, not just a Clerk session. Drove the `Actor` discriminated union design (UserActor vs SystemActor) and the request-scoped `clerk_user_id → users.id` lookup in `getRequestContext`.
- **Mutation surface: ~11 sites across 7 route files.** Smaller than S1's 26 across 12.
- **Seed surprise discovered during smoke-test failure:** `seed_offices_users.sql` was an orphan SQL script — never wired into `db:seed`. The CEO/ADMIN user (`user-hq-ceo`) chosen as the dev actor didn't exist in the live DB. Fell back to `user-mg-001` (MANAGER, the most senior actually-seeded user). **RESOLVED 2026-05-31:** SQL ported into `prisma/seed.ts` (7 offices, 27 users covering all 9 UserRole values, William Davis as `user-nol-mgr`), original SQL archived to `packages/db/_archive/seed_offices_users_2026-05-31_consolidated-into-prisma-seed.sql`. `DEV_USER_ID` restored to `user-hq-ceo` (Robert Datum, ADMIN). Migrated live dev DB to match: renamed 3 stale offices `office-hou`/`-nol`/`-mob` → `-001` IDs (FK CASCADE handled office_ports + port_calls), reassigned 7 pc-003 tasks from `user-op-001` → `user-nol-ag1` (Michelle Tureaud), dropped the 3 stale demo users. `verify-audit-trail` smoke test re-runs clean (16/16).

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
- **Pre-existing seed.ts typecheck failure** — `seed.ts` lines 504-505 (ActiveSubStatus/SettledSubStatus enum vs string) **FIXED in `56f86f1`** (committed earlier this session as a standalone narrow commit; predated S1, surfaced when S2 first typechecked the db package end-to-end). `pnpm --filter @shipops/db exec tsc --noEmit` now clean.

## Commit Log This Session

- `56f86f1` — `chore(db): type ActiveSubStatus/SettledSubStatus enums in seed + add typecheck script`
- `5bbea3b` — `feat(audit): write audit_logs atomically via auditedMutation helper (S2)` (note: pinned DEV_USER_ID to user-mg-001/MANAGER — superseded by `a891c41` below)
- `a891c41` — `chore(seed): consolidate seed_offices_users.sql into prisma/seed.ts and restore CEO as dev actor` (ported the orphan SQL, archived original, restored user-hq-ceo as dev actor, re-added the dropped db:verify-audit-trail script alias)

Local-only — nothing pushed.

## Open Items (for next session)

- **Zod-at-boundary (S2.5)** — was originally bundled with S2 but is structurally orthogonal (per-route schemas, not a global helper). Up next this session per William's decision.
- **Production blocker #3** — service adapters throwing "Phase B not implemented" — next major piece after S2.5.
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
