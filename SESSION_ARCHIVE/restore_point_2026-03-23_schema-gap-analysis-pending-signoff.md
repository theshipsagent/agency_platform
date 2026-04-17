# Restore Point — Schema Gap Analysis Pending Sign-off
Created: 2026-03-23
Label: schema-gap-analysis-pending-signoff
Status: Gap analysis delivered — user reviewing before migration is written

---

## What Was Done This Session

### DB Seeding Complete
- Ran `seed_offices_users.sql` successfully (fixed enum check + moved ALTER TYPE outside transaction)
- 7 offices seeded: HQ, DOC, HOU, NOL, POR, NOR, MOB (all tenant-gca-001)
- 27 users seeded with roles, titles, approval_tier_limits
- UserRole enum expanded: AGENT_JUNIOR, AGENT_FULL, FORWARDING, EXECUTIVE, ANALYST, CUSTOMER

### All 19 Tables Inspected
Tables in DB: audit_logs, cargo_lines, documents, expenses, foreign_ports, funding_records, magic_link_tokens, offices, organizations, port_calls, ports, ships_register, tasks, tenants, terminals, timeline_events, us_ports, users, vessels

### Schema Gap Analysis Delivered
Full gap analysis across all tables + 6 missing tables proposed.
See HANDOFF.md for complete column-by-column breakdown.

---

## State When Paused
- User reviewing gap analysis — has NOT confirmed/rejected any column additions
- 3 open questions pending:
  1. Laycan at cargo_line vs port_call level?
  2. Banking details: structured fields vs freetext?
  3. approval_requests: one table or two (field-edits vs document approvals)?

---

## Resume Instructions
1. Read HANDOFF.md — full gap analysis is there
2. Ask user to confirm/reject proposed columns (or add more)
3. Write complete migration SQL once sign-off received
4. Update Prisma schema to match
5. Then: multi-step wizard build
