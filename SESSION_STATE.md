# Session State
Last updated: 2026-03-23

## Current Goal
Finalize schema before writing migration — reviewing and marking up all DB column gaps across all 19 tables. User has NOT yet finalized columns; schema review is in progress.

## Completed This Session
- Ran corrected `seed_offices_users.sql` successfully — clean run: DO×6, ALTER TABLE×2, INSERT 7 offices, INSERT 27 users, COMMIT
- Verified all 7 offices seeded: HQ, DOC, HOU, NOL, POR, NOR, MOB (all under tenant-gca-001)
- Verified all 27 users seeded with correct roles, titles, approval_tier_limits
- Inspected all 19 DB tables one-by-one in CLI
- Produced comprehensive schema gap analysis across all tables and missing tables (see HANDOFF.md)

## In Progress
- **Schema review** — gap analysis delivered, user reviewing before migration is written
  - User has NOT yet confirmed/rejected column additions
  - 3 open questions pending user answer (see HANDOFF.md)

## Next Steps (after schema finalized)
1. Write complete migration SQL (ALTER TABLE + CREATE TABLE) based on approved gaps
2. Update Prisma schema to match
3. Build multi-step wizard (NewFileWizard) at /preview/new-port-call
   - 6 steps: Vessel & Principal → Port & Terminal → Cargo → Voyage DA setup → Husbandry → Confirm & Open
4. DSS rules engine — hard-coded guardrails on wizard inputs
5. Wire wizard to real DB (port-calls POST API exists)
6. Phase transition logic with prerequisite enforcement
7. Seed: ports, terminals, office_ports junction, port_vendors

## Key Decisions Made
- Husbandry is a PRIMARY tab (equal to Voyage DA), not buried in Finance
- Husbandry sub-file managed INLINE — no dashboard navigation away from parent port call
- Services & Vendors lives in Voyage DA tab (authorization layer for expense lines)
- Cargo tab is its own primary tab (cargo docs, draft surveys, laytime live there)
- Operations = Timeline/SOF + Berth & Port only
- Voyage DA = green/blue accent; Husbandry = yellow accent (visual distinction throughout)
- Header KPI strip shows BOTH voyage and husbandry financials side by side
- File number suffix: {OFFICE}-{YEAR}-{NNNNN}-H for husbandry sub-file
- All money stored as cents (INT) in DB; display conversion in frontend only
- RBAC: approval_tier_limit (cents) on User row — above limit creates ApprovalRequest row
- External principal approval via MagicLinkToken (already in schema)

## Schema Gap Summary (needs user sign-off)
Priority breakdown from gap analysis:
- 🔴 HIGH additions: is_sub_file/parent_port_call_id (port_calls), da_type (expenses + funding_records), paying_party_id (expenses), laycan/laytime fields (cargo_lines), sanctions_status (organizations), approval_requests table, office_ports table
- 🟡 MED additions: charterer_id/ship_owner_id/ship_manager_id/voyage_number (port_calls), quantity/unit_price (expenses), funding_type/currency (funding_records), terminal capacity fields, vessel capacity fields, structured banking fields (organizations), port_vendors table, checklist_templates table
- 🟢 LOW: various reference/reporting fields — can defer to later migration
- 3 open questions: (1) laycan at cargo_line vs port_call level? (2) banking details structured vs freetext? (3) approval_requests: one table for field-edits + document approvals, or separate?

## Files Modified This Session
- packages/db/seed_offices_users.sql — NEW: seeds 7 offices + 27 users, expands UserRole enum

## Context / Notes
- Dev server: `pnpm dev` from monorepo root → port 3001
- Docker DB: `docker compose up -d` from project root
- Preview URL: http://localhost:3001/preview/port-call
- 3 pre-existing users (James Broussard, Sandra Thibodaux, Marie Fontenot) in DB with NULL office_id — from earlier seed, leave as-is
- Old preview files still exist at (dashboard)/preview/ — do NOT delete
- FIELD_INVENTORY.md at project root contains full field crosswalk (18 sections, all tabs × roles × approval flags)
