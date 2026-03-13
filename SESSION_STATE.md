# Session State
Last updated: 2026-03-13 05:30

## Current Goal
Build ShipOps — multi-tenant SaaS for maritime ship agencies (Phase A foundation complete)

## Completed This Session
- Initialized git repo (main branch), created GitHub remote (theshipsagent/agency_platform)
- Unzipped and read PRODUCT_BRIEF.md, TECH_STACK.md, CLAUDE.md from demo archive
- Placed all three docs at project root
- Phase A foundation scaffold:
  - Root monorepo: Turborepo + pnpm workspaces (turbo.json, pnpm-workspace.yaml, package.json)
  - tsconfig.base.json (strict TypeScript)
  - packages/shared: enums, types, Zod validation schemas, constants (phase transitions, task templates, role permissions)
  - packages/db: Prisma schema (all 12 core entities + all enums), client singleton
  - packages/services: port interfaces for AIS, email, OCR, AI, storage, PDF, sanctions + registry stubs
  - docker-compose.yml (PostgreSQL 16)
  - .env.example (all variables documented)
  - apps/web: Next.js 14 App Router skeleton — all routes stubbed (dashboard, portal, API)
  - Clerk auth: ClerkProvider in root layout, middleware with public/protected route matcher, sign-in/sign-up pages
  - Tailwind + CSS variables for dark mode
  - Utility functions: cn(), centsToDisplay(), formatDate()
  - pnpm install complete, Prisma client generated

## In Progress
- Nothing — Phase A complete, ready for Phase B

## Next Steps (Phase B — piece by piece)
1. Seed data script (realistic Gulf Coast maritime data across all 9 phases)
2. Dashboard page — port call list with phase filter chips
3. Port call detail page — tabbed shell (summary, timeline, disbursement, funding, documents, tasks)
4. Service mock adapters (storage local, PDF react-pdf) — needed before document upload works
5. API routes — port-calls CRUD with phase transition logic
6. Clerk webhook handler — sync user/org to DB on creation

## Key Decisions Made
- Monorepo: Turborepo + pnpm workspaces
- Stack: Next.js 14 App Router, TypeScript strict, Tailwind, shadcn/ui, Prisma, PostgreSQL, Clerk
- All money stored as cents (integers)
- Ports & Adapters for all external services (AIS, OCR, email, AI, storage, PDF, sanctions)
- Demo runs with all PROVIDER_* = mock (no external API keys needed)
- pnpm.onlyBuiltDependencies set for Prisma + esbuild + Clerk

## Files Modified / Created
Key files:
- turbo.json, pnpm-workspace.yaml, package.json, tsconfig.base.json
- packages/shared/src/enums/index.ts — all domain enums
- packages/shared/src/types/index.ts — all TypeScript entity types
- packages/shared/src/validation/index.ts — all Zod schemas
- packages/shared/src/constants/index.ts — phase transitions, task templates, role rules
- packages/db/prisma/schema.prisma — full Prisma schema (all entities)
- packages/db/src/client.ts — Prisma singleton
- packages/services/src/*/port.ts — service interfaces (7 providers)
- packages/services/src/*/registry.ts — provider registry stubs
- apps/web/** — full Next.js app skeleton (layout, middleware, Clerk auth, all route stubs)
- docker-compose.yml, .env.example

## Context / Notes
- Run `docker compose up -d` then `pnpm db:push` to create the database schema
- Need Clerk keys to test auth — get from https://clerk.com dashboard
- GitHub: https://github.com/theshipsagent/agency_platform
