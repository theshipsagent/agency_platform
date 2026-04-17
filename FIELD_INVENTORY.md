# ShipOps — Field Inventory & Data Crosswalk
**Last updated:** 2026-03-20
**Purpose:** Single source of truth for every data point in the platform. Maps fields to DB entities, UI tabs, role access, approval gates, and computed vs stored status. Reference this before building any new screen, API route, or form.

---

## Legend

**Tab codes**
- `HDR` = Page header (always visible)
- `SUM` = Summary tab
- `OPS` = Operations tab
- `CGO` = Cargo tab
- `VDA` = Voyage DA tab
- `HSB` = Husbandry tab
- `DOC` = Documents tab
- `TSK` = Tasks tab
- `WIZ` = New File Wizard (creation only)
- `DSH` = Dashboard / port call list
- `ORG` = Organization profile page
- `VES` = Vessel profile page

**Write access codes**
- `AJ` = Agent Junior
- `AF` = Agent Full
- `AC` = Accounting
- `FW` = Forwarding
- `MG` = Manager
- `EX` = Executive
- `AN` = Analyst
- `AD` = Admin
- `CU` = Customer (external portal)

**Special flags**
- `🔒 APPROVAL` = edit requires supervisor approval before committing
- `⚡ CASCADE` = change triggers downstream recalculation
- `🧮 COMPUTED` = never stored, always derived at query time
- `🔗 EXTERNAL` = requires principal/owner token-link approval
- `📧 NOTIFY` = change fires notification to one or more parties
- `🛡 SENSITIVE` = audit logged with before/after snapshot

---

## 1. Global / Inherited Fields
> Set once at file creation. Read everywhere. Changes are rare and require approval.

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| File number | `PortCall.portCallNumber` | HDR, DSH, WIZ | System only | 🛡 SENSITIVE | Auto-generated: `{OFFICE}-{YEAR}-{NNNNN}` |
| Office | `PortCall.officeId → Office` | HDR, SUM, WIZ | WIZ: AF+ | 🛡 SENSITIVE | Scopes port list, vendor list, fee agreements |
| Phase | `PortCall.phase` | HDR, SUM, DSH | AF+, MG approval for backward | 🔒 APPROVAL 📧 NOTIFY ⚡ CASCADE 🛡 SENSITIVE | Phase transitions enforce prerequisites |
| Active sub-status | `PortCall.activeSubStatus` | HDR, DSH | AF+ | 📧 NOTIFY | AT_ANCHOR → BERTHED → WORKING_CARGO → CARGO_COMPLETE |
| File status | `PortCall.fileStatus` | HDR, DSH | MG+ | 🔒 APPROVAL 📧 NOTIFY 🛡 SENSITIVE | ACTIVE / ON_HOLD / CANCELLED |
| Port call type | `PortCall.portCallType` | SUM, WIZ | WIZ: AF+ | 🛡 SENSITIVE | DISCHARGE / LOAD / LOAD_DISCHARGE etc. |
| Service scope | `PortCall.serviceScope[]` | SUM, WIZ | WIZ: AF+ | ⚡ CASCADE | Drives which DA line items are expected |
| Is sub-file | `PortCall.isSubFile` | HDR | System only | — | Set at creation, never changed |
| Parent file | `PortCall.parentPortCallId` | HDR, SUM | System only | — | Links husbandry sub-file to voyage file |
| Assigned agent | `PortCall.assignedAgentId → User` | HDR, SUM | MG+ | 📧 NOTIFY | Notification to new assignee on change |
| Notes (file) | `PortCall.notes` | SUM | AF+ | — | Free text, not audit-critical |
| Hold reason | `PortCall.holdReason` | HDR, SUM | MG+ | 📧 NOTIFY 🛡 SENSITIVE | Displayed in red banner when file on hold |
| Is locked | `PortCall.isLocked` | HDR | MG+ | 🛡 SENSITIVE | Locks all edits — post-settlement |
| Created at | `PortCall.createdAt` | SUM | System | — | |
| Created by | `PortCall.createdBy` | SUM | System | — | |

---

