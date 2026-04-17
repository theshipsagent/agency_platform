# Handoff — ShipOps / agency_platform
**Date:** 2026-03-23
**Trigger:** "set hand off"
**Status:** Schema gap review in progress — awaiting user sign-off before migration is written

---

## Where We Left Off

Schema gap analysis was delivered across all 19 DB tables. User said "we may need to add more, what do u suggest" and indicated columns have not been reviewed/finalized yet. The gap analysis is below. **Nothing has been migrated yet** — next session starts by getting user sign-off on the column list, then writing the migration in one shot.

---

## DB State (as of 2026-03-23)

### What's in the DB
- **19 tables** — all core entities present (see full list below)
- **7 offices** seeded: HQ, DOC, HOU, NOL, POR, NOR, MOB (tenant-gca-001)
- **27 users** seeded — 4 HQ, 3 DOC, 4 per field office (1 MANAGER + 2 AGENT_FULL + 1 AGENT_JUNIOR)
- **UserRole enum** expanded: AGENT_JUNIOR, AGENT_FULL, FORWARDING, EXECUTIVE, ANALYST, CUSTOMER added
- **3 pre-existing users** (Broussard, Thibodaux, Fontenot) with NULL office_id — leave as-is

### All 19 Tables
```
audit_logs, cargo_lines, documents, expenses, foreign_ports, funding_records,
magic_link_tokens, offices, organizations, port_calls, ports, ships_register,
tasks, tenants, terminals, timeline_events, us_ports, users, vessels
```

---

## Schema Gap Analysis — PENDING USER SIGN-OFF

### 3 Open Questions (answer these first)

**Q1 — Laycan location:** Track laycan (open/close) per `cargo_lines` row (each B/L can have different window) or at `port_calls` level? Currently proposed at cargo_lines.

**Q2 — Banking details on `organizations`:** Add structured fields (swift_code, bank_name, bank_account, bank_routing) or keep current single `banking_details` text field? Structured is cleaner for wire instructions; freetext is faster for now.

**Q3 — `approval_requests` table:** Single table covering both (a) field-level edits needing supervisor sign-off AND (b) document-level approvals (manager signing the DA/FDA)? Or two separate tables?

---

### `port_calls` — proposed additions

| Column | Type | Priority | Why |
|--------|------|----------|-----|
| `is_sub_file` | BOOLEAN DEFAULT false | 🔴 HIGH | Husbandry inline sub-file flag |
| `parent_port_call_id` | TEXT → FK port_calls | 🔴 HIGH | Links husbandry to parent voyage file |
| `charterer_id` | TEXT → FK organizations | 🔴 HIGH | Charterer distinct paying party from principal |
| `ship_owner_id` | TEXT → FK organizations | 🔴 HIGH | Husbandry payer |
| `ship_manager_id` | TEXT → FK organizations | 🟡 MED | Ship manager may delegate husbandry payment |
| `voyage_number` | TEXT | 🟡 MED | Vessel voyage ref from principal |
| `last_port` | TEXT | 🟡 MED | Previous port — USCG/customs reporting |
| `next_port` | TEXT | 🟡 MED | Next port — NOA requirement |
| `berth_name` | TEXT | 🟡 MED | Actual berth assigned |
| `anchored_at` | TIMESTAMPTZ | 🟡 MED | Phase 4 sub-status |
| `berthed_at` | TIMESTAMPTZ | 🟡 MED | Phase 4 sub-status: all fast |
| `cargo_commenced_at` | TIMESTAMPTZ | 🟡 MED | Phase 4 sub-status |
| `cargo_completed_at` | TIMESTAMPTZ | 🟡 MED | Phase 4 sub-status |
| `agent_fee_proforma_cents` | INT DEFAULT 0 | 🟡 MED | Agency fee separate from vendor expenses |
| `agent_fee_actual_cents` | INT | 🟡 MED | Final billed agency fee |
| `husbandry_agent_fee_cents` | INT | 🟡 MED | Agency fee on husbandry side |
| `assigned_agent_id` | TEXT → FK users | 🟡 MED | Which agent owns this file |
| `ops_notes` | TEXT | 🟢 LOW | Internal operational notes |
| `principal_ref` | TEXT | 🟢 LOW | Principal's own voyage reference number |
| `uscg_noa_submitted_at` | TIMESTAMPTZ | 🟢 LOW | NOA regulatory submission tracking |

### `expenses` — proposed additions

