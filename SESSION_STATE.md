# Session State
Last updated: 2026-04-17 (post-merge)

## Current Goal
**Consolidate shipops + agency_platform into a single repo — DONE locally.** Not yet pushed to origin (intentional, next-day verify first).

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

## In Progress
Nothing — good stopping point.

## Next Steps (in priority order)
1. **Fresh-eyes re-verify** before push — run dev server, click through port calls, spot-check
2. **Fix seed scripts** — both `packages/db/prisma/seed.ts` and `scripts/seed.sh` are stale vs. new schema (stale enum values, renamed columns). Est 30-60 min.
3. **Wizard UI polish** — `/port-calls/new` renders but has visual issues (dropdown overlap). Pre-existing in shipops' code. Needs CSS/Radix investigation.
4. **Push `main` to origin** — `git push origin main`. Fast-forwards origin by 10 commits. Do this ONLY after #1 passes.
5. **Clean up branches** — after a week of no rollback needed, delete `consolidate-shipops` and `pre-merge-main-backup`. Keep tags.

## ⚠️ User manual action before next session
`~/.zshrc` edits were blocked by permission rule. Update manually:
- Line 44: replace `shipopsd()` function — point it at `/Users/wsd/agency_platform` (rename to `agencyp()`)
- Line 71: in `repos()` dirs array, replace `"$DEV_PATH/shipops"` with `"/Users/wsd/agency_platform"`
- Then `source ~/.zshrc`

See handover for exact replacement lines.

## Key Facts
- Canonical path: `/Users/wsd/agency_platform` (NOT in `~/dev/`)
- Origin/main: still at Phase B baseline `79c43d5` — consolidation NOT pushed
- Local main: 10 commits ahead of origin
- DB: `shipops_db` Docker container on port 5433, schema synced, minimal seed (1 port call NOL-2026-00001 + supporting fixtures)

## Rollback
- Soft: `git reset --hard pre-merge-snapshot-2026-04-17` on agency_platform
- Nuclear: untar from `~/claude_sessions/snapshots/`

## Context / Notes
- Dev server: `pnpm --filter web dev` → port 3000 (not 3001 — Next.js default)
- Docker DB: `docker compose up -d` from project root → Postgres on 5433
- Pre-existing TS errors in `preview/` routes + `middleware.ts` — unrelated to merge, deferred
- `consolidate-shipops` branch retained for reference — can delete after next-session verify