## 2. Vessel Fields
> Vessel is a shared entity — same vessel may appear across many port calls. Changes to vessel particulars affect all open files for that vessel.

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| Vessel name | `Vessel.name` | HDR, SUM, VES, WIZ | AF+, lookup from ships_register | 🛡 SENSITIVE | Display name — from register |
| IMO number | `Vessel.imoNumber` | HDR, SUM, VES | AF+, lookup | 🛡 SENSITIVE | Unique key for vessel lookup |
| MMSI | `Vessel.mmsi` | VES | AF+ | — | AIS tracking |
| Call sign | `Vessel.callSign` | VES | AF+ | — | |
| Flag state | `Vessel.flagState` | HDR, SUM, VES | AF+ | — | 2-letter ISO |
| Vessel type | `Vessel.vesselType` | SUM, VES | AF+ | — | Bulk Carrier, Tanker, etc. |
| LOA (m) | `Vessel.loa` | SUM, OPS, VES | AF+ | 🛡 SENSITIVE | Affects berth/terminal compatibility |
| Beam (m) | `Vessel.beam` | VES | AF+ | — | |
| Summer draft (m) | `Vessel.summerDraft` | OPS, VES | AF+ | 🔒 APPROVAL ⚡ CASCADE 🛡 SENSITIVE | Change triggers berth max-draft recheck |
| Gross tonnage | `Vessel.grossTonnage` | SUM, VES | AF+ | ⚡ CASCADE | Drives tonnage tax calculation |
| Net tonnage | `Vessel.netTonnage` | VES | AF+ | ⚡ CASCADE | CBP formal entry base |
| DWT | `Vessel.dwt` | SUM, VES | AF+ | — | |
| Built year | `Vessel.builtYear` | VES | AF+ | — | |
| Owner (org) | `Vessel.ownerId → Organization` | SUM, VES | AF+, MG | — | Auto-populates husbandry paying party |
| Ship manager (org) | `Vessel.managerId → Organization` | SUM, HSB, VES | AF+, MG | — | Default husbandry payer |
| P&I club | `Vessel.piClub` | VES | AF+ | — | |
| Class society | `Vessel.classSociety` | VES | AF+ | — | |

---

## 3. Party Fields
> Who is involved in this port call. Set at creation, occasionally amended.

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| Principal (appointing party) | `PortCall.principalId → Organization` | HDR, SUM, VDA, WIZ | MG+ to change after creation | 🔒 APPROVAL 🛡 SENSITIVE | Who instructed us. Required. |
| Charterer | `PortCall.chartererId → Organization` | SUM, CGO, WIZ | AF+ | 🛡 SENSITIVE | Voyage charterer — may be same as principal |
| Nominator | `PortCall.nominatorId → Organization` | SUM, WIZ | AF+ | — | Revenue attribution for sub-files |
| Husbandry payer | `PortCall(sub).principalId → Organization` | HSB, WIZ | AF+, MG | 🔒 APPROVAL 🛡 SENSITIVE | Ship manager or owner — set on sub-file creation |
| Org account status | `Organization.accountStatus` | WIZ, DSH | MG+ | 🛡 SENSITIVE | ON_HOLD/BLACKLIST blocks new file creation |
| Org hold reason | `Organization.holdReason` | WIZ | Read-only in portal | — | Shown as banner to agent |
| Org warn note | `Organization.warnNote` | WIZ | Read-only | — | Yellow caution banner |
| KYC status | `Organization.kycStatus` | ORG | MG+ | 🛡 SENSITIVE | PENDING/APPROVED/EXPIRED/EXEMPT |
| Credit limit | `Organization.creditLimitCents` | ORG | MG+ | 🛡 SENSITIVE 🔒 APPROVAL | |
| Payment terms | `Organization.paymentTermsDays` | ORG | MG+ | — | |

---