| Column | Type | Priority | Why |
|--------|------|----------|-----|
| `da_type` | ENUM (VOYAGE/HUSBANDRY) | 🔴 HIGH | Which ledger this line belongs to |
| `paying_party_id` | TEXT → FK organizations | 🔴 HIGH | Who actually pays this line |
| `quantity` | DECIMAL | 🟡 MED | e.g., 3 tugs × rate = proforma |
| `unit_price_cents` | INT | 🟡 MED | Rate per unit |
| `unit_label` | TEXT | 🟡 MED | "tug", "MT", "day" — display |
| `tariff_ref` | TEXT | 🟡 MED | Port tariff item reference |
| `is_agency_fee` | BOOLEAN DEFAULT false | 🟡 MED | Flag agency fee vs vendor lines |
| `requires_approval` | BOOLEAN DEFAULT false | 🟡 MED | Above tier limit — needs sign-off |
| `approval_request_id` | TEXT | 🟡 MED | FK to approval_requests |
| `po_number` | TEXT | 🟢 LOW | Purchase order ref |
| `tax_amount_cents` | INT DEFAULT 0 | 🟢 LOW | Separate tax tracking |
| `disputed` | BOOLEAN DEFAULT false | 🟢 LOW | Disputed invoice during FDA reconciliation |
| `dispute_note` | TEXT | 🟢 LOW | Why disputed |

### `funding_records` — proposed additions

| Column | Type | Priority | Why |
|--------|------|----------|-----|
| `da_type` | ENUM (VOYAGE/HUSBANDRY) | 🔴 HIGH | Which ledger this advance applies to |
| `funding_type` | ENUM | 🟡 MED | PROFORMA_ADVANCE / TOP_UP / FINAL_SETTLEMENT / REFUND |
| `currency` | TEXT DEFAULT 'USD' | 🟡 MED | Wire may arrive in foreign currency |
| `exchange_rate` | DECIMAL | 🟡 MED | Conversion rate to USD |
| `usd_equivalent_cents` | INT | 🟡 MED | Stored converted amount |
| `shortfall_alert_sent_at` | TIMESTAMPTZ | 🟢 LOW | When agent notified of funding gap |

### `cargo_lines` — proposed additions

| Column | Type | Priority | Why |
|--------|------|----------|-----|
| `laycan_open` | TIMESTAMPTZ | 🔴 HIGH | Charter party laycan window open |
| `laycan_close` | TIMESTAMPTZ | 🔴 HIGH | Charter party laycan window close |
| `laytime_basis` | TEXT | 🔴 HIGH | SHINC / SHEX / SSHINC / FHEX |
| `laytime_allowed_hours` | DECIMAL | 🔴 HIGH | Total allowed per charter party |
| `laytime_used_hours` | DECIMAL | 🟡 MED | Actual laytime used (from SOF) |
| `demurrage_rate_cents` | INT | 🟡 MED | Per diem demurrage rate |
| `despatch_rate_cents` | INT | 🟡 MED | Per diem despatch rate (usually 50% of demurrage) |
| `demurrage_amount_cents` | INT | 🟡 MED | Computed result — stored for FDA |
| `despatch_amount_cents` | INT | 🟡 MED | Computed result |
| `stow_factor` | DECIMAL | 🟡 MED | CBM per MT — vessel planning |
| `draft_survey_bl_qty` | DECIMAL | 🟡 MED | Draft survey quantity vs B/L quantity |
| `moisture_content_pct` | DECIMAL | 🟢 LOW | Coal, grain safety/weight |
| `cargo_description` | TEXT | 🟢 LOW | Full B/L cargo description |
| `port_marks` | TEXT | 🟢 LOW | Shipping marks |
| `hs_code` | TEXT | 🟢 LOW | Harmonized tariff code |
| `imdg_class` | TEXT | 🟢 LOW | Hazmat IMDG class |
| `un_number` | TEXT | 🟢 LOW | Hazmat UN number |
| `temperature_setting` | DECIMAL | 🟢 LOW | Reefer cargo set temperature |

### `terminals` — proposed additions

| Column | Type | Priority | Why |
|--------|------|----------|-----|
| `max_loa` | DECIMAL | 🟡 MED | DSS berth compatibility check |
| `max_beam` | DECIMAL | 🟡 MED | DSS berth compatibility check |
| `berth_count` | INT | 🟡 MED | Number of working berths |
| `berth_numbers` | TEXT | 🟡 MED | e.g., "Berths 5–9" |
| `cargo_types_handled` | TEXT[] | 🟡 MED | DSS cargo/terminal mismatch check |
| `pilot_required` | BOOLEAN | 🟡 MED | Auto-populates pilot expense line |
| `tug_count_required` | INT | 🟡 MED | Auto-populates tug expense lines |
| `wharfage_rate_cents` | INT | 🟢 LOW | Auto-proforma wharfage |
| `terminal_operator_id` | TEXT → FK organizations | 🟢 LOW | Who operates the terminal |
| `crane_count` | INT | 🟢 LOW | Shore crane availability |
| `draft_restriction_notes` | TEXT | 🟢 LOW | Tide-dependent restrictions |

