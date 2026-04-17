# Restore Point — Port Call Detail 7-Tab Complete
Created: 2026-03-19
Label: port-call-detail-7tab-complete
Status: Prototype running clean at http://localhost:3001/preview/port-call ✅

---

## What Was Built This Session

### Visual Fix
- Moved all preview pages from `apps/web/app/(dashboard)/preview/` → `apps/web/app/(preview)/preview/`
- Created `apps/web/app/(preview)/layout.tsx` — minimal wrapper (no Sidebar, no Topbar)
- Result: preview pages now render with zero dashboard chrome — clean full-page prototype

### Port Call Detail Page — Full Rewrite
**File:** `apps/web/app/(preview)/preview/port-call/PortCallDetail.tsx`

#### 7 Primary Tabs
| Tab | Accent | Sub-tabs | Paying Party |
|-----|--------|----------|-------------|
| Summary | — | Alerts · Timeline · Phase progress · Both DA cards | — |
| Operations | — | Timeline/SOF · Berth & Port | — |
| Cargo | — | Cargo Lines · Voyage References · Surveys & Draft | — |
| Voyage DA | Blue | Proforma DA · Services & Vendors · Funding · FDA | Principal / Charterer |
| Husbandry | Yellow | Proforma DA · Services · Funding · FDA | Shipowner / Ship Manager |
| Documents | — | Filter chips · Drag-drop · 3-col grid | — |
| Tasks | — | Checklist · auto tags · progress bar | — |

#### Key UI Patterns
- `ExpenseTable` — shared component, props-driven: used by both Voyage DA and Husbandry
- `FundingLedger` — shared component, used by both tabs
- `AlertsPanel` — surfaces OVERDUE + WARNING milestones at top of Summary
- `MilestoneTimeline` — horizontal scrollable, 15 nodes, color-coded by status + category (REG/FIN/HUSB)
- Header KPI strip: Voyage DA KPIs (blue) + divider + Husbandry KPIs (yellow) — always visible
- `HUSB OPEN` badge in header when husbandry sub-file is active
- Husbandry tab "empty state" — "Open Husbandry File" CTA when no sub-file exists yet
- File number convention: `NOL-2026-00847` (voyage) + `NOL-2026-00847-H` (husbandry)

#### Placeholder Data
- Vessel: MV STELLAR HORIZON · IMO 9876543 · Bulk Carrier · MH flag · 82,400 DWT
- Port: New Orleans · Nashville Ave Wharf · Berths 5–9
- Principal: Pacific Basin Shipping · Charterer: Cargill Ocean Transport
- Ship Manager: Pacific Basin Ship Management (husbandry payer)
- Cargo: Pet Coke 54,200 MT · Dry Bulk
- Voyage DA proforma: $87,500 · funded: $62,000 · actual: $52,400
- Husbandry proforma: ~$11,250 · funded: $6,000 (partial)
- 15 MILESTONES including USCG 96hr (OVERDUE) + Funding (WARNING)
- 12 TIMELINE events (8 confirmed, 2 estimated)
- 12 TASKS (6 done, 3 in progress/pending)

---

## Architecture Decisions Locked In This Session

### Tab Structure
- Husbandry = PRIMARY tab, equal weight to Voyage DA — not buried in Finance
- Services & Vendors lives inside Voyage DA tab (authorization layer for expense lines)
- Cargo = primary tab (surveys, laytime, B/L data all live here)
- Operations = Timeline/SOF + Berth & Port only

### Husbandry Sub-File
- Managed INLINE within the Husbandry tab — agent never navigates away to dashboard
- DB: `isSubFile: true` + `parentPortCallId` on a separate PortCall row
- Inherits vessel, port, terminal, dates from parent
- Has its own: paying party, expense lines, funding ledger, FDA
- Escape hatch: "Promote to Full File →" for complex repair/drydock jobs
- Yellow accent throughout to distinguish from voyage (blue)

### DSS / AI Copilot (noted, not yet built)
- Hard-coded rules engine: catch obvious errors (terminal/cargo mismatch, USCG timing, funding gates)
- AI agent copilot: context-aware sidebar chat (port call schema injected as system prompt)
- Hybrid: rules run first, agent handles judgment calls

### Multi-Step Wizard (noted, not yet built)
- Replaces single AutoOpenModal with guided 6-step flow
- Step 1: Vessel & Principal
- Step 2: Port & Terminal
- Step 3: Cargo
- Step 4: Voyage DA setup (scope, initial proforma)
- Step 5: Husbandry (paying party ID, known services)
- Step 6: Confirm & Open → lands on Summary tab of new file

---

## Files State at This Restore Point

| File | Status |
|------|--------|
| `apps/web/app/(preview)/layout.tsx` | NEW — minimal layout |
| `apps/web/app/(preview)/preview/port-call/PortCallDetail.tsx` | CURRENT — full 7-tab rewrite |
| `apps/web/app/(preview)/preview/port-call/page.tsx` | Clean wrapper |
| `apps/web/app/(preview)/preview/new-port-call/AutoOpenModal.tsx` | Copied from (dashboard) — NOT YET UPDATED to wizard |
| `apps/web/app/(dashboard)/preview/` | OLD copies — leave in place, do not delete |
| `packages/db/prisma/schema.prisma` | Schema v2 validated ✅ (see restore_point_2026-03-18_schema-v2-complete.md) |

---

## Dev Environment
- Dev server: `pnpm dev` from monorepo root
- Runs on port 3001 (3000 may be in use)
- Preview URLs:
  - Port call detail: http://localhost:3001/preview/port-call
  - New port call: http://localhost:3001/preview/new-port-call
- Database: Docker PostgreSQL (run `docker compose up -d` from project root if needed)

---

## Next Steps When Resuming
1. **Multi-step wizard** — build `NewFileWizard` at `/preview/new-port-call`
   - 6 steps, progress bar, each step validates minimum required fields
   - Hard-coded DSS guardrails per step (cargo/terminal mismatch, etc.)
2. Wire wizard → real DB (port-calls POST API exists at `/api/port-calls`)
3. Phase transition logic with prerequisite enforcement
4. Seed script: offices, office_ports, terminals, port_vendors
5. AI copilot panel (Phase 2 — after core DB wired)
