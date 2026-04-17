# Session State
Last updated: 2026-04-17 (post-seed-fix)

## Current Goal
**Consolidate shipops + agency_platform into a single repo — DONE and PUSHED to origin. Seed scripts fixed.** Next session: wizard UI polish when returning to port-call work.

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

## In Progress

Nothing — good stopping point. `/clear` recommended before next task.

## Next Steps (in priority order)

1. **Wizard UI polish at `/port-calls/new`** — user confirmed multiple visual issues exist but deferred fix:
   - Dropdowns visibly overlapping each other (may be Radix Portal z-index or bg-popover opacity issue)
   - Cramped layout at `max-w-3xl` (768px — narrow for a 6-step form)
   - 14-item Service Scope checkbox grid (2 cols × 7 rows) looks like a wall
   - SelectContent width may spill wider than trigger
   - Tackle when next working on port-call features, not standalone
2. **Clean up branches** — after a week of no rollback needed, delete `consolidate-shipops` and `pre-merge-main-backup`. Keep tags.
3. **Minor detail-route UX gap (non-blocking):** `/port-calls/[id]` is UUID-keyed, so human-typed `/port-calls/NOL-2026-00001` 404s. List→detail links work fine (UUID-keyed). If desired, add a port-call-number → UUID redirect.
4. **Pre-existing TS errors** in `preview/` routes + `middleware.ts` — deferred, unrelated to merge.

## Key Facts

- Canonical path: `/Users/wsd/agency_platform` (NOT in `~/dev/`)
- Origin/main: at `acd9708` — consolidation pushed 2026-04-17 evening (24 commits)
- Local main: synced with origin
- DB: `shipops_db` Docker container on port 5433, schema synced, minimal seed (1 port call NOL-2026-00001 + supporting fixtures)

## Rollback
- Soft: `git reset --hard pre-merge-snapshot-2026-04-17` on agency_platform
- Nuclear: untar from `~/claude_sessions/snapshots/`

## Context / Notes
- Dev server: `pnpm --filter web dev` → port 3000 (not 3001 — Next.js default)
- Docker DB: `docker compose up -d` from project root → Postgres on 5433
- Pre-existing TS errors in `preview/` routes + `middleware.ts` — unrelated to merge, deferred
- `consolidate-shipops` branch retained for reference — can delete after next-session verify
