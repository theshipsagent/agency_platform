# Session State
Last updated: 2026-03-30 (UX brainstorm complete, ready to build tabs)

## Current Goal
Phase D in progress — port call detail page tab content is next. Full UX brainstorm written and pending William's review.

## Completed Previously
- Phase transition API: `PATCH /api/port-calls/[id]/phase` with prerequisite validation
- Phase info API: `GET /api/port-calls/[id]/phase` with available transitions
- Sub-status API: `PATCH /api/port-calls/[id]/sub-status` (Phase 4 + Phase 9)
- Port call detail page layout with header + tab navigation
- Summary tab with KPI strip, vessel/port/parties/timing cards, phase controls
- PhaseControls component (dialog with prerequisite check + confirm)
- SubStatusControls component (inline AT_ANCHOR→BERTHED→WORKING_CARGO→CARGO_COMPLETE)
- Tab navigation filtered by port call type (Cargo/Liner/Forwarding show/hide)
- Placeholder tabs for future modules: Husbandry, Liner/Traffic, Forwarding
- Cargo tab stub created
- SERVICE_FILE_PATTERN.md design reference for service tracks
- Fixed DB column name mismatches (proforma_amount vs proforma_amount_cents, etc.)
- Fixed Prisma client generation issue

## Completed This Session (2026-03-29 evening)
- Fixed missing `postcss.config.js` — Tailwind styles were not rendering (unstyled HTML). Added the config, styles now load correctly.
- Verified dashboard, new port call modal, and detail page are all functional and styled
- Wrote full UX brainstorm: `BRAINSTORM_PORT_CALL_UX.md` — comprehensive design for port call detail page
- Reviewed agency_docs project (read-only, separate session) for document template style reference

## In Progress
- William reviewing BRAINSTORM_PORT_CALL_UX.md and open questions

## Next Steps (Resume Here)
1. **Get William's feedback on brainstorm** — especially the 5-tab structure, DA versioning, and open questions at bottom of BRAINSTORM_PORT_CALL_UX.md
2. Refactor tab bar from 10 tabs → 5 tabs (Overview, Operations, DA, Cargo, Documents) based on brainstorm decisions
3. Build tab content starting with Overview (tasks + activity feed + reference cards)
4. Build DA tab with expense lines, funding section, version history, crosswalk chart
5. Build Operations tab (timeline/SOF with live event logging)
6. Build Cargo tab (draft survey, laytime, cargo docs)
7. Build Documents tab (system-generated, received, expected)
8. DSS guardrails in wizard

## Key Decisions
- DB uses Postgres enum strings (PROFORMA_ESTIMATED, etc.) not integers
- Phase validation logic centralized in `apps/web/lib/phase-transitions.ts`
- Tabs filtered by PORT_CALL_TYPE_CONFIG pattern (CARGO_TYPES set for cargo-related tabs)
- Service File Pattern: all service types (Husbandry, Forwarding, Protecting) can be linked OR standalone
- Liner/Traffic is always linked (no standalone mode)
- BUNKERING_ONLY and CREW_CHANGE_ONLY may move to husbandry service files (design TBD)
- Detail page header is server component; tabs and phase controls are client components

## DB Column Names (important — don't use _cents suffix)
- expenses: proforma_amount, actual_amount, invoice_amount (not _cents)
- funding_records: amount (not amount_cents)
- port_calls: agent_fee_proforma_cents, agent_fee_actual_cents (THESE do have _cents)

## DB State
22+ tables | 12 ports | 24 terminals | 43 orgs | 30 users | 10 port calls

## Files Created/Modified This Session
- `apps/web/lib/phase-transitions.ts` — validation logic, DB phase mapping
- `apps/web/app/api/port-calls/[id]/phase/route.ts` — GET + PATCH phase transitions
- `apps/web/app/api/port-calls/[id]/sub-status/route.ts` — PATCH sub-status transitions
- `apps/web/app/(dashboard)/port-calls/[id]/layout.tsx` — detail page layout
- `apps/web/app/(dashboard)/port-calls/[id]/page.tsx` — Summary tab (replaced stub)
- `apps/web/app/(dashboard)/port-calls/[id]/cargo/page.tsx` — Cargo tab stub
- `apps/web/components/port-call/PortCallHeader.tsx` — header component
- `apps/web/components/port-call/PortCallTabs.tsx` — tab navigation
- `apps/web/components/port-call/PhaseControls.tsx` — phase transition dialog
- `apps/web/components/port-call/SubStatusControls.tsx` — sub-status inline controls
- `SERVICE_FILE_PATTERN.md` — design reference for service tracks

## Context
- `cd ~/dev/shipops && docker start shipops_db && pnpm dev`
- Dev server runs on port 3000
- Must run `pnpm --filter db exec prisma generate` after fresh clone
