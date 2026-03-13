# ShipOps — Tech Stack Specification

---

## Architecture Overview

Monorepo with three deployable packages:
1. **Web app** — Next.js (agency operator UI + principal portal)
2. **API** — Next.js API routes (REST, may add GraphQL later)
3. **Mobile app** — React Native / Expo (iOS companion for scanning + field ops)

Shared packages for types, validation, and business logic.

---

## Frontend

### Framework: Next.js 14+ (App Router)
- **Why**: Server-side rendering for dashboard performance, built-in API routes eliminate separate backend service, file-based routing maps cleanly to the domain (`/port-calls/[id]/timeline`, `/port-calls/[id]/disbursement`), excellent TypeScript support.
- **Rendering strategy**: Dashboard and list views use server components for fast initial load. Detail views and forms use client components for interactivity. Modal overlays (OmniBar, scanner) are client-only.

### Language: TypeScript (strict mode)
- **Why**: The data model is complex (9 phases, 20+ entity types, dozens of enumerations). Type safety prevents the category of bugs that ship agency software can't afford (wrong amount on a DA, wrong phase transition).

### Styling: Tailwind CSS
- **Why**: Utility-first, fast iteration, consistent design tokens. Dark mode support built in (agency ops rooms are often dimly lit).

### UI Components: shadcn/ui
- **Why**: Unstyled primitives built on Radix UI. Accessible, composable, fully customizable. Avoids vendor lock-in of component libraries. Copy-paste model means we own the code.

### State Management: Zustand + TanStack Query
- **Zustand**: Lightweight client state (UI state, OmniBar, filters, edit mode).
- **TanStack Query**: Server state (port calls, expenses, documents). Handles caching, background refetch, optimistic updates, and offline mutation queuing.

### Forms: React Hook Form + Zod
- **Why**: The port call creation wizard has 30+ fields across 8 steps. React Hook Form handles the complexity without re-renders. Zod schemas are shared between frontend validation and API input validation.

### Offline: Workbox (Service Worker) + IndexedDB via idb
- **Workbox**: Caches app shell and API responses. Serves cached content when offline.
- **idb**: Stores pending mutations in IndexedDB. TanStack Query's mutation cache persists offline edits. On reconnect, replays the queue.

### Search: cmdk (Command Menu)
- **Why**: The OmniBar (Cmd+K) universal search. Same library Linear and Vercel use. Composable, accessible, fast.

---

## Backend

### Runtime: Next.js API Routes (runs on Node.js)
- **Why**: Co-located with frontend in the same deployable. Eliminates CORS, simplifies auth flow, reduces infrastructure. For a v1 SaaS this is the fastest path to production. Can extract to a standalone API service later if scale demands it.

### ORM: Prisma
- **Why**: Type-safe database access, auto-generated TypeScript types from schema, migration system, works with PostgreSQL (dev) and Azure SQL (prod). The Prisma schema becomes the single source of truth for the data model.
- **Multi-tenant**: Tenant isolation via `tenantId` column on every table + Prisma middleware that auto-filters queries.

### Validation: Zod
- **Why**: Shared schemas between frontend forms and API input validation. Single source of truth for what constitutes a valid port call, expense, timeline event, etc.

### Background Jobs: Inngest (or BullMQ if self-hosted)
- **Why**: Short-funding alerts need periodic calculation (check burn rate vs. funding every hour). Invoice email processing needs async workers. Report generation is async. Inngest provides serverless-friendly job scheduling with retry logic.

### File Storage: Azure Blob Storage
- **Why**: Documents (invoices, surveys, NOPs, scanned images) need durable storage. Azure Blob is the natural fit for the Azure ecosystem. Signed URLs for secure access.

### OCR: Azure AI Document Intelligence
- **Why**: Extracts text from scanned invoices, NOPs, survey reports. Pre-built invoice model handles vendor invoice extraction (vendor name, amount, line items, dates) without training. Custom models can be trained for maritime-specific documents (NOR, SOF templates).

### Email: Azure Communication Services (or SendGrid)
- **Why**: Sending FDA notifications, funding requests, status broadcasts, payment reminders, daily reports. Transactional email with delivery tracking.