## 4. Port & Terminal Fields
> Port is scoped to the office. Terminal is scoped to the port.

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| Port | `PortCall.portId → Port` | HDR, SUM, WIZ | WIZ: AF+. Change after creation: MG+ | 🔒 APPROVAL 🛡 SENSITIVE | Changing port invalidates vendor assignments |
| Terminal | `PortCall.terminalId → Terminal` | HDR, SUM, OPS, WIZ | AF+ | 🛡 SENSITIVE | |
| Anchorage area | `PortCall.anchorageArea` | OPS | AF+ | — | Free text — while vessel at anchor |
| Terminal max draft | `Terminal.maxDraftM` | OPS | MG+ | 🔒 APPROVAL ⚡ CASCADE 🛡 SENSITIVE | Change cascades to berth compatibility check |
| Terminal max LOA | `Terminal.maxLoaM` | OPS | MG+ | 🔒 APPROVAL 🛡 SENSITIVE | |
| Terminal berths | `Terminal.berthNumbers` | OPS | MG+ | — | Display only |
| Port UN/LOCODE | `Port.unLocode` | SUM | Admin | 🛡 SENSITIVE | |
| Port CBP code | `Port.cbpCode` | OPS | Admin | — | Used in customs entry |

---

## 5. Timing Fields
> The chronological spine of the port call. Most trigger downstream effects.

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| ETA | `PortCall.eta` | HDR, SUM, OPS, WIZ | AF+ | 📧 NOTIFY ⚡ CASCADE | Change fires USCG 96hr notice recalc, funding deadline recalc |
| ETD | `PortCall.etd` | SUM, OPS | AF+ | — | Estimated time of departure |
| NOR tendered | `PortCall.norTenderedAt` | SUM, OPS | AF+ | ⚡ CASCADE 🛡 SENSITIVE | Starts laytime clock |
| NOR accepted | `PortCall.norAcceptedAt` | SUM, OPS | AF+ | ⚡ CASCADE 🛡 SENSITIVE | Laytime calculation reference point |
| All fast | `PortCall.allFastAt` | HDR, SUM, OPS | AF+ | 📧 NOTIFY 🛡 SENSITIVE | Phase 4 prerequisite |
| Arrived | `PortCall.arrivedAt` | OPS | AF+ | 📧 NOTIFY 🛡 SENSITIVE | Vessel physically arrived pilot station |
| Sailed | `PortCall.sailedAt` | SUM, OPS | AF+ | 📧 NOTIFY ⚡ CASCADE 🛡 SENSITIVE | Triggers phase 5; unlocks FDA; triggers SOF finalization |
| Charter party date | `PortCall.charterPartyDate` | CGO, SUM | AF+ | — | |
| Voyage number | `PortCall.voyageNumber` | HDR, SUM, CGO | AF+ | — | Vessel's voyage reference |
| External ref | `PortCall.externalRef` | SUM | AF+ | — | Principal's own file reference |

---

## 6. Cargo Fields
> Owned by the Cargo tab. Cargo-specific calculations derived from these.

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| Cargo group | `PortCall.cargoGroup` | CGO, SUM, WIZ | WIZ: AF+. Change: MG+ | 🔒 APPROVAL ⚡ CASCADE 🛡 SENSITIVE | Drives stevedoring rate, terminal type check |
| Commodity | `CargoLine.commodity` | CGO, WIZ | AF+ | ⚡ CASCADE | Free text — cross-checked against cargo dict |
| Cargo type | `CargoLine.cargoType` | CGO, WIZ | AF+ | ⚡ CASCADE | DRY_BULK / BREAK_BULK / LIQUID_BULK etc. |
| B/L quantity | `CargoLine.quantity` | CGO | AF+ | ⚡ CASCADE | Drives stevedoring proforma if per-MT rate |
| B/L unit | `CargoLine.unit` | CGO | AF+ | — | MT / BBL / TEU / FT3 |
| Actual (outturn) qty | `CargoLine.actualQuantity` | CGO | AF+ | ⚡ CASCADE | Drives actual stevedoring invoice check |
| Shipper (org) | `CargoLine.shipperId → Organization` | CGO | AF+ | — | |
| Consignee (org) | `CargoLine.receiverId → Organization` | CGO | AF+ | — | |
| B/L number | `CargoLine.billOfLadingNumber` | CGO | AF+ | — | |
| Hazmat class | `CargoLine.hazmatClass` | CGO | AF+ | 📧 NOTIFY | If set, fires USCG advance notification alert |
| Stow factor | *(not yet in schema — add)* | CGO | AF+ | — | m³/MT — display calc only, not stored |
| Laytime allowed | *(not yet in schema — add to CargoLine or PortCall)* | CGO | AF+, MG | 🔒 APPROVAL | hours, SHINC/SHEX basis |
| Laytime rate basis | *(not yet in schema)* | CGO | AF+, MG | — | e.g. SHINC, SHEX EIU |
| Demurrage rate ($/day) | *(not yet in schema)* | CGO | AF+, MG | 🔒 APPROVAL ⚡ CASCADE 🛡 SENSITIVE | Drives demurrage claim calculation |
| Despatch rate ($/day) | *(not yet in schema)* | CGO | AF+, MG | 🔒 APPROVAL | |

