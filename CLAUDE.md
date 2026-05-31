# CLAUDE.md — Project Instructions for Claude Code

## Project: ShipOps — Ship Agency Operational Platform

### What this is
Multi-tenant SaaS for maritime ship agencies. Manages the full port call lifecycle from nomination through final disbursement settlement. See `PRODUCT_BRIEF.md` for the complete product description and `TECH_STACK.md` for all technology decisions.

---

## Directory Map

| Directory | Purpose | Rules |
|-----------|---------|-------|
| `apps/` | Next.js web application | Working project — full read/write |
| `packages/` | Shared code (db, services, shared types) | Working project — full read/write |
| `market_study/` | Agency market research, company profiles, red ocean/blue ocean analysis | Working research dir — full read/write |
| `agency_docs/` | Platform documentation, templates, field maps | Working docs — full read/write |
| `_inbox/` | **Drop zone for new raw material only** | **READ OR COPY OUT ONLY — never edit in place, never treat as a working directory** |

### `_inbox/` — Intake Rules
- This is a staging area for PDFs, spreadsheets, docx files, and other raw source material dropped in for processing.
- When working with files here: read them or copy relevant content out to the appropriate working directory (`market_study/`, `agency_docs/`, etc.).
- Never save work product back into `_inbox/`. Never reorganize or rename files inside it.
- Do not create subdirectories or new files inside `_inbox/`.
- Treat every file in `_inbox/` as an original source document — leave it exactly as dropped.

---

## Stack Summary
- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend**: Next.js API routes (co-located)
- **Database**: PostgreSQL (local dev via Docker on port 5433) → Azure PostgreSQL (prod)
- **DB tooling (dev-time)**: Prisma — schema, migrations, seed only. Not used at runtime.
- **DB runtime**: Direct `pg.Pool` via `@shipops/db`'s `tenantQuery` (reads) and `auditedMutation` (writes) helpers. Prisma is bypassed at runtime due to its P1010 permission-check bug with PG16; reconsider when prod moves to Azure PostgreSQL.
- **Auth**: Clerk (multi-tenant orgs, RBAC, magic links). Dev bypass shim in `apps/web/middleware.ts` when no real `pk_` key is set.
- **State**: Zustand (client) + TanStack Query (server)
- **Forms**: React Hook Form + Zod (schemas shared with API validation)
- **Search**: cmdk (OmniBar / Cmd+K)
- **Mobile**: React Native / Expo (Phase 2)

---

## Coding Standards

### TypeScript
- Strict mode always. No `any` unless truly unavoidable (and add a comment explaining why).
- All database entities have corresponding TypeScript types in `packages/shared/types/`.
- All enumerations (port call phases, expense statuses, document types, etc.) are defined as const enums or Zod enums in `packages/shared/enums/`.
- Zod schemas in `packages/shared/validation/` are the single source of truth for both frontend form validation and API input validation. Never duplicate validation logic.

### File Naming
- Components: PascalCase (`PortCallCard.tsx`, `ExpenseTable.tsx`)
- Utilities/hooks: camelCase (`usePortCall.ts`, `formatMoney.ts`)
- API routes: kebab-case directories following Next.js App Router conventions
- Database: snake_case in Prisma schema (auto-mapped to camelCase in TypeScript)

### Component Structure
- Server Components by default. Only use `"use client"` when the component needs interactivity (forms, modals, click handlers).
- Keep components focused — one responsibility per file.
- Port call phase-specific UI goes in `components/port-call/phases/`.
- Shared UI primitives (status chips, money display, date formatters) go in `components/shared/`.