### PDF Generation: @react-pdf/renderer or Puppeteer
- **Why**: FDAs, SOFs, and daily reports need to be generated as PDF attachments. React-pdf for template-based generation, Puppeteer for HTML-to-PDF if more design flexibility is needed.

---

## Database

### Development: PostgreSQL (local, via Docker)
- **Why**: Free, runs anywhere, excellent tooling. SQL dialect is close enough to Azure SQL that the Prisma abstraction handles the differences. Docker Compose spins it up with one command.

### Production: Azure SQL Database (or Azure Database for PostgreSQL)
- **Why**: Managed, scalable, geo-redundant backups, built-in monitoring. Azure SQL if the agency wants to stay in the Microsoft ecosystem. Azure PostgreSQL if we want to keep dev/prod parity tighter.
- **Decision**: Start with Azure Database for PostgreSQL (Flexible Server) to eliminate any dialect friction. Migrate to Azure SQL only if there's a compelling reason (e.g., agency IT mandates SQL Server).

### Schema Design Principles
- Every table has `tenantId` (UUID) — enforced multi-tenant isolation
- Every table has `createdAt`, `updatedAt`, `createdBy`, `updatedBy` — audit trail
- Soft deletes (`deletedAt` timestamp) — nothing is permanently destroyed
- Port call phase stored as enum, transitions validated in application logic
- All monetary amounts stored as integers (cents) to avoid floating point issues
- All timestamps stored as UTC, displayed in user's local timezone

---

## Authentication & Authorization

### Provider: Clerk
- **Why**: First-class Next.js integration, handles multi-tenant (organizations = agencies), supports role-based access, magic links built in, OAuth/SSO for enterprise principals. Faster to implement than Azure AD B2C with better DX.
- **Alternative**: Azure AD B2C if agency IT requires Microsoft identity stack.

### Auth Model
- **Agency staff**: Email/password + optional MFA. Assigned to an organization (tenant). Roles: operator, accounting, manager, admin.
- **Principal portal users**: Separate user pool, scoped to their organization's port calls. Invited by agency, self-service password.
- **Magic link users**: Token-scoped access. No account. Token contains: documentId or expenseId, allowed actions (view, approve, reject, comment), expiration. Email verification (6-digit code) required before action.

### Authorization
- **Tenant isolation**: Middleware checks every request. User's `tenantId` must match the resource's `tenantId`. No exceptions.
- **Role permissions**: Operator can CRUD port calls and ops data. Accounting can CRUD expenses, invoices, funding. Manager can approve FDAs, override locked records, view analytics. Admin manages users and tenant settings.
- **Phase-based permissions**: Some actions are only valid in certain phases (can't render FDA before Phase 6, can't edit SOF after Phase 5 without manager override).

---

## Monorepo Structure