---

## 7. Operations / Timeline Fields
> Owned by the Operations tab. SOF events are the authoritative factual record.

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| Event type | `TimelineEvent.eventType` | OPS | AF+ | 🛡 SENSITIVE | Fixed enum + CUSTOM |
| Custom label | `TimelineEvent.customLabel` | OPS | AF+ | — | Only used when eventType = CUSTOM |
| Occurred at | `TimelineEvent.occurredAt` | OPS | AF+ | ⚡ CASCADE 🛡 SENSITIVE | Editing confirmed events requires MG+ |
| Source | `TimelineEvent.source` | OPS | AF+ | — | "AIS / Pilot", "Terminal", "Master", etc. |
| Is confirmed | `TimelineEvent.isConfirmed` | OPS | AF+ | — | false = estimated (shown with EST badge) |
| Notes | `TimelineEvent.notes` | OPS | AF+ | — | |

---

## 8. Voyage DA Fields
> Financial ledger for voyage expenses — ring-fenced, not company accounting.
> Paying party: Principal / Charterer.

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| Agency fee | `PortCall.agencyFeeCents` | VDA, SUM, WIZ | MG+, AF can see | 🔒 APPROVAL 🔗 EXTERNAL ⚡ CASCADE 🛡 SENSITIVE | From FeeAgreement, MG must approve changes |
| Proforma total | `PortCall.proformaTotalCents` | HDR, SUM, VDA | 🧮 COMPUTED | — | Sum of all voyage expense proformaAmounts |
| Actual total | `PortCall.actualTotalCents` | HDR, SUM, VDA | 🧮 COMPUTED | — | Sum of voyage expense actualAmounts |
| Funded total | `PortCall.fundedTotalCents` | HDR, SUM, VDA | 🧮 COMPUTED | — | Sum of RECEIVED FundingRecords |
| Balance | *(derived)* | HDR, SUM, VDA | 🧮 COMPUTED | — | fundedTotal − actualTotal |
| Expense — vendor | `Expense.vendorId → Organization` | VDA | AF+ | 📧 NOTIFY | Vendor notified on assignment? TBD |
| Expense — category | `Expense.category` | VDA | AF+ | ⚡ CASCADE | Drives line item grouping on DA |
| Expense — description | `Expense.description` | VDA | AF+ | — | |
| Expense — proforma amt | `Expense.proformaAmount` | VDA | AF+, MG for >threshold | 🔒 APPROVAL ⚡ CASCADE 🛡 SENSITIVE | Approval threshold from User.approvalTierLimit |
| Expense — actual amt | `Expense.actualAmount` | VDA | AF+ | ⚡ CASCADE 🛡 SENSITIVE | Set when invoice received |
| Expense — invoice amt | `Expense.invoiceAmount` | VDA | AF+ | — | Raw invoice figure before any query |
| Expense — status | `Expense.status` | VDA | AF+, MG for APPROVED | 🔒 APPROVAL for APPROVED+ | ESTIMATED→ACCRUED→INVOICE_RECEIVED→VERIFIED→APPROVED→PAID |
| Expense — invoice ref | `Expense.invoiceRef` | VDA | AF+ | — | Vendor invoice number |
| Expense — approved by | `Expense.approvedBy` | VDA | MG+ | 🛡 SENSITIVE | Set on approval action |
| Expense — approval tier | `Expense.approvalTier` | VDA | System | — | Which tier approved this line |
| FDA rendered at | `PortCall.fdaRenderedAt` | VDA | System / AF+ | 📧 NOTIFY 🛡 SENSITIVE | Date FDA document generated |
| FDA approved at | `PortCall.fdaApprovedAt` | VDA | MG+ | 🔒 APPROVAL 📧 NOTIFY 🔗 EXTERNAL 🛡 SENSITIVE | Internal approval then external token |
| FDA approved by | `PortCall.fdaApprovedBy` | VDA | System | 🛡 SENSITIVE | |
| Settled at | `PortCall.settledAt` | VDA, SUM | MG+ | 🔒 APPROVAL 🛡 SENSITIVE | Balance must = 0 |

