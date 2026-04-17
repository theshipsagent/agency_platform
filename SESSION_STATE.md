# Session State
Last updated: 2026-04-17 (post-structural-hygiene)

## Current Goal
**Structural hygiene pass — DONE locally, unpushed.** Repo is now on green rails: typecheck + lint + build all pass, CI workflow wired, dead scaffold removed. Ready for continued feature work.

## Completed This Session (merge day)
- Safety snapshots: tags `pre-merge-snapshot-2026-04-17`, backup branches, tarballs at `~/claude_sessions/snapshots/`
- shipops' 13 uncommitted files committed in themed chunks on its `dev` branch (never pushed)
- Created merge branch `consolidate-shipops` in agency_platform
- Copied shipops-only files in 5 themed chunks (port-call layout, phase APIs, phase controls, postcss, docs + SESSION_ARCHIVE)
- Schema consolidation: shipops' schema was a strict superset — 5 new enums, 3 new models, field additions on 8 existing models. DB reset + `prisma db push` applied cleanly.
- Reconciled 5 diverging code files (all shipops won — matched new schema, added features)
- E2E validated via API: created port call `NOL-2026-00001`, GET list works, detail SSR renders
- Fixed `service_scope` enum array cast bug found during E2E (needed `::text[]::"ServiceScope"[]`)
- Merged `consolidate-shipops` → `main` with `--no-ff`. Tag `consolidation-complete-2026-04-17`.
- Archived `/Users/wsd/dev/shipops` → `/Users/wsd/dev/_archive/shipops_2026-04-17/`
- Updated memory (`MEMORY.md`, `project_shipops_agency_platform_duplication.md` marked resolved)
- Wrote handover at `~/claude_sessions/merge_complete_handover_2026-04-17.md`

## Completed 2026-04-17 (post-push session)

- Fresh-eyes re-verify: dev server clean (Ready in 1.2s, zero errors), `/port-calls` 200, `/port-calls/[uuid]` 200, `/port-calls/new` 200, API returns `NOL-2026-00001` fixture, human UI spot-check confirmed OK
- Pushed main to origin: `79c43d5..acd9708` (24 commits, fast-forward — handover undercounted at "10" because `--no-ff` preserved all constituent chunks)
- Pushed safety tags to origin: `pre-merge-snapshot-2026-04-17`, `consolidation-complete-2026-04-17`
- `~/.zshrc` already has `agencyp()` function + `agency_platform` path in `repos()` — no edit needed (confirmed reading file live)

## Completed 2026-04-17 (post-seed-fix session)

- **Seed scripts fixed** — `packages/db/prisma/seed.ts` fully reconciled to new schema:
  - User role `OPERATOR` → `AGENT_FULL` (enum change)
  - Added 3 offices (NOL, HOU, MOB) + OfficePort junctions (port calls now require officeId)
  - Terminal `type: 'General Cargo'` (string) → `terminalType: 'GENERAL_CARGO'` (enum); `maxDraft` → `maxDraftM`
  - Removed dead `creditScore` field from Organization creates (not in schema)
  - Added `officeId` to all 10 PortCall entries (mapped by port)
  - Seed runs clean end-to-end — verified 11 port calls in DB (10 seed + 1 merge fixture), all with office_id, all 9 phases represented
- `packages/db/scripts/seed.sh` retired (was broken beyond repair — wrong column names, old enums, no office_id). Moved to `packages/db/scripts/_archive/seed_sh_2026-04-17.sh.deprecated`
- `package.json` `db:seed` now points at `tsx prisma/seed.ts` (was `bash scripts/seed.sh`). Removed redundant `db:seed:ts` alias.
- **Select component hover fix** — `apps/web/components/ui/select.tsx` SelectItem was missing `data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground`. Mouse-hover did nothing visually; now highlights properly.

## Completed 2026-04-17 (structural hygiene session)