```
agency_platform/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── app/                # App Router pages
│   │   │   ├── (auth)/         # Login, signup, magic-link
│   │   │   ├── (dashboard)/    # Agency operator views
│   │   │   │   ├── port-calls/
│   │   │   │   │   ├── page.tsx           # Dashboard (list view)
│   │   │   │   │   ├── new/page.tsx       # Creation wizard
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx       # Port call detail
│   │   │   │   │       ├── timeline/
│   │   │   │   │       ├── disbursement/
│   │   │   │   │       ├── funding/
│   │   │   │   │       ├── documents/
│   │   │   │   │       └── tasks/
│   │   │   │   ├── vessels/
│   │   │   │   ├── organizations/
│   │   │   │   ├── accounting/
│   │   │   │   │   ├── payables/
│   │   │   │   │   ├── receivables/
│   │   │   │   │   └── reports/
│   │   │   │   └── settings/
│   │   │   ├── (portal)/       # Principal customer portal
│   │   │   │   ├── port-calls/
│   │   │   │   ├── approvals/
│   │   │   │   └── documents/
│   │   │   └── api/            # API routes
│   │   │       ├── port-calls/
│   │   │       ├── vessels/
│   │   │       ├── organizations/
│   │   │       ├── expenses/
│   │   │       ├── funding/
│   │   │       ├── documents/
│   │   │       ├── timeline/
│   │   │       ├── tasks/
│   │   │       ├── auth/
│   │   │       └── webhooks/
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── port-call/      # Port call specific components
│   │   │   ├── accounting/     # Accounting specific components
│   │   │   ├── layout/         # Shell, sidebar, topbar, omnibar
│   │   │   └── shared/         # Status chips, money display, date pickers
│   │   ├── lib/
│   │   │   ├── api/            # API client functions
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── stores/         # Zustand stores
│   │   │   └── utils/          # Formatters, helpers
│   │   └── public/
│   └── mobile/                 # React Native / Expo (Phase 2)
│       ├── app/
│       ├── components/
│       └── lib/
├── packages/
│   ├── shared/                 # Shared TypeScript types, enums, constants
│   │   ├── types/              # Port call, vessel, expense, etc.
│   │   ├── enums/              # All enumeration values (phases, statuses, etc.)
│   │   ├── validation/         # Zod schemas (shared frontend + API)
│   │   └── constants/          # Rate categories, document types, etc.
│   ├── db/                     # Prisma schema, migrations, seed data
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts         # Demo data (sample port calls across all 9 phases)
│   │   └── client.ts           # Prisma client singleton
│   ├── services/               # External dependency abstraction (Ports & Adapters)
│   │   ├── index.ts            # Service registry — reads PROVIDER_* env vars, returns adapters
│   │   ├── types.ts            # All port interfaces (contracts)
│   │   ├── ais/                # Vessel tracking
│   │   │   ├── port.ts         # IAISProvider interface
│   │   │   ├── mock-adapter.ts # JSON fixtures, simulated positions
│   │   │   ├── marinetraffic-adapter.ts  # Production: MarineTraffic API
│   │   │   └── fixtures/       # Sample vessel tracks, geofence data
│   │   ├── email/              # Email ingestion & sending
│   │   │   ├── port.ts         # IEmailProvider interface
│   │   │   ├── mock-adapter.ts # Sample emails, console.log sender
│   │   │   ├── graph-adapter.ts # Production: Microsoft Graph API (O365)
│   │   │   └── fixtures/       # Sample maritime emails
│   │   ├── ocr/                # Document OCR & extraction
│   │   │   ├── port.ts         # IOCRProvider interface
│   │   │   ├── mock-adapter.ts # Pre-extracted text from fixture docs
│   │   │   ├── azure-di-adapter.ts # Production: Azure AI Document Intelligence
│   │   │   └── fixtures/       # Sample invoices, NOPs, surveys
│   │   ├── ai/                 # LLM agent (classification, extraction, suggestions)
│   │   │   ├── port.ts         # IAIProvider interface
│   │   │   ├── mock-adapter.ts # Rule-based classifier, regex extraction
│   │   │   ├── anthropic-adapter.ts # Production: Claude API
│   │   │   ├── azure-openai-adapter.ts # Production alt: Azure OpenAI
│   │   │   ├── rules/          # Keyword classifiers, regex patterns (used by mock)
│   │   │   └── prompts/        # LLM prompt templates (used by prod adapters)
│   │   ├── port-data/          # Port authority data ingestion
│   │   │   ├── port.ts         # IPortDataProvider interface
│   │   │   ├── mock-adapter.ts # Static JSON schedules, canned closures
│   │   │   ├── scraper-adapter.ts # Production: web scrapers per port
│   │   │   └── fixtures/       # NOLA schedule, Burnside terminal, SW Pass restrictions
│   │   ├── sanctions/          # OFAC / sanctions screening
│   │   │   ├── port.ts         # ISanctionsProvider interface
│   │   │   ├── mock-adapter.ts # Local SDN list, fuzzy matching
│   │   │   ├── ofac-adapter.ts # Production: OFAC API or Refinitiv
│   │   │   └── fixtures/       # SDN list CSV
│   │   ├── storage/            # File storage
│   │   │   ├── port.ts         # IStorageProvider interface
│   │   │   ├── local-adapter.ts # Local filesystem (./storage/)
│   │   │   └── azure-blob-adapter.ts # Production: Azure Blob Storage
│   │   └── pdf/                # PDF generation
│   │       ├── port.ts         # IPDFProvider interface
│   │       ├── react-pdf-adapter.ts # @react-pdf/renderer (demo + v1 prod)
│   │       ├── puppeteer-adapter.ts # Production alt: Puppeteer HTML→PDF
│   │       └── templates/      # FDA, SOF, daily report templates
│   └── email-templates/        # Email templates (FDA notification, funding request, etc.)
├── docker-compose.yml          # PostgreSQL for local dev
├── turbo.json                  # Turborepo config
├── package.json                # Root workspace config
├── .env.example                # Environment variables template
├── CLAUDE.md                   # Project-level Claude instructions
├── PRODUCT_BRIEF.md            # This document
├── TECH_STACK.md               # Tech stack decisions
└── SESSION_STATE.md            # Session progress tracking
```

