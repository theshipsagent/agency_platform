# ShipOps — Ship Agency Operational Platform

## Product Brief for Scaffold

---

## What is this?

ShipOps is a multi-tenant SaaS platform for maritime ship agencies. It manages the full lifecycle of a port call — from the moment an agency is nominated to handle a vessel through final disbursement settlement and close-out.

Ship agencies are the local coordinators for vessels calling at ports. They arrange pilots, tugs, berths, customs clearance, surveyors, stevedores, provisions, crew services, and dozens of other services. They advance funds on behalf of vessel owners/charterers (called "principals"), pay local vendors, and render a Final Disbursement Account (FDA) for reimbursement.

The platform serves three user types:
1. **Agency operators** — the primary users who manage port calls day-to-day
2. **Principals (customers)** — charterers, owners, cargo interests who view their port calls, approve disbursements, and settle accounts via a customer portal
3. **Third-party approvers** — vendors, surveyors, masters, receivers who interact via magic links (token-scoped, no account required) for document approvals and invoice submissions

---

## Port Call Lifecycle — 9 Phases

Every port call moves through these phases. This is the core state machine of the platform.

### Phase 1: Proforma Estimated
- Agency receives inquiry from principal
- Operator creates a prospect: selects port call type, vessel (if known), port, terminal, cargo, service scope
- System auto-generates a Proforma Disbursement Account (DA) from rate cards + vessel size + cargo type
- Operator reviews/adjusts and sends proforma to principal
- **Status:** Pipeline/prospect — not yet appointed

### Phase 2: Awaiting Appointment
- Proforma sent, waiting for principal to confirm
- System tracks aging of unconfirmed prospects
- Auto-reminders if no response within configurable window
- Pipeline value tracking (sum of all pending proformas)

### Phase 3: Appointed
- Principal confirms agency appointment
- Full port call record created (unique ID: PC-YYYY-NNNN)
- Pre-arrival operations begin: order pilots/tugs, file CBP advance notice, request crew list, coordinate surveyors
- Task checklist auto-generated based on port call type + service scope
- Funding request sent to principal (proforma amount)
- Funding receipt monitored — alert if not received by ETA minus 48 hours

### Phase 4: Active Port Call
Sub-statuses within this phase:
- **At Anchor** — vessel arrived, waiting for berth. NOR tendered. Laytime clock may start. Anchorage costs accruing.
- **Berthed** — all fast. CBP formal entry, free pratique, inspections. Draft survey. Dockage accrual begins.
- **Working Cargo** — cargo operations in progress. Monitoring discharge/load rate, logging delays. Short-funding alerts active (burn rate vs. funded amount). SOF building automatically.
- **Cargo Complete** — discharge/load finished. Final draft survey. SOF circulated for sign-off. Outbound pilots/tugs ordered.

### Phase 5: Sailed Port Call
- Vessel departed
- Operations wrapping up — collecting final documents
- Accounting takes lead: chasing outstanding vendor invoices, matching invoices to DA line items, verifying amounts, flagging variances
- Progress tracker: X of Y invoice lines received
- Transition trigger: all invoices collected + verified

### Phase 6: Completed Port Call
- All invoices in — actual DA compiled by system
- Agency fee calculated
- Proforma vs. actual variance report generated
- Accounting reviews, makes final adjustments
- Management signs off
- Operator clicks "Render FDA" — sends to principal

### Phase 7: Processing FDA
- Principal reviews FDA + supporting documents (via portal or magic link)
- Three outcomes: Approve (→ Phase 8), Request adjustment (→ loop), Dispute items (→ internal resolution)
- Dispute handling stays within this phase: accounting gathers backup, management negotiates, revised FDA issued if needed
- Auto-reminders to principal, escalation alerts if aging exceeds threshold

### Phase 8: Awaiting Payment
- FDA approved, settlement balance calculated: (Total FDA) − (Funds already received) = Balance due
- If principal owes agent → balance invoice sent, enters AR aging (current → 30 → 60 → 90+ days)
- If agent owes principal (overfunded) → refund notice generated
- Auto-send payment reminders at configurable intervals
- Parallel: vendor payments (AP) — verified invoices paid per vendor terms
- Agency float tracked: vendor payments made before principal settles

### Phase 9: Settled
- Full payment received, all vendors paid, balance = zero
- Record locked (no edits without manager override)
- All documents archived (7-year retention)
- Cost data feeds analytics engine
- Vessel and principal profiles updated
- **Sub-status: Pending Demurrage/Despatch** — if laytime claim exists, stays open until resolved

---

## Data Model — Core Entities

### Port Call (the central record)
- Port call ID, phase/status, sub-status
- Port call type: Discharge, Load, Load/Discharge, Transshipment, Bunkering Only, Crew Change Only, Repairs/Drydock, Lay-up, Transit, Survey/Inspection Only
- Links to: vessel, principal, port/terminal, cargo lines, timeline events, expenses, documents, funding records, tasks