---

## 9. Husbandry Fields
> Parallel ledger on sub-file (isSubFile = true). Same structure as Voyage DA.
> Paying party: Shipowner / Ship Manager.

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| Husbandry payer | `PortCall(sub).principalId` | HSB, WIZ | AF+, MG to change | 🔒 APPROVAL 🛡 SENSITIVE | Ship Manager by default (from Vessel.managerId) |
| All expense fields | Same as Voyage DA — `Expense.*` | HSB | AF+, FW | Same flags as VDA | Scoped to sub-file portCallId |
| Husb proforma total | 🧮 COMPUTED | HSB, HDR | — | — | Sum of sub-file expense proformaAmounts |
| Husb actual total | 🧮 COMPUTED | HSB, HDR | — | — | |
| Husb funded total | 🧮 COMPUTED | HSB, HDR | — | — | |
| Husb balance | 🧮 COMPUTED | HSB, HDR | — | — | |
| Husb FDA approved | `PortCall(sub).fdaApprovedAt` | HSB | MG+ | 🔒 APPROVAL 🔗 EXTERNAL | Separate FDA to ship manager |

---

## 10. Funding Fields
> Tracks money in — separate records per wire receipt.

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| Amount requested | `FundingRecord.amount` (REQUESTED) | VDA, HSB | AF+ | 📧 NOTIFY | Notification to principal on request |
| Amount received | `FundingRecord.amount` (RECEIVED) | VDA, HSB | AC, MG | 🛡 SENSITIVE ⚡ CASCADE | Updates funded total, recomputes balance |
| Wire reference | `FundingRecord.wireReference` | VDA, HSB | AC | — | |
| Requested at | `FundingRecord.requestedAt` | VDA, HSB | System | — | |
| Received at | `FundingRecord.receivedAt` | VDA, HSB | AC | 🛡 SENSITIVE | |
| Principal (payer) | `FundingRecord.principalId` | VDA, HSB | System | — | Links to correct paying org |

---

## 11. Document Fields
> Storage-agnostic — blob adapter (Azure / R2 / SharePoint) + metadata row.

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| Document type | `Document.documentType` | DOC | AF+ | — | NOR / SOF / INVOICE / etc. |
| Source | `Document.source` | DOC | System / AF+ | — | EMAIL_ATTACHMENT / SCANNED / UPLOAD / SYSTEM_GENERATED |
| File name | `Document.fileName` | DOC | AF+ | — | |
| Storage key | `Document.storageKey` | DOC (hidden) | System | 🛡 SENSITIVE | Blob pointer — never expose to client |
| MIME type | `Document.mimeType` | DOC | System | — | |
| Size (bytes) | `Document.sizeBytes` | DOC | System | — | |
| OCR text | `Document.ocrText` | DOC (search) | System | — | Extracted text for search/AI |
| Version | `Document.version` | DOC | System | — | Increments on supersede |
| Previous version | `Document.previousVersionId` | DOC | System | — | Chain — never delete, only supersede |

---

## 12. Task Fields

| Field | DB Entity.Column | Tabs | Write Roles | Flags | Notes |
|-------|-----------------|------|-------------|-------|-------|
| Description | `Task.description` | TSK | AF+ | — | |
| Assignee | `Task.assigneeId → User` | TSK | AF+, MG | 📧 NOTIFY | Notification to new assignee |
| Due at | `Task.dueAt` | TSK | AF+ | — | |
| Status | `Task.status` | TSK | Assignee, MG | — | PENDING → IN_PROGRESS → DONE / BLOCKED |
| Template ID | `Task.templateId` | TSK (hidden) | System | — | Links to auto-generated task templates |
| Depends on | `Task.dependsOnTaskId` | TSK | AF+ | — | Task dependency chain |

