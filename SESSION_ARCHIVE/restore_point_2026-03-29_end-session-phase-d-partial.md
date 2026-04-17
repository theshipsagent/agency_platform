# Session State
Last updated: 2026-03-29 (end of session)

## Current Goal
Phase D in progress — wizard + API done, detail page + phase transitions next.

## Completed This Session
- Migrated build from Google Drive to ~/dev/shipops/ (local OrbStack)
- Set up portiq-style project management (CLAUDE.md, SESSION_ARCHIVE, memory)
- Phase C complete: 3 migrations, Prisma reconciled, Gulf Coast seeded
- Phase D partial: 6-step wizard built, API wired with all new fields
- 7 commits on dev branch

## In Progress
- Nothing — clean handover

## Next Steps (Resume Here → Phase D Remaining)
1. Phase transition logic with prerequisite enforcement
2. Port call detail page (7 tabs: Summary, Ops, Cargo, Voyage DA, Husbandry, Docs, Tasks)
3. DSS guardrails in wizard

## Key Decisions
- Laycan at port_calls level
- Structured international wire banking (10 fields)
- Unified approval_requests table
- Office→Port cascade in wizard
- File numbering: {OFFICE}-{YEAR}-{NNNNN}

## DB State
22+ tables | 12 ports | 24 terminals | 43 orgs | 30 users | 10 port calls | 23 office_ports | 27 port_vendors

## Context
- `cd ~/dev/shipops && docker compose up -d && pnpm dev`
- Read HANDOFF.md for full context when resuming
