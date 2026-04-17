# Port Call Detail Page — Full UX Brainstorm
**Date:** 2026-03-29
**Context:** Designing the screen layout, tab structure, and data flow for the port call detail view in ShipOps. Based on William's 30+ years of paper-based ship agency operations translated to a modern SaaS UI.

---

## The Operator's Mindset

When an operator opens a port call file, they're thinking one of these things:
1. **"Where are we?"** — What phase, what's the vessel doing right now, any alerts?
2. **"What do I need to do?"** — What tasks are pending, who's waiting on me?
3. **"Show me the money"** — What did we estimate, what did we spend, what's funded, what's outstanding?
4. **"Find me that document"** — I need to pull the NOR, the SOF, the invoice for X vendor
5. **"What happened?"** — Timeline of events, audit trail, who changed what when

The UI needs to answer #1 and #2 **instantly** (no clicks), and get to #3-#5 in **one click**.

---

## Screen Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER BAR (always visible, ~80px)                              │
│  PC-2026-00004 │ Phase 4: Active — Working Cargo │ Active        │
│  MV Gulf Trader · HK · 45K DWT │ New Orleans · Nashville Ave    │
│  Pacific Basin Shipping │ Discharge │ Office: NOL               │
│  [Advance Phase ▾]  [Hold]  [Print ▾]  [···]                   │
├──────────────────────────────────────────────────────────────────┤
│  ALERT STRIP (conditional — only shows when something needs      │
│  attention, ~40px, colored background)                           │
│  ⚠ Short-funded: $12,400 needed │ 3 invoices pending review     │
│  📋 2 tasks overdue │ NOR not yet accepted                       │
├───────────┬──────────────────────────────────────────────────────┤
│           │                                                      │
│  TABS     │  TAB CONTENT AREA                                    │
│  (horiz)  │                                                      │
│           │                                                      │
├───────────┴──────────────────────────────────────────────────────┤
│  FOOTER STATUS BAR (~24px, subtle)                               │
│  Created: 15 Mar 2026 │ Updated: 2 hrs ago │ By: J. Smith       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Header Bar — Always Visible

The header is the operator's **cockpit instrument panel**. It never scrolls away.

**Left side:**
- File number (monospace, clickable to copy)
- Phase badge with sub-status (color-coded)
- File status badge (Active / On Hold / Cancelled)

**Middle line:**
- Vessel: name, flag, DWT (clickable → vessel profile)
- Port: name, terminal, berth (clickable → port info)
- Principal: name (clickable → org profile)
- Type: Discharge / Load / etc.

**Right side actions:**
- **Advance Phase** button (primary action — with prerequisite check dialog)
- **Hold / Resume** toggle
- **Print** dropdown → generates PDF of current DA version, SOF, NOR, etc.
- **More (···)** → Edit details, Cancel file, Clone, Link sub-file, Audit log

---

## Alert Strip — Conditional

Only appears when something needs attention. Goes away when resolved. Color-coded:
- **Red:** Account on hold, funding critical, overdue tasks
- **Amber:** Short-funded, invoices pending, approaching deadlines
- **Blue:** Info — new documents received, phase transition available

This replaces the need to hunt through tabs to find problems. The system surfaces them.

---

## Tab Structure — 5 Tabs

### Tab 1: Overview (default landing)

This is the "open the file" view. Everything an operator needs at a glance.

