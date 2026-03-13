# CLAUDE.md — Project Instructions for Claude Code

## Project: ShipOps — Ship Agency Operational Platform

### What this is
Multi-tenant SaaS for maritime ship agencies. Manages the full port call lifecycle from nomination through final disbursement settlement. See `PRODUCT_BRIEF.md` for the complete product description and `TECH_STACK.md` for all technology decisions.

---

## Stack Summary
- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend**: Next.js API routes (co-located)
- **Database**: PostgreSQL (local dev via Docker) → Azure PostgreSQL (prod)
- **ORM**: Prisma (strict mode, multi-tenant via tenantId middleware)
- **Auth**: Clerk (multi-tenant orgs, RBAC, magic links)
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
- Soft deletes: `deletedAt` (nullable timestamp). Query middleware filters deleted records by default.
- All monetary fields are `Int` (cents, not dollars).
- All timestamps are UTC. Frontend handles timezone display.
- Prisma middleware auto-injects `tenantId` on all queries for tenant isolation.

### Service Abstraction (Ports & Adapters)
- Every external dependency (AIS, email, OCR, AI, file storage, sanctions, port data, PDF) is abstracted behind an interface in `packages/services/[name]/port.ts`.
- Mock adapters (`mock-adapter.ts`) return fixture data from JSON files. No external API calls. This is what runs during demo and development.
- Production adapters call real APIs. Only used when the corresponding `PROVIDER_*` env var points to them.
- The service registry (`packages/services/index.ts`) reads env vars and returns the correct adapter. Application code imports from the registry, never from a specific adapter directly.
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
