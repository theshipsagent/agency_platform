# Service File Pattern — Design Reference
**Created:** 2026-03-29
**Status:** Design concept — not yet built

---

## Core Principle

The **9-phase port call workflow is the universal spine**. Port call type (Discharge, Load, Bunkering, etc.) does NOT change the workflow — it only changes which fields, forms, documents, and expense categories appear within each phase. All service tracks flow through the same pipeline.

---

## Overview

Every piece of work the agency performs is a **Service File**. A Service File can either be **linked** to a parent port call (sharing vessel/port/principal context) or **standalone** (its own top-level record with independent lifecycle).

This pattern applies universally to all file types for architectural consistency.

---

## Service Tracks

```
Port Call (vessel event — 9-phase spine)
├── Operations          ← physical vessel lifecycle (universal)
├── Accounting          ← financial lifecycle (universal, scales to fit)
├── Liner/Traffic       ← cargo documentary, import-side (always linked)
├── Forwarding          ← export documentary (linked OR standalone)
├── Husbandry           ← crew/stores/provisions (linked OR standalone)
└── Protecting Agency   ← watching brief (linked OR standalone)
```

---

## File Types

| File Type | Description | Linked | Standalone | Always Linked? |
|-----------|-------------|--------|-----------|----------------|
| **Full Agency** | Primary port call — full ops, accounting, 9-phase workflow | IS the port call | Always top-level | N/A |
| **Liner/Traffic** | Import cargo documentary — B/L collection, customs release, arrival notices, delivery orders, wharfage | Tab on port call | **No** — always tied to a vessel/cargo event | **Yes** |
| **Forwarding** | Export documentary — B/L issuance, manifest, certificates, customs export | Tab on parent port call | Own file when ops not handling vessel | No |
| **Husbandry** | Provisions, crew, stores, cash to master — coordination services | Tab on parent port call | Own file when another agent has primary call | No |
| **Protecting Agency** | Watching brief, owner's interest representation | Tab on parent port call | Own file (rare but supported) | No |

---

## Liner/Traffic vs Forwarding

These are the import-side and export-side mirrors of cargo documentary work:

| Aspect | Liner/Traffic (Import) | Forwarding (Export) |
|--------|----------------------|-------------------|
| **Direction** | Inbound cargo | Outbound cargo |
| **B/L handling** | Collect originals, trace release | Issue drafts, approve, release originals |
| **Customs** | Trace CBP release, holds, exams | File export declaration, AES/EEI |
| **Notices** | Generate arrival notices to consignees | Shipping instructions from shippers |
| **Cargo release** | Delivery orders once freight cleared | Dock receipts, mate's receipts |
| **Charges** | Collect wharfage from cargo interests | Consular fees, certificate fees |
| **Standalone?** | No — always on a port call | Yes — can exist without ops involvement |
| **Port call types** | Primarily DISCHARGE, LOAD_DISCHARGE | Primarily LOAD, LOAD_DISCHARGE |

### Liner/Traffic Functions (Discharge / Import)
- Receive inbound manifest from ocean carrier
- Generate arrival notices to consignees / notify parties
- Trace customs release (CBP entry, holds, exams, inspections)
- Collect original B/Ls or verify telex release / sea waybill
- Issue delivery orders once freight + charges cleared
- Collect wharfage / terminal handling charges from cargo interests
- Track free time / demurrage on cargo at terminal
- Coordinate with steamship line for cargo release

### Liner/Traffic Functions (Load / Export)
- Receive shipping instructions from shippers
- Booking confirmation with ocean carrier
- Dock receipts, mate's receipts
- B/L drafts → approval → originals (overlaps with Forwarding)
- Manifest preparation

---

## Linking Behavior

- **Linked (tabbed in):** Service file appears as a tab on the parent port call detail page. Inherits vessel, port, terminal, principal context. Shares timeline visibility.
- **Standalone (tabbed out):** Service file accessed from its own dashboard. Has its own file number. Own lifecycle. No parent port call.
- **Link/Delink:** Can attach or detach at any time. Linking copies context from parent; delinking removes the reference but does not delete the file.

---

## File Numbering

- Full Agency: `{OFFICE}-{YEAR}-{NNNNN}` (e.g., NOL-2026-00001)
- Husbandry: `{OFFICE}-{YEAR}-{NNNNN}-H` (linked) or `{OFFICE}-{YEAR}-H0001` (standalone)
- Forwarding: `{OFFICE}-{YEAR}-{NNNNN}-F` (linked) or `{OFFICE}-{YEAR}-F0001` (standalone)
- Protecting: `{OFFICE}-{YEAR}-{NNNNN}-P` (linked) or `{OFFICE}-{YEAR}-P0001` (standalone)
- Liner/Traffic: `{OFFICE}-{YEAR}-{NNNNN}-T` (always linked, suffix on parent file number)