- **Middleware fixed** — `apps/web/middleware.ts` updated for Clerk v5 API: `auth.protect()` → `auth().protect()` (was silently broken, devBypass was masking it)
- **Dead preview/ routes deleted** — `apps/web/app/(preview)/` + `apps/web/app/(dashboard)/preview/` (9 files, 4,150+ lines). Zero inbound refs. Fixed ~30 typecheck errors.
- **dropdown-menu.tsx** — removed duplicate `checked={checked}` attr, added `checked ?? false` coalesce for exactOptionalPropertyTypes
- **Topbar.tsx** — removed orphan `// eslint-disable-next-line @typescript-eslint/no-require-imports` pointing at uninstalled rule
- **ESLint configured** — `apps/web/.eslintrc.json` with `next/core-web-vitals` (non-interactive, CI-compatible)
- **CI workflow added** — `.github/workflows/ci.yml` runs typecheck + lint + build on push/PR to main. Uses pnpm cache, generates Prisma client, placeholder Clerk/DB env vars for build step.
- **Stale branches deleted** — `consolidate-shipops`, `pre-merge-main-backup` (tags `pre-merge-snapshot-2026-04-17` and `consolidation-complete-2026-04-17` preserved for rollback)
- **Verified green locally:** `pnpm typecheck` (1.8s), `pnpm lint` (1.5s), `pnpm build` (11.3s)
- **Committed** as `0518705` "Structural hygiene: typecheck + lint green, CI wired" — 14 files changed, +54 / -4153. **Unpushed.**

## In Progress

Nothing — good stopping point. `/clear` recommended before next task.

## Next Steps (in priority order)

1. **Push `0518705` to origin** when ready. First CI run will fire on push — watch it go green.
2. **Investigate `agency/` 104MB untracked folder at repo root** — unknown contents. Could be old clone / demo assets / dump. Decide: keep, archive, or delete.
3. **Repo root cleanup (cosmetic):** tracked scratch files (`BRAINSTORM_PORT_CALL_UX.md`, `FIELD_INVENTORY.md`, `HANDOFF.md`, `SERVICE_FILE_PATTERN.md`, `user_convo_shipops.md`, `agency_docs/`, `data_fields_v1_031726`, `ship-agency-platform.jsx`). Some may be load-bearing (FIELD_INVENTORY), others disposable. Review one-by-one before moving to `_archive/`.
4. **Prisma migrations** — currently using `db push` (empty `migrations/` folder). Switch to `prisma migrate` when prod deploy is 4-6 weeks out, not before.
5. **Wizard UI polish at `/port-calls/new`** — deferred feature work:
   - Dropdowns visibly overlapping each other
   - Cramped layout at `max-w-3xl` (768px)
   - 14-item Service Scope checkbox grid (2 cols × 7 rows) looks like a wall
   - Tackle when next working on port-call features
6. **Minor detail-route UX gap (non-blocking):** `/port-calls/[id]` is UUID-keyed, so human-typed `/port-calls/NOL-2026-00001` 404s. If desired, add a port-call-number → UUID redirect.

## Key Facts

- Canonical path: `/Users/wsd/agency_platform` (NOT in `~/dev/`)
- Origin/main: at `2c1ed20`
- Local main: 1 commit ahead (`0518705` structural hygiene) — unpushed
- DB: `shipops_db` Docker container on port 5433, schema synced, minimal seed (1 port call NOL-2026-00001 + supporting fixtures)
- CI: `.github/workflows/ci.yml` — runs on push/PR to main, typecheck + lint + build
- ESLint: `apps/web/.eslintrc.json` (next/core-web-vitals)

## Rollback
- Soft: `git reset --hard pre-merge-snapshot-2026-04-17` on agency_platform
- Nuclear: untar from `~/claude_sessions/snapshots/`

## Context / Notes
- Dev server: `pnpm --filter web dev` → port 3000 (not 3001 — Next.js default)
- Docker DB: `docker compose up -d` from project root → Postgres on 5433
- Pre-existing TS errors in `preview/` routes + `middleware.ts` — unrelated to merge, deferred
- `consolidate-shipops` branch retained for reference — can delete after next-session verify