### Vessel
- IMO number (unique identifier), MMSI, call sign
- Name, flag state, vessel type/class
- LOA, beam, summer draft, GT, NT, DWT
- Owner, registered owner, operator, manager (four separate entities)
- P&I club, classification society
- Built year, builder
- Historical port call data (auto-built over time)

### Organization (principals, vendors, all external parties)
- Company name, type (principal/vendor/surveyor/terminal/government), tax ID
- Contact details, banking/wire instructions, payment terms
- Credit score (auto-calculated from payment history)
- Relationship roles (can be charterer on one port call, owner on another)

### Port & Terminal
- Port name, UN/LOCODE, country, region
- Terminals within port (name, type, berths, draft restrictions)
- Pilot stations, anchorage areas
- Rate data: dockage rates, wharfage rates, pilot tariffs
- Operating schedule, closure history

### Cargo Line (one or more per port call)
- Commodity (from classification taxonomy), quantity, unit
- Stowage factor, hazmat classification (if applicable)
- Shipper, receiver, B/L number
- Actual quantity (updated after draft survey)

### Timeline Event (Statement of Facts)
- Port call reference, event type, timestamp, source, confirmed (yes/no)
- Standard events: ETA received, arrived pilot station, NOR tendered, NOR accepted, free pratique, all fast, commenced cargo, rain delay start/end, completed cargo, sailed
- Custom events (operator-defined)

### Expense (Disbursement Account line item)
- Port call reference, vendor, category, description
- Proforma amount, actual amount, invoice amount
- Status: Estimated → Accrued → Invoice Received → Verified → Approved → Paid
- Approval chain (who approved, when, at what tier)
- Linked invoice document(s)

### Funding Record
- Port call reference, principal, amount, date, status (requested/received)
- Wire reference, bank details
- Running balance calculation

### Document
- Port call reference, document type (NOR, SOF, B/L, Invoice, Survey, Customs, etc.)
- Source: scanned (mobile), email attachment, uploaded, system-generated
- OCR text (for scanned documents), file storage reference
- Version history

### Task
- Port call reference, task template reference
- Description, assignee, due date (absolute or relative to milestone)
- Status: pending, in progress, done, blocked
- Dependencies (this task requires that task to be complete first)

### User / Agency Staff
- Name, email, role (operator, accounting, manager, admin)
- Office/port assignment
- Permissions (what phases they can act on, approval tier limits)

### Tenant (Agency)
- Agency name, offices/ports covered
- Branding (for white-label portal)
- Subscription tier
- Rate cards, approval thresholds, notification preferences

---

## Feature Domains (MVP scope marked with ★)

### 1. Core Operations ★
- Port call dashboard with status filters
- Port call creation wizard (staged intake, dropdowns for all enumerations)
- Timeline / SOF management (timestamp entry, event logging)
- Task checklist engine (auto-generated per port call type)
- OmniBar universal search (Cmd+K — searches across all entities)
- Edit/save workflow with audit trail

### 2. Accounting & Finance ★
- Disbursement account lifecycle (proforma → actual → FDA)
- Invoice ingestion (email attachment, mobile scan, manual upload)
- Expense tracking with status workflow
- Tiered approval workflows (configurable thresholds per principal)
- Short-funding alerts (burn rate monitoring: daily costs × remaining days vs. funded amount)
- Funding request and receipt tracking

### 3. Customer Portal ★
- Principal login (separate auth, scoped to their port calls only)
- Read-only view of port call status, timeline, documents
- FDA review and approval workflow
- Funding status tracker
- Magic link access for third-party approvals (token-scoped, no account)

### 4. Document Management ★
- Upload, store, tag documents to port calls
- OCR for scanned documents (Azure AI Document Intelligence)
- Document type classification
- Version history
- Search across document content

### 5. Platform Infrastructure ★
- Multi-tenant architecture (agency = tenant)
- Role-based access control (operator, accounting, manager, admin)
- Multi-office support (office-level data scoping)
- Offline-first with sync (IndexedDB → server on reconnect)
- Audit log (every action logged, immutable)
- iOS companion app (React Native — document scanning + mobile data entry)

### 6. Communication & AI (Phase 2)
- O365 email integration via Microsoft Graph API
- Email classification and routing to port calls
- Data extraction from emails (ETA, dates, figures)
- Operator alerts and suggested actions
- Automated status broadcasting at milestones

### 7. Regulatory & Compliance (Phase 2)
- CBP entry automation and tonnage tax calculator
- Customs holds monitoring
- Sanctions screening (OFAC)
- Compliance document tracking

