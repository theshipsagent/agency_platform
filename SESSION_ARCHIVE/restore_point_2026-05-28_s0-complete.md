# Session State
Last updated: 2026-05-28 (S0 complete)

## Current Goal
**S0 — Restructure & Obsidian setup: complete.** Repo is now code + project-level docs only. Working docs and market research migrated to `~/Documents/Claude/10_Projects/ShipOps/`. Canonical roadmap promoted out of Inbox. Next session = S1 (tenant isolation enforcement) in a fresh `/clear` context.

## Completed This Session (2026-05-28 — S0 restructure)

- **CLAUDE.md change committed standalone** (`b5a7647`) — Directory Map + `_inbox/` intake rules. Atomic, separable from S0 file moves.
- **Dead pre-architecture artifacts removed:**
  - `data_fields_v1_031726` (tracked, 266 lines) — early field-definitions draft, superseded by `FIELD_INVENTORY.md`. Commit `15cdff7`.
  - `ship-agency-platform.jsx` (tracked, 524 lines) — single-file React prototype with hardcoded inline data. Superseded by the Next.js + Prisma scaffold; never imported by `apps/` or `packages/`. Commit `ccc4b5f`.
  - `demo`, `demo_1`, `demo_extracted/` (untracked, gitignored) — genesis-bootstrap ZIPs + their extracts. PRODUCT_BRIEF and TECH_STACK extracts were byte-identical to live root versions. Pure clutter. Pruned from disk; no commit.
- **Completed-task docs archived to `_archive/`** (`4a7561e`):
  - `HANDOFF.md` (Mar 23 session-handover)
  - `user_convo_shipops.md` (April convo transcript)
- **Working docs migrated to Obsidian** (`1113f81`, 18 files, -4828 lines):
  - `FIELD_INVENTORY.md`, `BRAINSTORM_PORT_CALL_UX.md`, `SERVICE_FILE_PATTERN.md` → `~/Documents/Claude/10_Projects/ShipOps/`
  - `agency_docs/` (full sub-project, 17 files) → `~/Documents/Claude/10_Projects/ShipOps/agency_docs/`
  - `market_study/` (untracked, 103 files) → `~/Documents/Claude/10_Projects/ShipOps/market_study/`. Removed from repo working tree.
  - Copy-verify-delete protocol used: byte-identical MD5s verified on markdowns; file counts matched on directories (17/17, 103/103).
- **`.gitignore` updated** (same commit `1113f81`):
  - Added `_inbox/` (per CLAUDE.md raw-material drop zone rule)
  - Added `market_study/` (safety net against accidental re-import)
- **Obsidian roadmap promoted**: `~/Documents/Claude/00_Inbox/2026-05-28 ShipOps - 14-Session Roadmap.md` → `~/Documents/Claude/10_Projects/ShipOps/ROADMAP.md`. Now canonical.
- **Pending Tasks.md synced** — removed completed S0 and CLAUDE.md-commit items; added S1 as NEXT.

## In Progress

Nothing — clean stopping point. `/clear` recommended before S1.

## Next Steps (in priority order)

1. **S1 — Tenant isolation enforcement** (NEXT SESSION). Read `~/Documents/Claude/10_Projects/ShipOps/ROADMAP.md` §S1 first. Replace hardcoded `tenant_id = 'tenant-gca-001'` in 25+ API routes with Clerk-session-derived tenantId via Prisma middleware. Acceptance: every route in `apps/web/app/api/**` pulls tenantId from session, not from a literal. CI green. Manual smoke test with 2 fake orgs proves isolation.

2. **S2 — Audit trail + Zod-at-boundary** (after S1). Wire `AuditLog` writes on every mutation; canonicalize Zod schemas at API entry points per roadmap.

3. **S3+** — Feature pipeline begins. See ROADMAP.md for the full 14-session plan with done-conditions and skills-to-deploy per session.

## Key Facts

- Canonical repo path: `/Users/wsd/agency_platform`
- Origin/main: at `730cc6d` (last pushed state). Local is **5 commits ahead** unpushed: `b5a7647`, `15cdff7`, `ccc4b5f`, `4a7561e`, `1113f81`. Push at next opportunity.
- Repo now contains only: source code (`apps/`, `packages/`), project-level docs (`CLAUDE.md`, `PRODUCT_BRIEF.md`, `TECH_STACK.md`, `SESSION_STATE.md`), build/config files, `SESSION_ARCHIVE/`, `_archive/`, `_inbox/` (gitignored drop zone), and `.github/`.
- Obsidian ShipOps area: `~/Documents/Claude/10_Projects/ShipOps/` — contains `ROADMAP.md` (canonical), `FIELD_INVENTORY.md`, `BRAINSTORM_PORT_CALL_UX.md`, `SERVICE_FILE_PATTERN.md`, `agency_docs/`, `market_study/`.
- DB: `shipops_db` Docker container on port 5433, schema synced, seed includes 11 port calls spanning all 9 phases.
- CI: `.github/workflows/ci.yml` runs typecheck + lint + build on push/PR to main.
- Project memory: pointer to roadmap saved at `~/.claude/projects/-Users-wsd-agency-platform/memory/project_shipops_roadmap.md`.
- Three production blockers (still pending, all queued for S1/S2/feature-pipeline):
  1. Tenant isolation hardcoded — addressed in S1
  2. Zero audit-trail writes — addressed in S2
  3. All 7 service adapters throw "Phase B not implemented" — addressed per-feature in S3+

## Rollback
- Soft (back to pre-S0): `git reset --hard 730cc6d`
- Restore points in `SESSION_ARCHIVE/`:
  - `restore_point_2026-05-28_discovery-sweep-complete.md` (pre-S0)
  - `restore_point_2026-05-28_s0-complete.md` (this session, post-S0)
- Tag preserved: `consolidation-complete-2026-04-17`
- Nuclear: untar from `~/claude_sessions/snapshots/`

## Context / Notes
- Dev server: `pnpm --filter web dev` → port 3000
- Docker DB: `docker compose up -d` from project root → Postgres on 5433
- S0 used straight implementation (no Explore agents) since the work was deterministic file moves with clear acceptance criteria.
- The 5 unpushed commits are all chore/docs — safe to push as a batch when ready.
