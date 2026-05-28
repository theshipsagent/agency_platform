# Restore Point — 2026-05-28 — Discovery Sweep Complete

Snapshot of SESSION_STATE.md at the close of the project-wide discovery + roadmap-drafting session.

---

## Why this restore point matters

This is the **pre-execution checkpoint** for the 14-session ShipOps roadmap. Everything from here forward should be tracked against the roadmap doc at `~/Documents/Claude/10_Projects/ShipOps/ROADMAP.md` (or, until S0 runs, at `~/Documents/Claude/00_Inbox/2026-05-28 ShipOps - 14-Session Roadmap.md`).

If anything goes sideways during S0 restructure or S1 tenant-isolation refactor and we need to know "what was the project state when the plan was made" — restore from here.

---

## Project state snapshot

- **Git**: origin/main at `730cc6d`. Local main = origin/main (no unpushed commits). Working tree dirty in one place only: `M CLAUDE.md` (Directory Map + `_inbox/` intake rules; uncommitted per global "do not commit unless asked" rule). Untracked: `_inbox/` (raw source materials drop zone), `market_study/` (27-file research dir slated for Obsidian migration in S0).
- **Database**: `shipops_db` on Docker port 5433. Schema synced via `prisma db push` (no migrations yet). Seed has 11 port calls spanning all 9 phases.
- **CI**: `.github/workflows/ci.yml` green on last push (730cc6d) — typecheck + lint + build.

## Discovery sweep findings (full detail in roadmap doc, summarized here)

### Three production blockers
1. **Tenant isolation hardcoded** in 25+ routes (`tenant_id = 'tenant-gca-001'`). No Clerk-session → tenantId middleware. → S1.
2. **Zero audit-trail writes** despite `AuditLog` model + CLAUDE.md mandate. → S2.
3. **All 7 service adapters throw** "Phase B not implemented" — Email, AIS, OCR, PDF, Storage, AI, Sanctions. → per-feature in S3+.

### Pipeline state
- **DONE**: `/port-calls` list, `/port-calls/[id]` summary.
- **WORKING**: 6-step wizard, sub-status controls.
- **STUB (15)**: cargo, tasks, documents, timeline, disbursement, funding tabs; vessels, organizations, settings pages; accounting trio; portal trio.
- **Enforced clusters**: Disbursement+Funding (Cluster D), Documents+Portal (Cluster G).
- **Per-phase UI driveable through**: Phase 3. Phases 4-9 = no UI to advance the workflow.

### Docs sprawl resolution agreed
- **Keep in repo**: CLAUDE.md, PRODUCT_BRIEF.md, TECH_STACK.md, SESSION_STATE.md, SESSION_ARCHIVE/.
- **To Obsidian** (S0): FIELD_INVENTORY.md, BRAINSTORM_PORT_CALL_UX.md, SERVICE_FILE_PATTERN.md, market_study/, agency_docs/{templates,documents,field_maps,CONVO_*}.
- **To `_archive/`** (S0): HANDOFF.md, user_convo_shipops.md.
- **Prune** (S0, spot-check first): demo, demo_1, demo_extracted/, ship-agency-platform.jsx, data_fields_v1_031726.
- **Untouchable**: `_inbox/`.

## Decisions locked this session

1. **Sequencing: Foundations first.** S1 (tenant isolation) + S2 (audit trail) precede all feature work. Rationale: tenant isolation touches every route — cost to fix scales linearly with route count, so fix now while there are 25 not 50.
2. **Demo ZIP cleanup: Spot-check before pruning.** Cost-of-caution = 30 seconds; cost-of-error = irrecoverable file loss.
3. **Session boundary: End here, fresh `/clear` for S0.** Roadmap doc is the durable artifact; don't risk compacting mid-restructure.

## What S0 needs to do on resume

1. Read `~/Documents/Claude/00_Inbox/2026-05-28 ShipOps - 14-Session Roadmap.md` first.
2. Execute the restructure per roadmap §S0 spec.
3. Promote roadmap from Inbox to `10_Projects/ShipOps/ROADMAP.md` as final step.
4. Update SESSION_STATE.md + create next restore point.

## Plugin rack ("pirack") shortlist for this project

(From roadmap doc, repeated for offline reference.)

| Skill | When to use |
|-------|-------------|
| `feature-dev:feature-dev` | Per-page build sessions (S3-S13) |
| `engineering:architecture` | S1, Cluster D session |
| `engineering:tech-debt` | S1, S2 |
| `engineering:testing-strategy` | Before any "done" |
| `engineering:system-design` | Cluster D, Cluster G, Portal |
| `engineering:deploy-checklist` | S14 |
| `design:design-system` + `design:design-handoff` | S13 (wizard polish) |
| `design:accessibility-review` | S14 |
| `product-management:write-spec` | Start of each feature session |
| `claude-md-management:revise-claude-md` | End of each session |
| `/code-review` (slash) | Before every commit |
| `/verify` (slash) | After each page build |

Skipped: `code-modernization:*` (greenfield), `legalzoom:*`, most cowork integrations.