```
┌─────────────────────────────────────────────────────────┐
│  FINANCIAL SNAPSHOT (horizontal strip, always at top)     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Proforma │ │  Actual  │ │  Funded  │ │ Balance  │   │
│  │ $87,500  │ │ $72,340  │ │ $90,000  │ │ +$17,660 │   │
│  │          │ │ 83% of PF│ │ 103% cov │ │Overfunded│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  ┌─────────── LEFT COLUMN ──────────┐ ┌─ RIGHT COL ──┐ │
│  │                                  │ │               │ │
│  │  ACTIVITY / TASKS                │ │  KEY DETAILS  │ │
│  │  ☐ Order inbound pilots          │ │               │ │
│  │  ☐ File CBP advance notice       │ │  Vessel       │ │
│  │  ☑ NOR tendered                  │ │  IMO 9387000  │ │
│  │  ☐ Arrange draft survey          │ │  HK flag      │ │
│  │  ☐ Confirm stevedore schedule    │ │  87,000 DWT   │ │
│  │                                  │ │  LOA 229m     │ │
│  │  RECENT ACTIVITY                 │ │               │ │
│  │  2h ago — Invoice received:      │ │  Port         │ │
│  │    Crescent Towing ($4,200)      │ │  New Orleans  │ │
│  │  5h ago — Phase → Active         │ │  Nashville Av │ │
│  │  1d ago — Funding received:      │ │               │ │
│  │    $90,000 wire ref TT-4429      │ │  Timing       │ │
│  │                                  │ │  ETA: 28 Mar  │ │
│  │                                  │ │  Arr: 28 Mar  │ │
│  │                                  │ │  Berthed: ... │ │
│  │                                  │ │               │ │
│  │                                  │ │  Parties      │ │
│  │                                  │ │  Pacific Basin│ │
│  │                                  │ │  (Owner)      │ │
│  │                                  │ │               │ │
│  │                                  │ │  Cargo        │ │
│  │                                  │ │  Pet Coke     │ │
│  │                                  │ │  45,000 MT    │ │
│  │                                  │ │               │ │
│  │                                  │ │  Service      │ │
│  │                                  │ │  Full Agency  │ │
│  └──────────────────────────────────┘ └───────────────┘ │
│                                                         │
│  NOTES (collapsible)                                    │
│  "Vessel arriving from Bahamas, charterer requests..."  │
└─────────────────────────────────────────────────────────┘
```