---

## Development Environment

### Prerequisites
- Node.js 20+
- pnpm (package manager — faster than npm, better monorepo support)
- Docker (for PostgreSQL)

### Local Setup
```bash
pnpm install                           # Install all dependencies
docker compose up -d                   # Start PostgreSQL
pnpm db:push                           # Push schema to database
pnpm db:seed                           # Seed demo data
pnpm dev                               # Start Next.js dev server
```

### Environment Variables (.env.example)
```
# Database
DATABASE_URL="postgresql://shipops:shipops@localhost:5432/shipops?schema=public"

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Azure (Phase 2+)
AZURE_STORAGE_CONNECTION_STRING=
AZURE_AI_ENDPOINT=
AZURE_AI_KEY=

# Email
SENDGRID_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Service Abstraction Layer (Ports & Adapters)

Every external dependency is abstracted behind an interface (port). Each port has a mock adapter (demo/dev) and one or more production adapters. The active adapter is selected via `PROVIDER_*` environment variables.

### Provider Environment Variables
```
# Demo / Development (no external API keys needed)
PROVIDER_AIS=mock
PROVIDER_EMAIL=mock
PROVIDER_PORT_DATA=mock
PROVIDER_OCR=mock
PROVIDER_LLM=mock
PROVIDER_SANCTIONS=mock
PROVIDER_STORAGE=local
PROVIDER_PDF=react_pdf

# Production (real integrations)
PROVIDER_AIS=marinetraffic
PROVIDER_EMAIL=graph_api
PROVIDER_PORT_DATA=scraper
PROVIDER_OCR=azure_di
PROVIDER_LLM=anthropic
PROVIDER_SANCTIONS=ofac_api
PROVIDER_STORAGE=azure_blob
PROVIDER_PDF=react_pdf
```

### How It Works
1. Each service in `packages/services/[name]/` has a `port.ts` defining the TypeScript interface
2. Mock adapters in the same directory return fixture data from JSON files
3. Production adapters call real APIs (MarineTraffic, Microsoft Graph, Azure AI, etc.)
4. `packages/services/index.ts` is the registry — reads env vars and returns the correct adapter
5. Application code imports from the registry, never from a specific adapter
6. To add a new provider: write one adapter file implementing the port interface, add its key to the env var

### Mock Adapter Principles
- Mock adapters should return realistic maritime data (real port names, realistic vessel particulars, actual vendor names from the Gulf Coast)
- Simulated delays where appropriate (AIS position updates every 30s, email check every 60s)
- Fixture data should cover edge cases (customs hold, weather delay, short-funding scenario)
- Mock adapters must be stateless and deterministic for testing

---

## Deployment Target

### Platform: Azure (App Service or Container Apps)
- **Why**: The agency world is Microsoft-oriented. Azure App Service runs Next.js natively. Container Apps if we need more control.
- **CI/CD**: GitHub Actions → build → deploy to Azure.
- **Environments**: dev (local), staging (Azure), production (Azure).

---

## Key Libraries Summary

| Category | Library | Version |
|----------|---------|---------|
| Framework | Next.js | 14+ (App Router) |
| Language | TypeScript | 5+ (strict) |
| Styling | Tailwind CSS | 3.4+ |
| UI Components | shadcn/ui | latest |
| State (client) | Zustand | 4+ |
| State (server) | TanStack Query | 5+ |
| Forms | React Hook Form | 7+ |
| Validation | Zod | 3+ |
| ORM | Prisma | 5+ |
| Auth | Clerk | latest |
| Command Menu | cmdk | 1+ |
| Monorepo | Turborepo | latest |
| Package Manager | pnpm | 9+ |
| Offline | Workbox + idb | latest |
| Background Jobs | Inngest | latest |
| PDF | @react-pdf/renderer | latest |
| Mobile | Expo (React Native) | 50+ |
