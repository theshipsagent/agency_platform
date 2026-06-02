# Agency Forms — Bridge to the Authoring Workspace

**The forms are authored in Obsidian, then ported into this repo.** This file
is the *bridge*: it tells you where the authoring workspace is, what's already
built, and the exact contract for porting a finished form into the live
platform.

> ⚠️ **Do not author forms in this repo folder.** The real workspace already
> exists in Obsidian (see below) with templates, field maps, and a kanban
> tracker. Authoring here would fork the work.

---

## Where the forms live (authoring workspace)

```
~/Documents/Claude/10_Projects/ShipOps/agency_docs/
```

That workspace (started 2026-03, formerly named for the "Orbit" / "OceanDatum.ai"
project — **same thing as ShipOps**) contains:

- `CLAUDE.md` — workspace rules; goal: "enter ship name once → auto-populate all forms"
- `SESSION_STATE.md` — where forms work left off
- `kanban.html` — 26-document status board (Not Started → Field Mapping → Template → Branded → Ready)
- `templates/{name}.html` — HTML form templates (**chosen authoring format**)
- `field_maps/{name}_fields.json` — field definitions per form
- `branded/{name}_branded.html` — branded variants
- `documents/{category}/` — 6 categories (vessel_operations, cargo_bl, port_agency, customs_clearance, financial, surveys_inspections)

### Already built (as of 2026-03-29)
| Form | Template | Field map |
|------|----------|-----------|
| Statement of Facts (SOF) | ✅ | ✅ |
| Cargo Manifest | ✅ | — |
| Stowage Plan | ✅ | — |
| Notice of Readiness (NOR) | ✅ | ✅ |

**Next form teed up:** CONGENBILL B/L (GENCON dry-bulk bill of lading), to BIMCO standard.

---

## ⚠️ The integration gap to decide (HTML templates ↔ pdfkit)

The Obsidian workspace authors forms as **HTML/CSS templates**.
The live repo currently renders PDFs with **`pdfkit`** (imperative drawing) —
see the two reference generators in `packages/services/src/pdf/mock-adapter.ts`
(FDA, SOF). These are **two different rendering technologies.**

Before porting many forms, settle the path (William's call):

- **Option A — add an HTML→PDF render path** to the project (e.g. a headless
  renderer). The HTML templates port in nearly as-is. Recommended if the form
  library is large (it is — 26 docs), because re-drawing each in pdfkit by hand
  is slow and the HTML already exists.
- **Option B — re-implement each HTML template in pdfkit** to match the existing
  FDA/SOF generators. No new dependency, but every form is hand-redrawn.
- **Option C — keep HTML templates as the design spec only**, generate pdfkit
  code from them. Hybrid.

This is the one real decision standing between "authored form" and "form the
platform generates."

---

## How a finished form ports into the project

Reference the two working generators and the contract:

- `packages/services/src/pdf/port.ts` — `IPDFProvider` interface + `Generate<Form>Input` types
- `packages/services/src/pdf/mock-adapter.ts` — working FDA + SOF generators
- `packages/services/src/pdf/registry.ts` — provider switch
- `apps/web/app/api/port-calls/[id]/fda/route.ts` — reference download route (tenant-checked, marshals DB rows → input type)

Steps once the rendering path (above) is settled:
1. Implement `generate<Form>(input): Promise<Buffer>` in the adapter.
2. Add the method + `Generate<Form>Input` type to `IPDFProvider`.
3. Copy the FDA route for a download endpoint; marshal DB rows → input type.
4. Add a download button on the relevant page.
5. Run the verification matrix (`SESSION_STATE.md`): typechecks, lint, 3 CI guards, smoke tests (add a `smoke-pdf` render assertion for the new form).

### Data available to forms
Real shared types in `packages/shared/src/types/index.ts` (these are deliberately
minimal **PDF view-contracts**, not full DB mirrors): `PortCall`, `Vessel`,
`Organization`, `DisbursementAccount`, `TimelineEvent[]`, `CargoLine`, `Expense`,
`FundingRecord`. Money is **integer cents** — convert to display only at render.

---

## Suggested first port-in

**Proforma DA** — it reuses the exact `DisbursementAccount` data the FDA route
already pulls, so it's the lowest-risk first form to take end-to-end (and it's a
Phase 1→2 prerequisite). It's also not yet built in the Obsidian workspace, so
it's a clean place to exercise the full author→port pipeline once.