### 8. Intelligence & Analytics (Phase 2-3)
- Cost trend analytics (by vendor, terminal, vessel size, cargo type)
- Proforma accuracy tracking (estimate vs. actual over time)
- Principal payment behavior analytics
- Port cost benchmarking
- Rate card management

### 9. OceanDatum Reporting (Phase 2-3)
- Port authority schedule ingestion
- Daily intelligence report generation
- PDF email distribution to subscriber lists
- Subscription management

---

## Enumeration Values (for dropdowns)

### Port Call Types
Discharge, Load, Load/Discharge, Transshipment, Bunkering Only, Crew Change Only, Repairs/Drydock, Lay-up, Transit, Survey/Inspection Only

### Cargo Types
Dry Bulk, Break Bulk/Neo-Bulk, Liquid Bulk, Containerized, RoRo/Vehicles, Project Cargo/Heavy Lift, Tanker (Clean), Tanker (Dirty/Crude), Chemical Tanker, Gas Carrier (LPG/LNG)

### Port Call Phases
1-Proforma Estimated, 2-Awaiting Appointment, 3-Appointed, 4-Active Port Call, 5-Sailed Port Call, 6-Completed Port Call, 7-Processing FDA, 8-Awaiting Payment, 9-Settled

### Active Port Call Sub-Statuses
At Anchor, Berthed, Working Cargo, Cargo Complete

### Settled Sub-Statuses
Fully Settled, Pending Demurrage/Despatch Claim

### Expense Statuses
Estimated, Accrued, Invoice Received, Verified, Approved, Paid

### Funding Statuses
Requested, Received

### Task Statuses
Pending, In Progress, Done, Blocked

### Document Types
NOR, SOF, B/L, Manifest, Invoice, Receipt, Survey Report, Customs Entry, Crew List, Stores List, Stowage Plan, Mate's Receipt, Tally Sheet, Outturn Report, Charter Party, Agency Agreement, Correspondence, Other

### Document Sources
Scanned (mobile), Email Attachment, Manual Upload, System Generated

### Expense Categories
Pilotage, Towage, Dockage/Wharfage, Stevedoring, Launch/Water Taxi, Provisions/Stores, Surveyors, Customs/CBP, Immigration, Fumigation, Waste Removal, Line Handlers, Watchmen, Crew Change, Medical, Cash to Master, Bunkers, Freight Tax, Tonnage Tax, Agency Fee, Communication, Transportation, Miscellaneous

### Service Scope (checkboxes on port call creation)
Full Agency, Husbandry Only, Protecting Agency, Customs Clearance, Crew Change, Stores/Provisions, Medical, Cash to Master, Bunker Coordination, Surveyor Coordination, Stevedoring Coordination, Launch/Water Taxi, Waste Removal, Immigration/Shore Leave

### User Roles
Operator, Accounting, Manager, Admin

### Organization Types
Principal (Charterer), Principal (Owner), Principal (Cargo Interest), Vendor, Surveyor, Terminal Operator, Government Agency, Broker, Correspondent Agent

---

## API Surface (high-level)

### Port Calls
- CRUD port calls
- Phase transitions (with validation — can't skip phases)
- Sub-status updates within Phase 4
- Port call search and filter (by phase, port, vessel, principal, date range)

### Vessels
- CRUD vessels
- IMO lookup integration
- Vessel search

### Organizations (principals, vendors)
- CRUD organizations
- Contact management
- Credit score retrieval

### Timeline / SOF
- Add/edit/delete timeline events for a port call
- SOF generation (formatted output)

### Expenses / DA
- CRUD expense lines for a port call
- Proforma generation (from rate cards)
- FDA compilation
- Approval workflow actions (approve, reject, escalate)

### Funding
- Record funding requests and receipts
- Balance calculation
- Short-funding alert check

### Documents
- Upload, tag, retrieve documents
- OCR trigger
- Document search (metadata + content)

### Tasks
- Task generation from templates
- Task assignment and status updates
- Task dependencies

### Auth / Users
- Agency (tenant) management
- User CRUD within tenant
- Role assignment
- Principal portal user management
- Magic link generation and validation

### Portal (principal-facing)
- Scoped read endpoints (port calls, timeline, documents, DA)
- FDA approval/dispute actions
- Funding status

---

## Non-Functional Requirements

- **Multi-tenant isolation**: Agency A cannot see Agency B's data. Enforced at query level.
- **Audit trail**: Every create/update/delete logged with user, timestamp, before/after values. Immutable.
- **Offline support**: Frontend works against IndexedDB when offline. Sync queue replays on reconnect. Last-write-wins with timestamps.
- **Performance**: Dashboard should load in under 2 seconds with 100+ active port calls.
- **Data retention**: 7-year minimum for compliance (customs, tax).
- **Security**: Role-based access, tenant isolation, encrypted at rest, TLS in transit.
