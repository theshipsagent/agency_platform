# Restore Point — Modal Dark Theme v2
Created: 2026-03-18
Label: modal-dark-theme-v2
Status at snapshot: UI prototype reviewed and iterated

## What Was Working at This Point
- Dev server running: http://localhost:3000
- Preview page: http://localhost:3000/preview/new-port-call
- Docker PostgreSQL on port 5433
- All DB tables populated: ships_register (52K), foreign_ports (4096), us_ports (506), offices (NOL/HOU/MOB)
- All API routes live: /api/vessels, /api/ports, /api/port-calls, /api/offices

## AutoOpenModal State (v2 — as of this restore point)
- Pure white text (#FFFFFF on all inputs, #F1F5F9 body text)
- Matrix green (#00E676) accent: proforma figures, file number, "Open File →" button (glowing pulse)
- Service Scope: multi-select dropdown with checkboxes + removable tag pills
- Vessel search: 10 sample vessels, dropdown on focus, filters by name/IMO, Enter selects first, click selects, X to clear, vessel detail strip in matrix green on selection
- Party search: dropdown with initials avatars, hold/warn/info banners
- DashboardBehind: full vessel table with status chips, funding progress bars in matrix green/amber
- Animated slide-up modal, backdrop blur

## Design Tokens at This Point
- bg: #0F1117, surface: #13151C, panel: #1A1D27, input: #0D1017
- border: #1F2328, borderMd: #2D3140
- text: #FFFFFF, textSub: #F1F5F9, textMuted: #CBD5E1, textDim: #8899A6
- primary: #3B82F6, matrix: #00E676, red: #EF4444
- Font: DM Sans + JetBrains Mono (Google Fonts)

## Key Files at This Point
- apps/web/app/(dashboard)/preview/new-port-call/AutoOpenModal.tsx — full prototype
- apps/web/app/(dashboard)/preview/new-port-call/page.tsx — renders AutoOpenModal
- apps/web/app/globals.css — dark maritime theme, --foreground: 0 0% 96%
- apps/web/components/layout/Sidebar.tsx — 3-section nav

## Next Planned Steps
1. User approves design → wire modal to actual POST /api/port-calls
2. Port call detail page — tabs: Summary · Voyage & Cargo · Operations · Funding · Documents · Tasks
3. Customer Profile entity
4. Sub-file / spin-off model
5. Proforma DA generator

## Session State at Snapshot
(see SESSION_STATE.md — copy below)

# Session State
Last updated: 2026-03-17

## Current Goal
Build ShipOps — maritime ship agency SaaS. Currently in UI prototype phase.

## Completed
- Loaded ships_register.csv (52K vessels) into DB
- Loaded foreign_ports (4,096 rows from Schedule K Q4 2025)
- Loaded us_ports (506 rows from CBP Schedule D Feb 2026)
- Seeded offices (NOL, HOU, MOB)
- vessels API — tenant first, ships_register fallback
- ports API — US + foreign search modes
- port-calls API — NOL-2026-NNNNN file numbering
- port-calls/[id] PATCH (file_status) + GET detail
- NewPortCallModal, FileStatusActions components
- globals.css dark theme, Sidebar redesign
- AutoOpenModal v2 — matches ship-agency-platform.jsx reference artifact
- White text, matrix green, scope dropdown, vessel search fixed

## Key Decisions
- Reference artifact: agency_platform/ship-agency-platform.jsx
- File numbering: {OFFICE_CODE}-{YEAR}-{NNNNN}
- Sub-files = sibling files sharing same nominator
- Money in cents (integers)
- 9-phase state machine
- Two layers: Accounting (AR/AP) vs Commercial (nominator attribution)
- PostgreSQL on port 5433 (Docker), never 5432
- GitHub: https://github.com/theshipsagent/agency_platform