**Why this layout:** The left column is *dynamic* (what's happening, what needs doing). The right column is *static reference* (vessel particulars, port info). Operator's eye goes left for action, right for facts. Financial strip at top because money is always the first question.

**Tasks live here** because they're actions on this file — not a separate domain. An operator doesn't think "let me go to the tasks tab." They think "what do I need to do on this file?" Same screen.

---

### Tab 2: Operations (Timeline / SOF)

The operational record — what happened, when, in what order.

```
┌─────────────────────────────────────────────────────────┐
│  TIMELINE / STATEMENT OF FACTS                           │
│                                                         │
│  [+ Add Event]  [Generate SOF PDF]  [Filter ▾]         │
│                                                         │
│  Date       Time    Event                    Source  ✓   │
│  ─────────────────────────────────────────────────────── │
│  28 Mar     0600    ETA received             Email   ✓   │
│  28 Mar     1415    Arrived pilot station    Agent   ✓   │
│  28 Mar     1430    Pilot aboard             Agent   ✓   │
│  28 Mar     1545    All fast · Berth 7       Agent   ✓   │
│  28 Mar     1600    NOR tendered             Agent   ✓   │
│  28 Mar     1615    NOR accepted             Recvr   ✓   │
│  28 Mar     1630    Free pratique granted    CBP     ✓   │
│  29 Mar     0600    Commenced discharge      Terminal ✓  │
│  29 Mar     1200    Rain delay start         Agent   ✓   │
│  29 Mar     1430    Rain delay end           Agent   ✓   │
│  29 Mar     1435    Resumed discharge        Terminal ✓  │
│  ...                                                     │
│                                                         │
│  ┌─ BERTH & PORT INFO ─────────────────────────────┐    │
│  │  Berth: Nashville Ave Wharf, Berth 7            │    │
│  │  Alongside draft: F 9.2m / A 10.1m              │    │
│  │  Air draft: 42m │ Max LOA: 260m │ Beam: no lim  │    │
│  │  Water density: 1.015                           │    │
│  │  Tidal range: 0.3m │ Current: negligible        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─ LAYCAN ────────────────────────────────────────┐    │
│  │  Open: 25 Mar 2026  │  Close: 30 Mar 2026      │    │
│  │  Arrived: 28 Mar — WITHIN LAYCAN                │    │
│  │  Laytime: 72 hrs allowed │ 48 hrs used          │    │
│  │  Demurrage rate: $18,500/day                    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Key insight:** The SOF is built *live* as events are logged. The PDF is just a snapshot print of the current state. The operator logs events here (or they come in from email/AIS integration later). The "Generate SOF PDF" button renders the same data using the HTML template from agency_docs.

**NOR integration:** NOR tendered/accepted timestamps feed into laytime calculation. The NOR document itself can be generated from this data + the template from agency_docs.

---

### Tab 3: Disbursement Account (DA)

This is where the PDA → FDA lifecycle lives. **The DA is a living document maintained in the system. PDFs are just snapshots.**

```
┌─────────────────────────────────────────────────────────┐
│  DISBURSEMENT ACCOUNT                                    │
│                                                         │
│  Version: Rev 2 (Post-Sailing)   ← dropdown to switch  │
│  History: PDA v1 → PDA v2 (revised) → Intermediate →   │
│           FDA Draft → FDA Final                          │
│                                                         │
│  [+ Add Line]  [Print Current Version]  [Compare ▾]    │
│                                                         │
│  ┌─ FINANCIAL CROSSWALK CHART ─────────────────────┐    │
│  │                                                  │    │
│  │  $100K ┤                                         │    │
│  │        │  ██                                     │    │
│  │   $90K ┤  ██  ▓▓                                 │    │
│  │        │  ██  ▓▓  ░░                             │    │
│  │   $80K ┤  ██  ▓▓  ░░                             │    │
│  │        │  ██  ▓▓  ░░  ▒▒                         │    │
│  │   $70K ┤  ██  ▓▓  ░░  ▒▒  ██                     │    │
│  │        ├──────────────────────                    │    │
│  │        PDA  PDA  Post  FDA  FDA    Funded         │    │
│  │        v1   v2   Sail  Dft  Final  ───────        │    │
│  │                                    Req: $87.5K    │    │
│  │                                    Rcv: $90.0K    │    │
│  │                                    Bal: +$2.5K    │    │
│  └──────────────────────────────────────────────────┘    │
│                                                         │
│  ── EXPENSE LINES ──────────────────────────────────     │
│                                                         │
│  Category         Vendor              PDA    Actual  Var │
│  ──────────────────────────────────────────────────────  │
│  Pilotage In      NOBRA Pilots       $8,200  $8,200   — │
│  Pilotage Out     NOBRA Pilots       $8,200     —      — │
│  Towage In        Crescent Towing    $12,000 $14,400 +20%│
│  Towage Out       Crescent Towing    $12,000    —      — │
│  Dockage          Port of New Orl    $6,800  $6,800   — │
│  Wharfage         Port of New Orl    $4,500  $4,500   — │
│  Stevedoring      Assoc. Terminals   $18,500 $22,100 +19%│
│  Launch Service   LaFleur Launch     $2,400  $2,800  +17%│
│  Line Handlers    Gulf Mooring       $1,800  $1,800   — │
│  Customs/CBP      US Customs         $1,200  $1,200   — │
│  Surveyor         SGS Gulf Coast     $3,500  $3,500   — │
│  Agency Fee       Gulf Coast Agency  $5,000  $5,000   — │
│  Miscellaneous    Various            $3,400  $1,940  -43%│
│  ──────────────────────────────────────────────────────  │
│  TOTAL                               $87,500 $72,340     │
│                                                         │
│  ── EXPENSE STATUS ─────────────────────────────────     │
│  8 of 13 invoices received │ 6 verified │ 5 approved    │
│  Progress: [████████░░░░] 62%                           │
│                                                         │
│  ── VERSION HISTORY ────────────────────────────────     │
│  │ v1  PDA Original    15 Mar  $87,500   Sent to prin  │
│  │ v2  PDA Revised     18 Mar  $85,200   Towing reduced│
│  │ v3  Post-Sailing    02 Apr  $78,900   Stevedore adj │
│  │ v4  FDA Draft       15 Apr  $72,340   Pending review│
│  │     [Revert to v3]  [Compare v3 ↔ v4]               │
│  └──────────────────────────────────────────────────     │
└─────────────────────────────────────────────────────────┘
```

**DA Version Lifecycle:**

```
PDA v1 (Original Estimate)
  ↓ principal requests changes
PDA v2 (Revised) — could be multiple revisions
  ↓ vessel sails, agent needs more cash
Intermediate / Post-Sailing DA
  ↓ all invoices in, accounting compiles
FDA Draft
  ↓ principal reviews, may dispute items
FDA Final (locked)
```

Each version is a **snapshot** of the expense line items at that point in time. The line items themselves are the living data — they get updated as invoices come in, amounts change, new items are added. When you "print" a version, it captures the current state. When you look at the version history, you can see what changed between any two versions.

**Three-column concept for the DA document (PDF output):**

| Line Item | PDA (Estimated) | Intermediate | Final (Actual) |
|-----------|-----------------|--------------|----------------|
| Pilotage  | $8,200          | $8,200       | $8,200         |
| Towage    | $12,000         | $14,400      | $14,400        |
| ...       | ...             | ...          | ...            |
| **Total** | **$87,500**     | **$78,900**  | **$72,340**    |

This lets the principal see exactly how the estimate evolved. The intermediate column exists because the ship may stay longer, burn more services, and the agent needs to ask for more funding — so they show the principal "here's what it actually cost so far" before the final.

**Crosswalk chart:** A simple bar chart showing PDA v1 → v2 → Intermediate → FDA alongside Funding Requested vs Received vs Balance. At a glance, the operator (and the principal) can see the financial trajectory.

---

### Tab 4: Cargo

Only visible for cargo port call types (Discharge, Load, Load/Discharge, Transshipment).

```
┌─────────────────────────────────────────────────────────┐
│  CARGO                                                   │
│                                                         │
│  ┌─ CARGO LINES ───────────────────────────────────┐    │
│  │  Commodity    Type       B/L Qty    Actual  Var  │    │
│  │  ─────────────────────────────────────────────── │    │
│  │  Pet Coke     Dry Bulk   45,000 MT  44,872  -0.3%│    │
│  │  Shipper: Koch Industries                        │    │
│  │  Receiver: Associated Electric                   │    │
│  │  B/L No: NOLPC-2026-0044                        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─ DRAFT SURVEY ──────────────────────────────────┐    │
│  │           Arrival        Departure              │    │
│  │  Fwd:     9.20 m         6.85 m                 │    │
│  │  Aft:     10.10 m        7.90 m                 │    │
│  │  Mid P:   9.65 m         7.40 m                 │    │
│  │  Mid S:   9.60 m         7.35 m                 │    │
│  │  Mean:    9.64 m         7.38 m                 │    │
│  │  Displacement: 68,420 MT → 23,548 MT            │    │
│  │  Cargo by survey: 44,872 MT                     │    │
│  │  B/L quantity: 45,000 MT                        │    │
│  │  Difference: -128 MT (-0.28%)                   │    │
│  │  Surveyor: SGS Gulf Coast                       │    │
│  │  [Upload Survey Report]                         │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─ LAYTIME CALCULATION ───────────────────────────┐    │
│  │  Allowed: 72:00 hrs (3 days × 24 hrs)           │    │
│  │  Used:    48:30 hrs                             │    │
│  │  Remaining: 23:30 hrs                           │    │
│  │  ─────────────────────────────────────────────  │    │
│  │  NOR Accepted:  28 Mar 16:15                    │    │
│  │  Laytime Start: 29 Mar 06:00 (next working day) │    │
│  │  Completed:     30 Mar 06:30                    │    │
│  │  Deductions:    Rain delay 2.5 hrs              │    │
│  │  ─────────────────────────────────────────────  │    │
│  │  Status: WITHIN TIME — no demurrage/despatch    │    │
│  │  Demurrage rate: $18,500/day                    │    │
│  │  Despatch rate: $9,250/day (half demurrage)     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─ CARGO DOCUMENTS ──────────────────────────────┐     │
│  │  ✓ Bill of Lading (3 originals)                │     │
│  │  ✓ Mate's Receipt                              │     │
│  │  ✓ Cargo Manifest                              │     │
│  │  ✓ Draft Survey Report                         │     │
│  │  ○ Tally Sheet (not yet received)              │     │
│  │  ○ Outturn Report (not yet received)           │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

### Tab 5: Documents & Files

All documents associated with this port call. Upload, tag, view, search.

```
┌─────────────────────────────────────────────────────────┐
│  DOCUMENTS                                               │
│                                                         │
│  [+ Upload]  [Scan]  [Filter ▾]  [Search docs...]      │
│                                                         │
│  ┌─ SYSTEM GENERATED ─────────────────────────────┐     │
│  │  📄 PDA v1 — Original Proforma    15 Mar 2026  │     │
│  │  📄 PDA v2 — Revised Proforma     18 Mar 2026  │     │
│  │  📄 Post-Sailing DA               02 Apr 2026  │     │
│  │  📄 Statement of Facts            30 Mar 2026  │     │
│  │  📄 Notice of Readiness           28 Mar 2026  │     │
│  └────────────────────────────────────────────────┘     │
│                                                         │
│  ┌─ RECEIVED / UPLOADED ──────────────────────────┐     │
│  │  📎 Crescent Towing Invoice #4401  29 Mar      │     │
│  │     Status: Verified ✓  Matched to: Towage In  │     │
│  │  📎 NOBRA Pilots Invoice           29 Mar      │     │
│  │     Status: Received   Matched to: Pilotage In │     │
│  │  📎 Draft Survey Report - SGS      30 Mar      │     │
│  │     Status: Filed                              │     │
│  │  📎 Crew List                      27 Mar      │     │
│  │  📎 Customs Entry (CBP 1300)       28 Mar      │     │
│  │  📎 Stowage Plan                   27 Mar      │     │
│  └────────────────────────────────────────────────┘     │
│                                                         │
│  ┌─ EXPECTED (not yet received) ──────────────────┐     │
│  │  ○ Pilotage Out Invoice (NOBRA)                │     │
│  │  ○ Towage Out Invoice (Crescent)               │     │
│  │  ○ Stevedoring Final (Assoc. Terminals)        │     │
│  │  ○ Tally Sheet                                 │     │
│  │  ○ Outturn Report                              │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

**Key concept:** Documents are split into three buckets:
1. **System-generated** — PDAs, FDAs, SOFs, NORs created from system data using the HTML templates from agency_docs. Click to regenerate or view.
2. **Received/Uploaded** — Invoices, survey reports, crew lists. Tagged to expense lines where applicable.
3. **Expected** — Based on the service scope and expense lines, the system knows what documents *should* arrive. This is the operator's checklist for closing out the file.

---

## Funding — Not a Tab, Embedded in DA

Funding is inseparable from the DA. It's the other side of the same coin. Instead of a separate tab:

**In the DA tab**, there's a funding section:

```
┌─ FUNDING ──────────────────────────────────────────────┐
│                                                        │
│  Requested    Received     Balance     Status          │
│  $87,500      $90,000      +$2,500     Fully Funded   │
│                                                        │
│  ── FUNDING RECORDS ────────────────────────────────── │
│  Date       Type      Amount    Wire Ref    Status     │
│  15 Mar     Initial   $87,500   TT-4429    Received   │
│  02 Apr     Suppl.    $12,000   —          Requested  │
│                                                        │
│  ── SETTLEMENT ─────────────────────────────────────── │
│  FDA Total:           $72,340                         │
│  Total Funded:        $90,000                         │
│  Refund Due:          $17,660   [Generate Refund Note] │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## How the DA Version / Funding Crosswalk Works

This is the core financial story of every port call, visualized:

```
                    MONEY OUT (DA)              MONEY IN (Funding)
                    ────────────                ──────────────────
    PDA v1          $87,500 ─────── Request ──→ $87,500 requested
                                                $87,500 received ✓
    PDA v2          $85,200         (revised down, no new request)

    Post-Sailing    $78,900 ─────── Request ──→ $12,000 supplemental
                                                (not yet received)

    FDA Draft       $72,340
    FDA Final       $72,340 ─────── Settle ───→ Total rcv: $87,500
                                                FDA total: $72,340
                                                Refund:    $15,160
```

In the UI, this becomes a **stacked bar chart** or **waterfall chart** that tells the whole financial story in one glance. Each bar is a DA version. A horizontal line shows total funding received. The gap is what's owed (either direction).

---

## Husbandry / Service Sub-Files

These are NOT tabs on the main port call. They're **linked sub-files** accessed from the Overview tab:

```
┌─ LINKED SERVICE FILES ─────────────────────────────────┐
│                                                        │
│  📁 Husbandry Sub-File: NOL-2026-00004-H              │
│     Status: Active │ 3 items │ $4,200 est             │
│     Services: Crew change, Stores, Cash to Master     │
│     [Open →]                                          │
│                                                        │
│  📁 Forwarding: NOL-2026-00004-F                      │
│     Status: Pending │ 0 items                         │
│     [Open →]                                          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

When you click "Open →", it opens the sub-file which has its OWN simplified detail view (inline slide-over or full page) with its own expense lines, documents, and DA. The sub-file DA rolls up into the parent port call's financials.

---

## Document Generation Flow (agency_docs integration)

The HTML templates from the agency_docs project are the **print templates**. The data lives in ShipOps. The flow:

```
ShipOps Data (live)
    ↓
User clicks "Print SOF" or "Generate PDA PDF"
    ↓
System populates HTML template fields from DB
    ↓
Renders in browser (preview) or generates PDF
    ↓
PDF saved as a document record (version stamped)
    ↓
Can be emailed to principal, master, terminal
```

**The templates from agency_docs become the "print views" for ShipOps data.** The field maps (JSON files) are the bridge — they map ShipOps DB fields to template placeholders.

---

## Summary: What Changed from Current Build

| Current | Proposed |
|---------|----------|
| 10 tabs | 5 tabs (Overview, Operations, DA, Cargo, Documents) |
| Tasks as separate tab | Tasks embedded in Overview (action items on the file) |
| Funding as separate tab | Funding embedded in DA tab (same financial story) |
| Husbandry as tab | Husbandry as linked sub-file from Overview |
| Liner/Traffic as tab | Linked sub-file or removed (Phase 2) |
| Forwarding as tab | Linked sub-file from Overview |
| No alert strip | Alert strip surfaces problems without hunting |
| No version control on DA | Full version history with compare and revert |
| Static KPI cards | Financial crosswalk chart showing DA evolution + funding |
| No document generation | Print button generates PDFs from agency_docs templates |
| No expected docs | Document tab shows what's expected but not yet received |

---

## Navigation Flow Summary

```
Dashboard (port call list)
    ↓ click row
Port Call Detail
    ├── Overview (default) — cockpit view, tasks, activity, reference cards
    ├── Operations — timeline/SOF, berth info, laycan
    ├── DA — expense lines, funding, versions, crosswalk chart
    ├── Cargo — cargo lines, draft survey, laytime (cargo types only)
    └── Documents — system-generated, received, expected
         └── Sub-files (from Overview)
             ├── Husbandry → mini detail view with own DA
             ├── Forwarding → mini detail view
             └── Protecting → mini detail view
```

---

## Open Questions for William

1. **Laytime calculator** — should it live in Cargo tab or Operations tab? It's cargo-related but operationally driven by SOF timestamps.
2. **Email integration** — when we add email later, does correspondence show in a 6th tab or in the activity feed on Overview?
3. **Approval workflow** — when an expense needs manager approval, where does the approver act? Inline in the DA tab or a separate approval queue?
4. **Multi-cargo** — for Load/Discharge with multiple commodities, do we need per-hold cargo tracking or is commodity-level sufficient?
5. **DA print format** — the three-column (PDA / Intermediate / Final) format for the PDF output — do you want all three columns always, or only show columns for versions that exist?