### `vessels` — proposed additions

| Column | Type | Priority | Why |
|--------|------|----------|-----|
| `cargo_holds` | INT | 🟡 MED | Number of holds |
| `grain_capacity_cbm` | DECIMAL | 🟡 MED | Bulk capacity (grain) |
| `bale_capacity_cbm` | DECIMAL | 🟡 MED | Bulk capacity (bale) |
| `tpc` | DECIMAL | 🟡 MED | Tons per centimeter — draft survey |
| `last_port_state_control` | DATE | 🟢 LOW | Last PSC inspection |
| `psc_deficiencies` | INT DEFAULT 0 | 🟢 LOW | Outstanding deficiencies — risk flag |
| `reefer_plugs` | INT | 🟢 LOW | Reefer capacity |
| `hull_type` | TEXT | 🟢 LOW | SINGLE_HULL / DOUBLE_HULL |

### `organizations` — proposed additions

| Column | Type | Priority | Why |
|--------|------|----------|-----|
| `sanctions_status` | TEXT DEFAULT 'CLEAR' | 🔴 HIGH | OFAC/SDN compliance |
| `sanctions_checked_at` | TIMESTAMPTZ | 🔴 HIGH | When last screened |
| `swift_code` | TEXT | 🟡 MED | Wire transfer (see Q2 above) |
| `bank_name` | TEXT | 🟡 MED | Wire instructions |
| `bank_account` | TEXT | 🟡 MED | Account number |
| `bank_routing` | TEXT | 🟡 MED | ABA / IBAN |
| `preferred_currency` | TEXT DEFAULT 'USD' | 🟡 MED | Some principals pay in GBP/EUR |
| `credit_limit_cents` | INT | 🟢 LOW | Internal credit limit |
| `p_and_i_club` | TEXT | 🟢 LOW | P&I insurer (for owner orgs) |

---

### Missing Tables — proposed

| Table | Priority | Purpose |
|-------|----------|---------|
| **`approval_requests`** | 🔴 HIGH | RBAC approval queue — field edits above tier limit, DA/FDA sign-off |
| **`office_ports`** | 🔴 HIGH | Junction: offices ↔ ports they service (wizard cascade) |
| **`port_vendors`** | 🟡 MED | Known vendors per port — auto-suggest in expense builder |
| **`checklist_templates`** | 🟡 MED | Task templates per port call type/phase |
| **`tariffs`** | 🟢 LOW | Port tariff schedules for auto-proforma |
| **`fda_versions`** | 🟢 LOW | Track FDA revisions during dispute cycle |

---

## What to Build After Schema Is Finalized

1. **Migration SQL** — single file covering all approved ALTER TABLE + CREATE TABLE
2. **Prisma schema update** — match migration
3. **Multi-step wizard** (`NewFileWizard`) at `/preview/new-port-call`
   - Step 1: Vessel & Principal
   - Step 2: Port & Terminal
   - Step 3: Cargo
   - Step 4: Voyage DA setup (scope, proforma)
   - Step 5: Husbandry (paying party, known services)
   - Step 6: Confirm & Open → lands on Summary tab
4. **DSS guardrails** in wizard (cargo/terminal mismatch, laycan vs ETA, USCG 96hr, funding gates)
5. **Wire wizard to DB** — POST /api/port-calls already exists
6. **Seed ports/terminals/office_ports/vendors** for Gulf Coast offices

---

## Dev Environment
- Dev server: `pnpm dev` from `/agency_platform/` → port 3001
- DB: `docker compose up -d` from project root
- Seed offices/users: `docker exec -i shipops_db psql -U shipops -d shipops < packages/db/seed_offices_users.sql`
- Preview: http://localhost:3001/preview/port-call

---

## Key File Locations
| File | Purpose |
|------|---------|
| `FIELD_INVENTORY.md` | Full field crosswalk — all tabs × roles × approval flags |
| `packages/db/seed_offices_users.sql` | Offices + users seed (already run) |
| `packages/db/prisma/schema.prisma` | Current schema (schema v2) |
| `apps/web/app/(preview)/preview/port-call/PortCallDetail.tsx` | 7-tab prototype UI |
| `SESSION_STATE.md` | Running session state |
| `SESSION_ARCHIVE/` | All restore points — do not delete |

---

*Resume trigger: "read handoff" — read this file and continue from schema sign-off*