---

## 13. Approval Token Fields (External)
> MagicLinkToken already in schema. Used for principal / owner external approvals.

| Field | DB Entity.Column | Used For | Notes |
|-------|-----------------|----------|-------|
| Token | `MagicLinkToken.token` | URL param | UUID, single-use |
| Resource type | `MagicLinkToken.resourceType` | Route | e.g. `"proforma_da"`, `"fda"`, `"husb_fda"` |
| Resource ID | `MagicLinkToken.resourceId` | DB lookup | portCallId |
| Allowed actions | `MagicLinkToken.allowedActions[]` | UI gates | `["approve","request_changes"]` or `["sign"]` |
| Requested email | `MagicLinkToken.requestedEmail` | Audit | Who the email was sent to |
| Expires at | `MagicLinkToken.expiresAt` | Validation | Default: 7 days |
| Used at | `MagicLinkToken.usedAt` | Audit | Null = not yet used |
| Verified at | `MagicLinkToken.verifiedAt` | Audit | When recipient opened the link |

---

## 14. RBAC Matrix

> What each role can do across the platform.

| Capability | AJ | AF | AC | FW | MG | EX | AN | AD | CU |
|------------|----|----|----|----|----|----|----|----|-----|
| View own assigned files | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | own |
| View all office files | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Create new port call | — | ✓ | — | ✓ | ✓ | — | — | ✓ | — |
| Edit operational fields | AJ = own | ✓ | — | ✓ | ✓ | — | — | ✓ | — |
| Edit financial fields | — | ✓ | ✓ | FW=husb | ✓ | — | — | ✓ | — |
| Approve expense lines | — | up to limit | ✓ up to limit | — | ✓ | — | — | ✓ | — |
| Approve phase transitions (backward) | — | — | — | — | ✓ | — | — | ✓ | — |
| Approve sensitive field edits | — | — | — | — | ✓ | — | — | ✓ | — |
| Approve FDA (internal) | — | — | — | — | ✓ | EX = view | — | ✓ | — |
| Issue external approval token | — | ✓ | ✓ | — | ✓ | — | — | ✓ | — |
| View Voyage DA | — | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | own PDA/FDA |
| View Husbandry DA | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Edit org KYC / account status | — | — | — | — | ✓ | — | — | ✓ | — |
| Manage users / offices | — | — | — | — | — | — | — | ✓ | — |
| Export data / reports | — | — | — | — | MG=office | EX=all | ✓ | ✓ | — |
| View audit log | — | — | — | — | ✓ | ✓ | ✓ | ✓ | — |

---

## 15. Approval Workflows

### Type A — Field-Level Internal Approval
**Trigger:** Sensitive field edited by a role below the required threshold.
```
Agent edits [APPROVAL-flagged field]
  → Change saved as PENDING (not committed)
  → ApprovalRequest row created (see schema gap below)
  → Notification → Manager+
  → Manager sees: field name, old value, new value, requestor, reason
  → Approve → change commits, AuditLog written
  → Reject  → change discarded, reason logged, agent notified
```

**Fields requiring this:** tariff rates, agency fee, draft restriction, port change, principal change, phase backward transition.

### Type B — Document Internal Approval
**Trigger:** DA or FDA document generated.
```
Agent generates Proforma DA
  → Status: DRAFT
  → Manager reviews in-app
  → Approves → Status: APPROVED_INTERNAL
  → "Dispatch to Principal" button unlocked → Type C fires
```

### Type C — External Approval (Token Link)
**Trigger:** Manager dispatches PDA/FDA to principal.
```
System creates MagicLinkToken {
  resourceType: "proforma_da" | "fda" | "husb_fda"
  resourceId:   portCallId
  allowedActions: ["approve", "request_changes"]
  requestedEmail: principal.contactEmail
  expiresAt: now + 7 days
}
Email sent → principal clicks link
  → No login required — token validates in URL
  → Read-only document view
  → Principal clicks [Approve] or [Request Changes + comment]
  → On Approve:
      token.usedAt = now
      PortCall.fdaApprovedAt = now
      PortCall.fdaApprovedBy = "external:{email}"
      AuditLog written
      Phase advances (if FDA approval triggers phase 8)
      Agent + Manager notified
```