---

## Port Call Type → UI Config

The port call type determines what appears WITHIN the workflow, not the workflow itself:

```typescript
PORT_CALL_TYPE_CONFIG: Record<PortCallType, {
  tabs: TabId[]                    // which tabs show
  timelineEvents: TimelineEventType[]  // relevant SOF events
  cargoRequired: boolean
  showLaytime: boolean
  showDraftSurvey: boolean
  showLinerTraffic: boolean        // Liner/Traffic tab
  showForwarding: boolean          // Forwarding tab (if export)
  expenseCategories: ExpenseCategory[]
  defaultTasks: string[]
}>
```

| Feature | DISCHARGE | LOAD | BUNKERING | CREW_CHANGE | REPAIRS | LAY_UP |
|---------|-----------|------|-----------|-------------|---------|--------|
| Cargo tab | Full | Full | Hidden | Hidden | Hidden | Hidden |
| Liner/Traffic | Yes (import) | Yes (export) | No | No | No | No |
| Forwarding | No | Yes | No | No | No | No |
| Draft survey | Yes | Yes | No | No | No | No |
| Laytime | Yes | Yes | No | No | No | No |
| Timeline depth | Full SOF | Full SOF | Minimal | Minimal | Milestones | Monthly |

---

## Phase Workflows

### Full Agency (9 phases — existing)
```
Proforma Estimated → Awaiting Appointment → Appointed → Active → Sailed → Completed → Processing FDA → Awaiting Payment → Settled
```

### Husbandry / Forwarding / Protecting (simplified — ~5 phases)
```
REQUESTED → IN PROGRESS → COMPLETED → INVOICED → SETTLED
```

### Liner/Traffic (follows parent port call phases — no independent phase)
Liner/Traffic work is phase-aware but doesn't have its own phase lifecycle. It activates when the port call reaches relevant phases and its tasks/documents are gated by the parent's phase.

These simplified phases run **in parallel** to the parent port call's ops phases when linked. The simplified accounting flow scales down accordingly (smaller DAs, fewer expense lines, typically just agent fee + minor out-of-pockets).

---

## Role-Based Access

| Role | Full Agency | Liner/Traffic | Forwarding | Husbandry | Protecting |
|------|-------------|--------------|------------|-----------|------------|
| Admin | Full | Full | Full | Full | Full |
| Ops / Operator | Full | View | View | View (unless assigned) | View |
| Traffic Clerk | View ops | **Full** | View | View | View |
| Forwarding Clerk | View ops | View | **Full** | View | View |
| Husbandry Clerk | View ops | View | View | **Full** | View |
| Accounting | Financial tabs | Financial tabs | Financial tabs | Financial tabs | Financial tabs |
| Customer / Principal | Portal view | Portal view | Portal view (shipper) | Portal view | Portal view |

Note: Role granularity TBD — may be permission flags on existing roles rather than new role types.

---

## Data Model Concept (not yet in schema)

```
service_files
├── id (UUID)
├── tenant_id
├── file_number (unique)
├── file_type (HUSBANDRY | FORWARDING | PROTECTING | LINER_TRAFFIC)
├── port_call_id (nullable for H/F/P, required for LINER_TRAFFIC)
├── vessel_id, port_id, principal_id (inherited or set directly)
├── status (simplified phase enum — not applicable to LINER_TRAFFIC)
├── ... (type-specific fields TBD)
```

Or: each file type gets its own table (forwarding_files, husbandry_files, liner_traffic) with a nullable/required `port_call_id`. TBD based on how much schema overlap exists.

---

## Impact on Current Build

- **Nothing needs to change now.** The existing port call detail page tab structure naturally accommodates service tracks as additional tabs.
- `parentPortCallId` (nullable) is already in the port_calls schema.
- The `PORT_CALL_TYPE_CONFIG` map will control which tabs/features appear per port call type.
- When service file modules are built, they plug in as:
  - A tab on the port call detail page (linked mode)
  - A standalone dashboard view (standalone mode, where applicable)
  - API routes under `/api/service-files/[type]/` or similar
- **Placeholder tabs** reserved in detail page build: Liner/Traffic, Forwarding, Husbandry

---

## Open Questions

1. One table for all service files, or separate tables per type?
2. Exact simplified phase labels for each type
3. Forwarding document type taxonomy (B/L variants, certificates, etc.)
4. Liner/Traffic document taxonomy (arrival notices, delivery orders, etc.)
5. Husbandry workflow granularity (what sub-steps within "In Progress"?)
6. Role model: new roles vs. permission flags on existing roles?
7. Customer portal: magic-link access for shippers/consignees?
8. Overlap between Liner/Traffic (load side) and Forwarding — where's the boundary?