### API Routes
- Every route validates input with Zod schemas.
- Every route checks tenant isolation (user's tenantId must match resource's tenantId).
- Every mutation logs to the audit trail (who, what, when, before/after).
- Phase transitions are validated — the system enforces the correct sequence (can't jump from Phase 3 to Phase 7).
- Money is always stored as integers (cents). Convert to display format only in the frontend.

### Database
- Every table has: `id` (UUID), `tenantId` (UUID), `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Soft deletes: `deletedAt` (nullable timestamp). Apply the `WHERE deleted_at IS NULL` filter in every read query — there is no automatic middleware.
- All monetary fields are `Int` (cents, not dollars).
- All timestamps are UTC. Frontend handles timezone display.
- **Tenant isolation pattern (S1)**: all app-code reads go through `tenantQuery(tenantId, sql, params)` / `tenantQueryOne(...)` from `@shipops/db`. These helpers require `tenantId` as the first arg — TypeScript enforces it at every call site. Seed/migration scripts use `unscopedQuery` (intentionally grep-able as the "unsafe" path).
- **Audit trail pattern (S2)**: every mutation route goes through `auditedMutation({ context, action, resourceType, resourceId, mutation })` from `@shipops/db`. It opens a transaction, captures the `before` JSON, runs the mutation `RETURNING *` to capture `after`, writes one `audit_logs` row, and commits — atomic per mutation. ROLLBACKs on any error including the mutation SQL itself.
- **Input validation pattern (S2.5)**: every mutation route parses `req.json()` through `parseBody(BodySchema, await req.json())` from `apps/web/lib/api/parse.ts`. `BodySchema` is a Zod schema from `@shipops/shared/validation` (suffixed `*BodySchema`), defined `.strict()` so unknown fields are rejected. `parseBody` returns a discriminated union `{ok: true, data} | {ok: false, response}`; routes type-narrow without try/catch.
- **Request context**: `getRequestContext()` from `apps/web/lib/api/auth.ts` returns `{tenantId, actor}` — replaces the older `getTenantId()` alias for any mutation site.

### CI guards & smoke tests
Three layered defenses run on every push/PR via `.github/workflows/ci.yml`. Each is also runnable locally — run all three plus the smoke tests before any cross-cutting refactor.

| Layer | CI guard (grep-fail) | Smoke test (against real DB / in-process) |
|-------|----------------------|-------------------------------------------|
| Tenant isolation | `scripts/ci-tenant-isolation-guard.sh` — fails on hardcoded `tenant-gca-001` outside `auth.ts` or `unscopedQuery` import from app code | `pnpm --filter @shipops/db db:verify-isolation` (2-tenant cross-leak test) |
| Audit trail | `scripts/ci-audit-trail-guard.sh` — fails on any mutation SQL in `apps/web/app/api/` that doesn't go through `auditedMutation` | `pnpm --filter @shipops/db db:verify-audit-trail` (16 checks: happy path + ROLLBACK + SystemActor rejection) |
| Input validation | `scripts/ci-input-validation-guard.sh` — fails on any `req.json() as` cast in `apps/web/app/api/` | `pnpm --filter @shipops/shared verify-input-validation` (18 in-process assertions) |

When adding a new mutation route, write through all three patterns from the start; the guards will fail loudly if you skip one.

### Service Abstraction (Ports & Adapters)
- Seven external dependencies are abstracted behind interfaces in `packages/services/src/[name]/port.ts`: `ais`, `email`, `ocr`, `ai`, `storage`, `pdf`, `sanctions`.
- Each service has a `registry.ts` that reads its `PROVIDER_*` env var (e.g. `PROVIDER_AIS`, `PROVIDER_LLM`, `PROVIDER_PDF`) and returns the matching adapter.
- The top-level `packages/services/src/index.ts` exposes `getServices()` returning a `ServiceRegistry` with all 7 providers. Application code imports the interface types and calls `getServices()` from the registry — never from a specific adapter directly.
- **Current state (as of 2026-05-31):** the 7 port interfaces are designed and the registries are scaffolded, but **no adapter implementations exist yet** — every registry currently throws `"… not yet implemented — Phase B"`. No production code calls `getServices()` either, so these throws are unreachable today. Building an adapter means writing it under `packages/services/src/[name]/[adapter-name]-adapter.ts` (mock, prod-vendor-x, etc.) and adding a case branch in that service's `registry.ts`.
- **Pattern:** every service should ship a mock adapter first (returns realistic fixtures, runs in dev + demo + tests). Production adapters call real APIs and are selected only when the corresponding `PROVIDER_*` env var points to them.
- When building new features that need external data, always go through a service port. Never call an external API directly from a route handler or component.
- Mock fixture data should be realistic — use real Gulf Coast port names, actual vendor names, realistic vessel particulars and cargo quantities.

---

## Domain Rules (critical business logic)

### Port Call Phase Transitions
Valid transitions (enforce in application logic, not just UI):
```
1 (Proforma Estimated) → 2 (Awaiting Appointment) → 3 (Appointed) → 4 (Active) → 5 (Sailed) → 6 (Completed) → 7 (Processing FDA) → 8 (Awaiting Payment) → 9 (Settled)
```
Special cases:
- Phase 1 can go directly to 3 (appointment confirmed without a waiting period)
- Phase 7 can loop (FDA disputed → revised → resubmitted, stays in Phase 7)
- Phase 4 has sub-statuses: At Anchor → Berthed → Working Cargo → Cargo Complete
- Phase 9 has sub-statuses: Fully Settled, Pending Demurrage/Despatch Claim
- Backward transitions require manager role

### Phase Transition Prerequisites
- 1→2: Proforma DA must exist
- 2→3: Appointment confirmation recorded
- 3→4: Vessel arrival event logged in timeline
- 4→5: Sailed event logged in timeline
- 5→6: All expense lines have status ≥ "Invoice Received"
- 6→7: FDA document generated, management approval recorded
- 7→8: Principal approval recorded on FDA
- 8→9: Balance = zero (all AR collected, all AP paid)

### Money Rules
- All amounts in cents (integer). $87,500.00 = 8750000
- Proforma total = sum of all expense line proforma amounts + agency fee
- Actual total = sum of all expense line actual amounts + agency fee
- Balance = total funded − actual total
- Short-funding alert triggers when: (committed expenses + daily burn rate × remaining days) > funded amount

---

## Seed Data

When seeding the database, create sample data that spans all 9 phases so the dashboard shows a realistic mix. Use real-world maritime entities and Gulf Coast ports:

### Sample Ports
- New Orleans (Nashville Ave, Avondale, Burnside Terminal)
- Houston (Barbours Cut, Bayport)
- Mobile (McDuffie Coal Terminal, Alabama State Docks)

### Sample Vessels
- Bulk carriers, Supramax, Panamax, Capesize, Handysize
- Various flag states: MH, PA, SG, HK, LR, GR

### Sample Principals
- Pacific Basin, Oldendorff, Klaveness, Norden, Genco Shipping

### Sample Cargoes
- Pet coke, alumina, iron ore, steel coils, coal, grain

### Sample Vendors
- Crescent Towing, Associated Terminals, NOBRA Pilots, Bar Pilots, Port of New Orleans, LaFleur Launch Service, Gulf South Maritime

---

## What to Build First

Priority order for scaffold:
1. Monorepo structure (Turborepo + pnpm workspaces)
2. Database schema (Prisma) — all core entities
3. Shared types and enums package
4. Zod validation schemas
5. Docker Compose for local PostgreSQL
6. Next.js app with App Router skeleton (all routes stubbed)
7. Clerk auth integration
8. Seed data script
9. Dashboard page (port call list with status filters)
10. Port call detail page (tabbed view: summary, timeline, disbursement, funding, documents)