---

## 16. Cascade / Recalculation Map

> When field X changes, what must be recalculated?

| Field Changed | Recalculates | Notifies |
|---|---|---|
| ETA | USCG 96hr deadline, funding-due deadline, milestone timeline | Agent, Manager if <48hr to deadline |
| Vessel.grossTonnage | Tonnage tax proforma estimate | — |
| Vessel.summerDraft | Berth max-draft compatibility check | Agent if violation |
| CargoLine.quantity | Stevedoring proforma (if per-MT rate), demurrage calc base | — |
| CargoLine.cargoType | Terminal type compatibility check | Agent if mismatch |
| Expense.proformaAmount | PortCall.proformaTotalCents | — if shortfall detected → alert |
| Expense.actualAmount | PortCall.actualTotalCents, balance, shortfall alert | Agent if balance goes negative |
| FundingRecord (RECEIVED) | PortCall.fundedTotalCents, balance | Agent (confirmed receipt) |
| PortCall.sailedAt | Unlock FDA tab, trigger SOF finalization task, phase 5 | Agent, Manager |
| PortCall.phase → SETTLED | Lock file (isLocked=true) | Agent, Manager, Principal (if CUSTOMER role) |

---

## 17. Schema Gaps (Fields Needed, Not Yet in Prisma)

These need to be added in the next schema migration:

| Field | Where | Type | Reason |
|-------|-------|------|--------|
| `stowFactor` | CargoLine | Float? | Ops reference — cargo planning |
| `laytimeAllowedHours` | PortCall or CargoLine | Float? | Demurrage/despatch calculation |
| `laytimeBasis` | PortCall or CargoLine | Enum (SHINC/SHEX/SHEXUU) | Laytime calc |
| `demurrageRateCents` | PortCall | Int? | Per day — drives claim calc |
| `despatchRateCents` | PortCall | Int? | Per day |
| `demurrageClaimCents` | PortCall | Int? | 🧮 or cached result |
| `husbandryPayerId` | — | — | Already covered by sub-file's principalId — no gap |
| `approvalRequests` | New table | — | Internal approval queue (Type A) — see below |
| `externalApprovals` | Extend MagicLinkToken or new | — | Track approval outcome on PDA/FDA per token |

### New Table: ApprovalRequest
```prisma
model ApprovalRequest {
  id            String   @id @default(uuid())
  tenantId      String
  portCallId    String
  requestedBy   String   // userId
  approvedBy    String?  // userId
  entity        String   // "PortCall" | "Expense" | "CargoLine" etc.
  entityId      String   // row id being changed
  field         String   // field name
  oldValue      Json     // snapshot before
  newValue      Json     // proposed value
  reason        String?  // requestor's justification
  status        ApprovalRequestStatus  // PENDING | APPROVED | REJECTED
  decidedAt     DateTime?
  decisionNote  String?
  createdAt     DateTime @default(now())
}

enum ApprovalRequestStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}
```

---

## 18. Computed Fields (Never Store)

| Field | Formula | Displayed On |
|-------|---------|-------------|
| Voyage DA balance | `fundedTotal − actualTotal` | HDR, SUM, VDA |
| Husbandry balance | `husbFunded − husbActual` | HDR, SUM, HSB |
| Funding gap | `proformaTotal − fundedTotal` | VDA Funding sub-tab |
| Days in port | `sailedAt − allFastAt` (hours/24) | SUM, OPS |
| USCG 96hr deadline | `eta − 96 hours` | SUM alerts, milestone timeline |
| Funding due deadline | `eta − 5 days` | SUM alerts, milestone timeline |
| Laytime used | Sum of confirmed cargo time events minus exclusions | CGO |
| Demurrage / despatch | `(laytimeUsed − laytimeAllowed) × dailyRate` | CGO |
| Task completion % | `DONE tasks / total tasks × 100` | TSK, SUM |
| File age (days) | `today − createdAt` | DSH |

---

*Reference this document before building any form, API route, or DB migration. All fields are mapped — if a new field is needed, add it here first.*
