# User Convo — ShipOps
**Project:** ShipOps (multi-tenant SaaS for ship agencies)
**Location:** ~/dev/shipops/
**Started:** 2026-03-29

---

## Session: 2026-03-29

### Phase D Progress
- Phase transition API built + tested (PATCH /api/port-calls/[id]/phase)
- Sub-status API built (AT_ANCHOR → BERTHED → WORKING_CARGO → CARGO_COMPLETE)
- Port call detail page: layout + header + tab navigation + Summary tab with KPI strip
- PhaseControls dialog + SubStatusControls inline buttons
- Tabs filtered by port call type (Cargo/Liner/Forwarding show/hide per type)

### Design Discussions

**Service File Pattern** — all agency work is a Service File that can be linked to a port call or standalone:
- Full Agency (IS the port call, 9 phases)
- Husbandry (linked or standalone, simplified phases)
- Forwarding (linked or standalone, export docs — B/L, manifest, certificates)
- Liner/Traffic (always linked, import docs — customs release, arrival notices, delivery orders)
- Protecting Agency (linked or standalone, rare standalone but supported for consistency)

**Key decisions:**
- 9-phase workflow is the universal spine — port call type only changes fields/forms/tabs within phases
- BUNKERING_ONLY and CREW_CHANGE_ONLY may move to husbandry service files (TBD)
- Forwarding file number can link/delink to port call — sometimes spin-off, sometimes standalone
- Liner/Traffic = import-side mirror of Forwarding (export-side)
- All service file types get same linked/standalone capability for consistency
- PORT_CALL_TYPE_CONFIG map drives UI (which tabs, timeline events, expense categories show)

**Open items for other sessions:**
- Branded document design (PDA, SOF, etc.) — separate session
- Forwarding workflow granularity — needs detailed discussion
- Husbandry simplified phase definitions
- Role model: new roles vs permission flags for forwarding/traffic clerks

### Next Steps
1. DSS guardrails in wizard
2. Remaining tab content (Operations, Tasks, Documents, Funding, Disbursement)
3. Service file modules (pending design decisions)

---
