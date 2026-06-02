# Session State
Last updated: 2026-06-01 (S3 SLICE #3 — INBOX TRIAGE (Email + AI) SHIPPED end-to-end, fully verified live; UNCOMMITTED — working tree has the whole slice, nothing committed yet; earlier 3 cleanup commits still UNPUSHED — push blocked by auto-mode classifier, awaiting William)

## S3 Slice #3 — Inbox Triage (Email + AI) — SHIPPED 2026-06-01 (UNCOMMITTED)

The marquee slice: AI reads incoming mail, classifies it, and links each message
to the right port call. Two mock service ports (email + ai) wired in one slice,
backed by a NEW first-class `communications` table. Live-verified against the
real dev DB on :3000 — sync ingested 5 fixtures, classified each, linked msg-0001
→ pc-005 with a full before/after audit row.

### Decision fork (William chose)
Persistence model for inbound mail → **New Communication table** (first-class),
over "reuse Document/TimelineEvent" or "ephemeral no-persist". Rationale: an
agency operator lives in their inbox; communications should be queryable/taggable,
not a demo shim. Bigger slice but builds the real product surface.

### What landed (9 stages)
1. **Schema** — `Communication` model + `CommunicationStatus` enum (UNREAD/
   TRIAGED/LINKED/ARCHIVED) in schema.prisma; `prisma db push` synced Docker DB;
   client regenerated. FK `port_call_id` is nullable → `ON DELETE SET NULL`
   (email is an independent record referencing a port call, not a child owned
   by one). `@@unique([tenant_id, external_id])` makes ingest idempotent.
2. **Shared** — `CommunicationStatus` enum (canonical, per CLAUDE.md) +
   `LinkCommunicationBodySchema` (Zod, .strict()). Deliberately did NOT add a
   Communication entity type to `@shipops/shared/types` — that file is documented
   as PDF view-contracts only; routes use a local snake_case Row + marshal.
3. **Email mock adapter** (`packages/services/src/email/mock-adapter.ts`) —
   `getUnreadMessages()` returns 5 realistic Gulf Coast fixtures tied to REAL
   seed port calls (PC-2026-0004/0005/0006), incl. one deliberate non-port-call
   newsletter for the negative path. `markAsRead` mutates an in-memory set.
4. **AI mock adapter** (`packages/services/src/ai/mock-adapter.ts`) —
   deterministic offline classifier (NO LLM). PC-number regex, money→cents
   figure extractor, ETA sniff (honest null when no parseable date), keyword→
   DocumentType table (THE William contribution point — marked in-file), and a
   confidence model. Registries wired (`PROVIDER_EMAIL`/`PROVIDER_LLM=mock`).
5. **Sync route** `POST /api/inbox/sync` — pull unread → classify → auditedMutation
   INSERT (status TRIAGED, classification jsonb verbatim, portCallId NULL) →
   markAsRead. Idempotent via existing-check. One auditedMutation per message.
6. **List route** `GET /api/inbox` — thin wrapper over `lib/inbox.listInbox()`.
7. **Link route** `POST /api/inbox/[id]/link` — parseBody + auditedMutation UPDATE
   (`auditedTable: 'communications'` captures before-snapshot), TRIAGED→LINKED.
8. **UI** — `/inbox` server page + `InboxTriage` client component (Sync button,
   per-message AI classification card, one-click "Link to PC-… (vessel)" from
   resolved suggestion or manual id input). Sidebar nav entry added (Inbox icon).
9. **Verify** — all green (see below).

### Key shared helpers created
- `apps/web/lib/api/communications.ts` — CommunicationRow type, `COMMUNICATION_COLUMNS`
  SELECT constant, `toCommunication` marshaller (DRY: 3 routes + lib read the table).
- `apps/web/lib/inbox.ts` — `listInbox(tenantId)`: list + batched PC-number
  resolution; shared by GET route AND the server page (avoids the
  server-component-fetches-own-API anti-pattern).

### Architectural calls (visibility)
- **classification stored as `Json` (jsonb) verbatim**, not exploded into columns
  — captures exactly what the AI asserted (audit/debug), mock's shape can evolve
  without a migration.
- **Human-in-the-loop linking** — ingest never auto-links even at 0.99 confidence;
  AI's suggested PC is advice, operator confirms. (Domain rule: AI suggestion is
  not authority.)
- **Per-message transaction** (one auditedMutation each) — no cross-message
  atomicity need; a partial sync is fine, next call resumes.
- **Known keyword-collision pinned in smoke test** — msg-0004 (pilot booking that
  *mentions* "under separate invoice") classifies as INVOICE. The keyword
  classifier can't tell "is an" from "mentions an"; a real LLM adapter would.
  Documented in `smoke-inbox.ts` rather than hidden — marks the seam where the
  PROVIDER_LLM upgrade pays off.

### Verification (all green)
- 4 typechecks (web, services, shared, db) — clean
- `pnpm --filter web lint` — clean
- 3 CI guards — ✓ (audit-trail now 7 mutation files incl. sync + link)
- 6 smoke tests — ✓ inbox (NEW), pdf, storage, input-val (18), isolation, audit (22)
- Live (`:3000`, tenant-gca-001): sync→ingested 5/skipped 0; re-sync→0 (mock
  marked read); list resolves PC-2026-0004/0005/0006 to real port calls;
  link→LINKED+pc-005; negative cases (bogus PC→400, unknown field→400);
  audit_logs shows 5 CREATE (before=null) + 1 LINK_TO_PORT_CALL (before/after captured).

### Live DB state note
Dev DB now has 5 `communications` rows (tenant-gca-001): 4 TRIAGED, 1 LINKED
(msg-0001→pc-005). These are live-test residue, left as realistic demo data.
Seeding communications in `prisma/seed.ts` is a clean follow-up. Dev server
running background on :3000 — open /inbox to view.

### Parked for follow-up
- **Attachments → Document/storage** (deferred this slice): fixtures CARRY
  attachments (NOR pdf, invoice pdf); wiring attachment→documents row is the
  natural next slice (storage already exists). Table needs no change to add it.
- **Seed communications** into prisma/seed.ts for a fresh-clone demo.
- **AI keyword table refinement** — William's domain-knowledge contribution
  point (marked in `ai/mock-adapter.ts`); msg-0004 collision is the worked example.
- **sendEmail / suggestActions / extractDataFromText** are stubbed (out of scope).
- **Status ARCHIVE action** has no UI yet (enum value exists).



## Structural Cleanup + Drift Fork (2026-05-31)

Two commits between the S3 Slice #2 capstone and whatever the next slice
becomes. Both are pure refactors with zero behavioral change to PDF/storage
output (smoke tests produced byte-identical FDA + SOF before and after).
Goal was to put `@shipops/shared` in better shape before the next big slice
and to resolve the "creditScore drift" workaround that had been parked
since S3 Slice #1.

### Commits

- `60f43e3` — `chore(structure): collapse duplicate phase labels + promote utils to shared`
- `80fcc78` — `chore(types): drop creditScore ghost field, document @shipops/shared/types intent`

### What landed and why

**Drift sweep** (premise check on the parked "Prisma↔DB drift" finding):

- Built a Python differ comparing Postgres `information_schema.columns`
  against parsed Prisma schema. Result: Prisma schema and live DB are
  **perfectly aligned** — 432 ↔ 432 columns, zero type/nullability/missing
  mismatches. The drift William hit in S3 Slice #1 had already been fixed
  at the schema level; the surviving symptoms were in app code only.
- The REAL drift was one layer outward: hand-written entity types in
  `@shipops/shared/types/index.ts` had 23 fewer fields than Prisma for
  `Organization`, 41 fewer for `PortCall`, 8 fewer for `Vessel`. Plus one
  ghost field (`creditScore`) with no DB column.

**Then a scout flipped the framing.** Searching every import site of
`@shipops/shared` showed that ONLY 3 files use the hand-written entity
types — all in the PDF flow (`packages/services/src/pdf/port.ts`, the FDA
route, the smoke-pdf script). The FDA route already defines its own local
`{Entity}Row` interfaces for DB shapes and marshals them into the shared
shapes for the PDF adapter call. So the shared types aren't drifted DB
mirrors — they're **PDF input contracts**, intentionally minimal. The
"missing 23+41+8 fields" weren't missing; they were never relevant to the
PDF's needs. Coincidence that TimelineEvent had all 14/14 (SOF needs them
all).

So the planned "option A — generate types from Prisma" was wrong-headed.
It would have bloated the PDF input contract to 40+ fields half of which
are KYC/sanctions/IBAN noise to the PDF. Surgical fix instead:

1. Delete `creditScore` from the `Organization` shape (one ghost field).
2. Delete the workaround comment + `creditScore: null` in the FDA route.
3. Delete `creditScore: null` from the smoke-pdf fixture.
4. Add a doc comment at top of `packages/shared/src/types/index.ts`
   explicitly stating these are PDF view contracts, NOT DB row mirrors.
   Tells future devs not to "sync" them with Prisma.

**Structural cleanup** (three findings from the monorepo file audit):

- **M1.** Deleted `apps/web/apps/` — physical residue from the S3 Slice #2
  cwd-bug. Gitignored so not tracked, but cluttering disk.
- **M2.** Collapsed FOUR copies of `PHASE_DISPLAY` (initial scout caught
  only one in `phase-transitions.ts`; blast-radius grep at execution time
  caught two more inline copies in the port-call detail page + PhaseControls
  component, plus the original). All now import `PHASE_LABELS` from
  `@shipops/shared/enums`. Same data, one source. Same fix dropped the
  duplicated `DB_PHASES` / `DbPhase` type / local `PHASE_ORDER` Record —
  these were rewrites of `PortCallPhase` / `PHASE_ORDINAL` already in shared.
- **M3.** Promoted `money` + `dates` formatters from `apps/web/lib/utils/`
  to a new `packages/shared/src/utils/` subpath. Added `date-fns` to
  shared's deps. Replaced `fmtMoneyCents` in the PDF mock adapter with a
  new `centsToDisplayOrDash` (null-safe sibling of `centsToDisplay`).
  Note: `money.ts` had ZERO consumers in apps/web — it was dead-on-arrival
  there, only used via duplication in the services PDF adapter. Move
  retroactively fixes the original intent.

### Findings parked for follow-up (next session can pick any of these up)

- **Email + AI slice** remains the strongest next slice candidate. Two
  adapters in one slice + the marquee demo + email attachments will land
  in storage which already exists.
- **Sanctions** small but needs vendor-approval UI scout (hidden second half).
- **AIS vessel position widget** clean small slice, mockable easily.
- **Seed data agency-fee double count** still cosmetic in FDA totals
  (existed before this session, unchanged).
- **Orphan documents row pc-005:`b6b67e11-...`** still exists. The physical
  file was deleted in M1 but the row remains. Soft-delete or leave as forensic.
- **MIME magic-byte sniffing** still deferred.
- **Orphan-file sweeper** still future work (when documents > ~100 or S3).
- **Inconsistent shared barrel vs subpath imports** — codebase mixes
  `from '@shipops/shared'` and `from '@shipops/shared/enums'`. Both work
  (shared's index.ts re-exports everything). Style rule to be decided
  later — not in scope now.

### Verification (same green slate as end of S3 Slice #2)

- 4 typechecks (web, services, shared, db) — clean both commits
- `pnpm --filter web lint` — clean
- 3 CI guards — ✓ (tenant isolation, audit trail, input validation)
- 5 smoke tests — ✓ pdf (2/2), storage (7/7), input-val (18/18),
  isolation (5/5 + cleanup), audit-trail (22/22)
- `smoke-pdf` produced byte-identical FDA (2,943) + SOF (2,135) before
  AND after both commits — confirms zero behavioral change

### Net diff across both commits

- 15 files touched
- ~125 lines deleted, ~52 lines added
- Net: ~-73 lines (heavy on deletion = healthy dedup pattern)
- One new file: `packages/shared/src/utils/index.ts`
- Two deleted files: `apps/web/lib/utils/{money,dates}.ts`

### Process learnings (worth carrying forward)

- **A parallel `Edit` call silently no-op'd once** — first run on
  `port-calls/page.tsx` reported success but didn't apply (caught only by
  typecheck after the dependent file was deleted). The defensive habit:
  when delete-then-replace across multiple files, GREP for the old path
  after the Edits and confirm zero matches before any rm. "Edit returned
  success" is not verification.
- **Drift framing matters.** Counting "X type has 23 fewer fields than Y"
  assumes X is *trying to mirror Y*. If X is actually a view contract,
  the same number tells a totally different story. Lesson: verify the
  intent of a type before measuring its "completeness."

---

## S3 Slice #2 — Document Upload (SHIPPED 2026-05-31)

Second user-reachable vertical slice on the `@shipops/services` ports-and-adapters
pattern. POST a multipart file to `/api/port-calls/[id]/documents`, the storage
adapter writes it under `apps/web/.uploads/{tenantId}/{portCallId}/...`, an
`auditedMutation` writes the documents row + audit_logs row atomically, and the
Documents tab UI shows it with a download link. Live-verified against pc-005:
HTTP 201 on POST, SHA-256 byte-identical download, audit row present with
correct shape.

### Commits this slice (planned — pending push)

- `chore(audit): drop spurious audit_log_port_call FK + Test 4 for polymorphic resource_type`
- `feat(services): local-fs storage adapter + monorepo-root path resolution + smoke test`
- `feat(api): document upload + download routes + Documents-tab UI (S3 slice #2)`
- `chore: drive-by cleanups (PortCallHeader phaseEnumToNumber vestige, .env.example providers)`
- `docs(session-state): S3 slice #2 shipped`

### Path through the slice

1. **Upload form** (`components/port-call/UploadDocumentForm.tsx`, "use client")
   — file input (PDF/JPEG/PNG, ≤25MB) + document-type dropdown → multipart POST.
2. **POST `/api/port-calls/[id]/documents`** — tenant-checks the port call,
   parses multipart, validates MIME + size, runs metadata through `parseBody`,
   builds `{tenantId}/{portCallId}/{uuid}-{filename}` storage key, writes file
   via `getServices().storage.upload(...)`, then `auditedMutation` INSERTs the
   documents row.
3. **GET `/api/port-calls/[id]/documents`** — list, used by the server-component
   page after `router.refresh()`.
4. **GET `/api/documents/[id]/download`** — tenant-checks the doc, pulls bytes
   through `storage.download(key)`, sanity-checks `byteLength === size_bytes`,
   streams back with RFC 5987 `Content-Disposition`.
5. **Documents tab page** — server component, fetches list inline, renders
   Generated section (FDA download, unchanged from slice #1) + Upload section
   (the client form) + Uploaded list with per-doc download buttons.

### Four architectural calls (visibility for future-Claude)

- **Storage port extended with `download(key): Promise<Buffer>`.** `getSignedUrl`
  was designed for S3-style direct-browser-fetch presigned URLs, but local-fs
  can't presign — file:// doesn't work from a web page. `download()` gives the
  route an adapter-agnostic "give me the bytes server-side" call. Local-fs
  reads from disk; a future S3 adapter calls GetObject. Route stays unchanged.

- **Adapter path resolution walks up to the monorepo root.** Initial
  `resolve('apps/web/.uploads')` was cwd-relative — `next dev` runs from
  `apps/web/` so it landed at `apps/web/apps/web/.uploads/`. Fixed by walking
  up from cwd looking for `pnpm-workspace.yaml` and anchoring under that. The
  monorepo-root marker is stable regardless of which package's command started
  the process. **Reusable pattern** for any future adapter that needs a stable
  workspace-relative path.

- **Polymorphic audit_logs.** The discovered FK `audit_log_port_call` was a
  Prisma `@relation` that materialized as a real SQL constraint requiring
  `resource_id` to exist in `port_calls`. That contradicted the polymorphic
  `resource_type` column. Every audited mutation for a non-port_call resource
  (vessel, port, cargo_line, document, expense) was silently broken — the
  smoke test never caught it because it only exercised port_call. Dropped the
  FK + extended verify-audit-trail with Test 4 (vessel UPDATE) so the
  regression can't recur.

- **File written before DB row, not transactional.** If FS write succeeds but
  the audited INSERT rolls back, we leak a file (recoverable via an
  orphan-sweeper). The inverse — DB row pointing at a missing file — would
  crash every download. Orphan sweeper is out of scope for this slice but is
  the natural follow-up when documents count grows past ~100 or when we
  swap in S3.

### Verification (all green)

- 4 typechecks (web, services, shared, db) — clean
- `pnpm --filter web lint` — clean
- 3 CI guards — ✓ (tenant isolation, audit trail, input validation)
- 5 smoke tests — ✓ storage (7 checks), pdf (2), input-validation (18), tenant-isolation (5), audit-trail (**22/22**, up from 16)
- Live route tests against pc-005: POST 201, GET list, GET download (SHA-256 identity), audit_logs row present

### Findings parked for follow-up

- **Orphan doc row pc-005:`b6b67e11-…`** — created during the cwd-bug
  reproduction. Its `storage_key` now resolves under the post-fix root where
  no file exists. Either soft-delete (`UPDATE documents SET deleted_at = NOW()
  WHERE id = 'b6b67e11-…'`) or leave as forensic. Misplaced files at
  `apps/web/apps/web/.uploads/...` are gitignored via the new `**/.uploads/` rule.
- **Audit row for the orphan doc remains** — append-only by design.
- **Prisma schema vs live DB drift continues** — `organizations.credit_score`
  drift surfaced in slice #1, not resolved. Wider audit needed.
- **MIME magic-byte validation deferred.** Today we trust browser-supplied
  file.type. Add real sniffing when abuse becomes plausible.
- **Orphan-file sweeper script** — needed when documents grows past ~100 rows
  or when production S3 lands (FS writes can fail after audited row exists in
  bad failure modes).
- **No SOF button yet** (adapter renders it; UI not wired).

### Next slice candidates

With both PDF (slice #1) and Storage (slice #2) shipped, the rollout reads:

1. **Email + AI — incoming email triage** — bigger lift but the marquee demo.
   Two mock adapters in one slice. Email attachments would land in storage,
   which now exists. **Strong candidate.**
2. **Sanctions** — small (single `checkEntity`/`checkVessel`), gates real
   vendor-approval risk. Hidden second half: needs a vendor-approval UI to
   hook into.
3. **AIS vessel-position widget** — dashboard demo. Mocked easily; real
   providers cost money.
4. **OCR** — defer until invoice automation becomes top priority.

---

## S3 Slice #1 — FDA Download (SHIPPED 2026-05-31)

The first user-reachable vertical slice exercising the `@shipops/services`
ports-and-adapters pattern end-to-end. Live-verified against `pc-005` (real
seed data) at `http://localhost:3001/api/port-calls/pc-005/fda`: HTTP 200,
3,083-byte valid PDF v1.3, `Content-Disposition: attachment;
filename="FDA-PC-2026-0005.pdf"`. Extracted text confirms real vessel
("MV GENCO THUNDER"), principal ("Genco Shipping & Trading"), and arrival
timestamp ("2026-04-14 16:41Z") flowing through from the DB.

### Commits this slice (3)

- `ae7c675` — `feat(services): pdfkit-based mock adapter for PDF FDA/SOF generation`
- `04e6a0d` — `feat(services): lazy per-provider construction in getServices() registry`
- `4d22d94` — `feat(api): FDA download endpoint + documents-page button (S3 slice #1)`

### Path through the slice

1. **Button (Link)** in `app/(dashboard)/port-calls/[id]/documents/page.tsx` → native browser download
2. **GET `/api/port-calls/[id]/fda`** (`app/api/port-calls/[id]/fda/route.ts`) — tenant-isolated reads of port_calls + vessels + organizations + expenses + funding_records, marshals snake→camel, computes DA totals
3. **`getServices().pdf.generateFDA(...)`** — registry getter resolves the mock PDF adapter the first time `.pdf` is accessed (memoized)
4. **`pdfMockAdapter.generateFDA`** in `packages/services/src/pdf/mock-adapter.ts` — pdfkit renders single-page LETTER FDA with three-column meta block + expense table + totals
5. **Response** — `application/pdf` + `Content-Disposition: attachment` + per-port-call filename

### Three architectural calls made (visibility for future-Claude)

- **PDFKit, not @react-pdf/renderer.** CLAUDE.md hinted `PROVIDER_PDF=react_pdf` but that would have forced React into the services package (services should be pure-Node). pdfkit is 80% smaller, 10+ years mature, purpose-built for server-side. Updated CLAUDE.md (prior commit) to reflect.
- **Lazy per-provider registry** (`04e6a0d`). Before: `getServices()` eagerly instantiated all 7 providers; AIS's "Phase B" throw killed the whole registry. After: each provider's factory runs on first property access via TS getters + memoize-with-error-caching. Lets future slices ship one adapter at a time without first stub-implementing the other six.
- **Webpack server-side externals for pdfkit** (in `next.config.mjs`). pdfkit and its fontkit-family transitive deps load AFM font-metric files at runtime via `fs.readFileSync`; webpack's default bundling drops those data files. Marking the chain (`pdfkit`, `fontkit`, `linebreak`, `unicode-properties`, `unicode-trie`, `restructure`, `tiny-inflate`, `brotli`, `crypto-js`, `png-js`) as externals keeps them as plain Node requires. **Reusable pattern** for any future adapter pulling in a Node-native package with runtime asset loading.

### Verification

- `pnpm --filter @shipops/services typecheck` → clean
- `pnpm --filter web exec tsc --noEmit` → clean
- `pnpm --filter web lint` → clean
- `bash scripts/ci-tenant-isolation-guard.sh` → ✓
- `bash scripts/ci-audit-trail-guard.sh` → ✓ (route is a read, not a mutation)
- `bash scripts/ci-input-validation-guard.sh` → ✓ (no req.json())
- `pnpm --filter @shipops/services smoke-pdf` → ✓ FDA 2,943 bytes, SOF 2,135 bytes, valid PDF v1.3
- Live route smoke tests: pc-005 (with expenses) → 200, pc-008 (no expenses) → 200, non-existent id → 404

### Findings parked for follow-up (not part of this slice)

- **Prisma schema ↔ live DB drift.** `organizations.credit_score` no longer exists in the live DB (replaced with `credit_limit_cents`). Prisma schema and `@shipops/shared` Organization type still reference `creditScore`. Route hardcodes `creditScore: null`. Wider drift may exist on other tables — worth a sweep.
- **Seed data agency-fee double count.** Seed creates an "Agency fee" expense with `is_agency_fee=false`, so my route includes it in the expense table AND adds `port_calls.agent_fee_actual_cents` separately. Cosmetic in the PDF (totals look ~one fee too high). Seed data fix, not route.
- **`PortCallHeader` still has a `phaseEnumToNumber` map.** Vestige from before the string-keyed `PortCallPhase` flip. Lines 6-10 of `components/port-call/PortCallHeader.tsx`. Small standalone cleanup.
- **No SOF button yet.** The adapter renders SOF (`generateSOF` works in the smoke test), just no UI/route wired. Trivial to add when needed.
- **`apps/services/.env.local` PROVIDER_PORT_DATA=mock** references a "port_data" service that doesn't exist in the codebase. Vestige from the original 8-service CLAUDE.md hint. Harmless but worth pruning.

### Next slice candidates (William's pick when next session starts)

Same feature-first sequencing logic as the S3 scout. With the FDA slice done, the next-most-visible features are:

1. **Storage + Document Upload** — closes the "Documents tab" to having real upload as well as generated download. Local-filesystem mock adapter is ~1 hr. Probably the next slice.
2. **Email + AI — incoming email triage** — bigger lift, but a real product differentiator. Two adapters in one slice + a new background-job-ish loop.
3. **Sanctions** — small (single check call) and gates a real workflow risk (sanctioned vendor approval). Could be a 1-day slice.
4. **AIS — vessel position widget** — visible on dashboard. AIS providers usually cost real money; mock returns canned positions tied to known IMOs.
5. **OCR** — gates invoice automation. Bigger surface area, defer until invoice-handling becomes a top priority.

---



## S3 Scout (2026-05-31) — REFRAMES the work

**Premise check failed.** The roadmap entry "S3 — service adapter implementations unblocks production" was written against an assumed mental model that no longer matches the code. Spending 20 min reading the actual package surface area before committing to a plan caught this.

### What's actually in `packages/services/src/`

7 services, each is a directory with exactly two files:

| Service | `port.ts` (interface) | `registry.ts` (factory) | `PROVIDER_*` env var |
|---------|----------------------|-------------------------|----------------------|
| `ais` | `IAISProvider` — `getVesselPosition`, `getVesselHistory` | throws "Phase B" | `PROVIDER_AIS` |
| `email` | `IEmailProvider` — `sendEmail`, `getUnreadMessages`, `markAsRead` | throws "Phase B" | `PROVIDER_EMAIL` |
| `ocr` | `IOCRProvider` — `extractText`, `extractInvoice` | throws "Phase B" | `PROVIDER_OCR` |
| `ai` | `IAIProvider` — `classifyEmail`, `suggestActions`, `extractDataFromText` | throws "Phase B" | `PROVIDER_LLM` |
| `storage` | `IStorageProvider` — `upload`, `getSignedUrl`, `delete`, `exists` | throws "Phase B" | `PROVIDER_STORAGE` (default `local`) |
| `pdf` | `IPDFProvider` — `generateFDA`, `generateSOF` | throws "Phase B" | `PROVIDER_PDF` (default `react_pdf`) |
| `sanctions` | `ISanctionsProvider` — `checkEntity`, `checkVessel` | throws "Phase B" | `PROVIDER_SANCTIONS` |

Top-level `index.ts` exports a `getServices(): Promise<ServiceRegistry>` that lazy-loads all 7 registries and memoizes.

### Three corrections to the existing plan

1. **CLAUDE.md said "8 services with port data" — there are 7, port-data isn't a service.** CLAUDE.md updated.
2. **CLAUDE.md said "mock adapters return fixture data from JSON files."** No mock adapter files exist at all. The pattern is documented but not implemented. CLAUDE.md updated to mark this as the target state, not the current state.
3. **The killer finding: `getServices()` is never called from anywhere in the app.** Confirmed by an exhaustive Explore agent sweep — zero imports of `@shipops/services` outside the services package itself. No API route, no server component, no lib utility, no middleware imports it. The "Phase B not implemented" errors are **unreachable dead code today** — they don't block any production code path because there's no production code path that touches them.

### Why this changes the S3 mental model

The roadmap framed S3 as "fix broken adapters → unblocks production." Reality: there's nothing in production calling the adapters, so there's nothing to unblock. The actual blocker is **feature work that needs an external service**. Examples from the product brief:

- "AI classifies incoming email and links it to a port call" → needs `email` (read inbox) + `ai` (classify) + a new API route + a new UI affordance
- "FDA generated and downloadable as PDF" → needs `pdf` + a Phase 6→7 route + a download endpoint
- "Vessel position visible on the dashboard" → needs `ais` + a polling job or on-demand fetch + UI
- "Document upload to a port call" → needs `storage` + a multipart route + UI
- "Vendor sanctions check before approval" → needs `sanctions` + a hook into vendor-create + a UI badge
- "Invoice OCR on uploaded PDFs" → needs `ocr` + a background job + a review UI

Each of those is a vertical slice spanning interface + mock adapter + API route + UI. Adapters in isolation don't ship value.

### Recommended sequencing (for William's decision next session)

**Order by leverage, not by alphabetical service name.** My read:

1. **Storage first.** Local-filesystem mock adapter is trivial (~1 hour). Every document feature in the product brief depends on it. Pick this first because (a) it's foundational, (b) cheap, (c) hard to get wrong, and (d) lets you exercise the ports-and-adapters pattern end-to-end (interface → adapter → registry case → call site → feature) with low risk.
2. **PDF second.** FDA generation is a visible, demo-able deliverable — it's the document agency principals actually want. Mock can render a real PDF using `react-pdf` from fixture JSON; production is the same renderer with real data.
3. **Email + AI together third.** They unlock the "incoming-email classification" feature, which the product brief calls out as a differentiator. Mock email returns canned fixtures; mock AI returns canned classifications. Lets you build the UX end-to-end before paying for OpenAI/SendGrid.
4. **AIS, OCR, Sanctions — defer.** Build each only when the specific feature it gates becomes the next thing to ship. Don't build adapters with no caller.

**Alternative framing William may prefer:** rather than "build storage first because cheap," pick the **first user-visible feature** that needs an external service and build vertically — interface usage + mock adapter + route + UI — for that one feature. The "build the foundational service first" approach risks 1 hour of work that no user-visible feature uses yet, which is a flavor of premature abstraction.

### What's NOT in this scout

- I did not look at how the `_archive/seed_offices_users_*.sql` or the seed.ts changes intersect with services — that's S2 follow-up, not S3.
- I did not check whether the product brief's "Phase B" terminology lines up with anything specific in the codebase beyond the error strings — the strings appear to be vestigial.
- I did not measure how big each adapter would be (the local-fs storage adapter is genuinely tiny; a real OpenAI client wrapper would be 100+ lines with retries/streaming/etc.). Adapter-by-adapter effort estimation should happen when each is picked.

### Decision needed from William next session

- **Strategy fork:** foundation-first (build storage adapter as a cheap shakeout of the pattern) **vs** feature-first (pick the next user-visible feature, build its full vertical slice including the adapter it needs).
- If feature-first: which feature? Document upload (storage), FDA download (pdf), email triage (email + ai), vessel map (ais), vendor sanctions badge (sanctions), invoice OCR (ocr) — these are roughly ordered by "how visible to the agency operator." William's call.

---


## Current Goal
**S2.5 — Zod-at-boundary: SHIPPED** at `11c0925`. Three layers of structural defense now in place across the API mutation boundary:
- **S1** (committed `a17c3b9`): tenant isolation via `tenantQuery` helper + CI guard
- **S2** (committed `5bbea3b` + follow-up `a891c41`): atomic audit trail via `auditedMutation` + CI guard + DB smoke test
- **S2.5** (committed `11c0925`): Zod input validation via `parseBody` helper + 6 new `*BodySchema` exports + CI guard + in-process smoke test (18/18 green)

**Bonus this session:** `0d4ef42` added `typecheck` script + tsconfig to `@shipops/services` so the CI typecheck fan-out now covers it too (closing the same gap that hid the seed.ts errors before `56f86f1`).

**Spawn-task follow-up executed (pending commit):** Flipped `PortCallPhase` from numeric (1-9) to string-valued (matching keys) — the inconsistency surfaced during S2.5. Added `PHASE_ORDER` (workflow-sequence array) and `PHASE_ORDINAL` (lookup) to preserve ordinal semantics. Rewrote `PHASE_LABELS`, `phaseColors` (PhaseBadge), `VALID_PHASE_TRANSITIONS`, `PHASE_PREREQUISITES` with string keys. Dashboard URL contract flipped from `?phase=4` to `?phase=ACTIVE` (pre-production, no bookmarks at risk; old URLs degrade gently to "show all"). `PhaseTransitionBodySchema` simplified from `z.enum([...keys])` back to `z.nativeEnum(PortCallPhase)`. Full verification matrix green: 3 typechecks, lint, 3 CI guards, 3 smoke tests (S1 4/4, S2 16/16, S2.5 18/18).

## S2.5 Scout Findings (2026-05-31)

- **Zod already installed** in `apps/web/package.json` and `packages/shared/package.json`. No new top-level deps needed.
- **`packages/shared/src/validation/index.ts` already exists** with 14 pre-built schemas — but ZERO routes import them. Pre-built scaffold dead code.
- **Pre-built schemas diverged from current route bodies.** `CreatePortCallSchema` has 8 fields; the actual route accepts 18. `CreateVesselSchema` is for full vessel creation; the route POSTs just `{ imo }` and looks up from `ships_register`. `PhaseTransitionSchema` expects `portCallId` in body; the route gets it from URL params.
- **PortCallPhase numeric-vs-string mismatch.** `PortCallPhase` is the only enum in `packages/shared/src/enums/index.ts` with numeric values (1–9) — every other enum uses string values matching the key. `z.nativeEnum(PortCallPhase)` validates numbers, but the API + Postgres both use string keys. Required `z.enum([...string keys])` in the schema. Spawn-task chip filed to flip PortCallPhase to string values.

## S2.5 Architecture Decisions

- **New `*BodySchema` exports alongside aspirational schemas, not replacing them.** The pre-built schemas (CreatePortCallSchema, etc.) represent a future-state API; the routes diverged. Adding suffixed `*BodySchema` versions matching current route bodies avoids breaking working frontends while preserving the aspirational shape for a future redesign.
- **`.strict()` by default.** Rejects unknown fields so client-side typos like `{ portCallTpye: ... }` fail loudly instead of silently dropping. Combined with S1 (tenant) and S2 (audit), forms a third "no silent surprises" layer.
- **XOR refine for sub-status.** What was a runtime branch in the route (`if (body.activeSubStatus) {} else if (body.settledSubStatus) {}`) is now a schema invariant via `.refine()`. Schema-as-documentation: the type itself says "exactly one."
- **Discriminated union return from `parseBody`.** Returns `{ok: true, data} | {ok: false, response}` so routes type-narrow without try/catch. Keeps validation in the normal return path; matches Next.js route handler style.

## S2.5 Sub-tasks (all done)

- [x] **S2.5a** — `apps/web/lib/api/parse.ts`: `parseBody(schema, body)` discriminated-union helper. 400 response includes flattened `[{path, message}]` issue list, omits Zod's `received`/`expected` (potential type leak).
- [x] **S2.5b** — 6 new `*BodySchema` exports in `packages/shared/src/validation/index.ts`: `CreateVesselBodySchema`, `RegisterPortBodySchema`, `CreatePortCallBodySchema` (with nested `CargoLineBodySchema`), `UpdatePortCallFileStatusBodySchema`, `PhaseTransitionBodySchema` (string-key enum), `UpdateSubStatusBodySchema` (XOR refine).
- [x] **S2.5c** — All 6 routes migrated through `parseBody`. Removed obsolete runtime validation guards now subsumed by schemas (`VALID_STATUSES.includes`, `DB_PHASES.includes`, `VALID_ACTIVE_SUBS.includes`, `VALID_SETTLED_SUBS.includes`, the manual `if (!portCallType || ...)` required-field check). Sub-status route simplified: no more two-branch XOR check, schema guarantees structural invariant.
- [x] **S2.5d** — `scripts/ci-input-validation-guard.sh` (wired into `.github/workflows/ci.yml`): fails build on `req.json() as ` literal in `apps/web/app/api/`. Discriminator is the `as ` cast suffix — bare `req.json()` is legitimate inside `parseBody`. Negative test passes (synthetic regression → EXIT=1). Smoke test at `packages/shared/scripts/verify-input-validation.ts` (run via `pnpm --filter @shipops/shared verify-input-validation`): 18 in-process assertions covering `.strict()` enforcement, PortCallPhase string-vs-number regression guard, XOR refine, required-field enforcement, RegisterPortBody field constraints.

## S2.5 Files Touched

- **New:**
  - `apps/web/lib/api/parse.ts` — the helper.
  - `packages/shared/scripts/verify-input-validation.ts` — in-process smoke test.
  - `scripts/ci-input-validation-guard.sh` — CI grep guard.
- **Modified (helpers/infra):**
  - `packages/shared/src/validation/index.ts` — appended 6 BodySchemas.
  - `packages/shared/package.json` — added `tsx` devDep + `verify-input-validation` script.
  - `.github/workflows/ci.yml` — added `Input validation guard` step.
- **Modified (route migrations, 6 files):** `apps/web/app/api/{vessels,ports,port-calls}/route.ts`, `apps/web/app/api/port-calls/[id]/{route,phase/route,sub-status/route}.ts`.

## S2.5 Final Verification

- `pnpm --filter web exec tsc --noEmit` → clean
- `pnpm --filter @shipops/shared exec tsc --noEmit` → clean
- `pnpm --filter web lint` → no warnings/errors
- `bash scripts/ci-tenant-isolation-guard.sh` → ✓ S1 still green
- `bash scripts/ci-audit-trail-guard.sh` → ✓ S2 still green
- `bash scripts/ci-input-validation-guard.sh` → ✓ S2.5 green; negative test (synthetic raw cast) correctly fails with EXIT=1
- `pnpm --filter @shipops/db db:verify-audit-trail` → ✓ S2's 16/16 still pass
- `pnpm --filter @shipops/db db:verify-isolation` → ✓ S1 isolation still verified
- `pnpm --filter @shipops/shared verify-input-validation` → ✓ all 18 in-process checks pass

## Original S2 Reference (kept for restore-point continuity)

## S2 Scout Findings (2026-05-31)

- **`audit_logs` table fully modeled.** schema.prisma:970-988. Columns: `tenant_id`, `user_id` (FK → users.id), `action`, `resource_type`, `resource_id`, `before` (jsonb), `after` (jsonb), `created_at`. Indexed three ways.
- **Zero audit writes in app code.** Truly greenfield — confirms the memory note.
- **`audit_logs.user_id` is NOT NULL with FK to users.id.** Big design implication: every audited request needs a real User row, not just a Clerk session. Drove the `Actor` discriminated union design (UserActor vs SystemActor) and the request-scoped `clerk_user_id → users.id` lookup in `getRequestContext`.
- **Mutation surface: ~11 sites across 7 route files.** Smaller than S1's 26 across 12.
- **Seed surprise discovered during smoke-test failure:** `seed_offices_users.sql` was an orphan SQL script — never wired into `db:seed`. The CEO/ADMIN user (`user-hq-ceo`) chosen as the dev actor didn't exist in the live DB. Fell back to `user-mg-001` (MANAGER, the most senior actually-seeded user). **RESOLVED 2026-05-31:** SQL ported into `prisma/seed.ts` (7 offices, 27 users covering all 9 UserRole values, William Davis as `user-nol-mgr`), original SQL archived to `packages/db/_archive/seed_offices_users_2026-05-31_consolidated-into-prisma-seed.sql`. `DEV_USER_ID` restored to `user-hq-ceo` (Robert Datum, ADMIN). Migrated live dev DB to match: renamed 3 stale offices `office-hou`/`-nol`/`-mob` → `-001` IDs (FK CASCADE handled office_ports + port_calls), reassigned 7 pc-003 tasks from `user-op-001` → `user-nol-ag1` (Michelle Tureaud), dropped the 3 stale demo users. `verify-audit-trail` smoke test re-runs clean (16/16).

## Architecture Decisions

- **App-layer wrapper, not DB triggers** (S1 mental-model continuity — explicit > implicit, grep-able failure mode).
- **One context object: `RequestContext = {tenantId, actor}`** — replaces `getTenantId()` as a thin alias to avoid the "remembered tenant scope, forgot actor" bug.
- **Single mutation + single audit row per transaction.** Cross-write atomicity (e.g. port_call + cargo_lines) is a separate concern; pre-existing gap, not introduced by S2.
- **SystemActor explicitly rejected at runtime** until `audit_logs.user_id` is made nullable or a system sentinel user is seeded. Better than letting Postgres bubble a cryptic FK error.

## S2 Sub-tasks (all done)

- [x] **S2a** — Extended `apps/web/lib/api/auth.ts`. New `getRequestContext()` returns `{tenantId, actor}`. `Actor = UserActor | SystemActor` discriminated union. Dev shim returns a literal `DEV_CONTEXT` (no DB roundtrip) pointing at `user-mg-001` (MANAGER, most-senior actually-seeded user). Prod path looks up users by `(tenant_id, clerk_user_id)` defense-in-depth. `getTenantId()` retained as a thin alias for S1's pre-existing call sites.
- [x] **S2b** — New `packages/db/src/audit.ts` with `auditedMutation`. Atomic: BEGIN → SELECT `row_to_json` for `before` → mutation with RETURNING → INSERT audit_logs → COMMIT (ROLLBACK on any error, including mutation failures). SystemActor calls throw a typed error.
- [x] **S2c** — All 7 mutation route files migrated:
  - `vessels/route.ts` (1 INSERT — `CREATE vessel`)
  - `port-calls/route.ts` (2 INSERTs — `CREATE port_call`, `CREATE cargo_line`)
  - `port-calls/[id]/route.ts` (1 UPDATE — `UPDATE_FILE_STATUS`)
  - `port-calls/[id]/phase/route.ts` (1 UPDATE — `PHASE_TRANSITION`)
  - `port-calls/[id]/sub-status/route.ts` (2 UPDATEs — `ACTIVE_SUB_STATUS_CHANGE`, `SETTLED_SUB_STATUS_CHANGE`)
  - `ports/route.ts` (2 INSERTs — `CREATE port` US + foreign)
  - INSERT routes generate UUID via `crypto.randomUUID()` in JS so the same id is both the SQL param and the audit `resourceId`.
- [x] **S2d** — CI grep-guard at `scripts/ci-audit-trail-guard.sh` (wired into `.github/workflows/ci.yml`): fails build if any file under `apps/web/app/api/` has a mutation verb in a SQL template literal but doesn't import `auditedMutation`. Discriminator: backtick prefix (handles multi-line `UPDATE ... \n SET ...`). Negative test passes (a synthetic regression triggers EXIT=1). DB smoke test at `packages/db/scripts/verify-audit-trail.ts` (run via `pnpm --filter @shipops/db db:verify-audit-trail`): 16 checks covering happy path + ROLLBACK on bad SQL + SystemActor rejection — all pass against the real DB.

## S2 Files Touched

- **New:**
  - `packages/db/src/audit.ts` — the helper.
  - `packages/db/scripts/verify-audit-trail.ts` — DB smoke test.
  - `scripts/ci-audit-trail-guard.sh` — CI grep guard.
- **Modified (helpers/infra):**
  - `apps/web/lib/api/auth.ts` — `getRequestContext`, `Actor` type, `DEV_USER_ID`.
  - `packages/db/src/index.ts` — re-exports for `auditedMutation` + types.
  - `packages/db/package.json` — `db:verify-audit-trail` script + `typecheck` script (the latter added externally during the session).
  - `.github/workflows/ci.yml` — added `Audit trail guard` step.
- **Modified (route migrations, 7 files):** `apps/web/app/api/{vessels,ports,port-calls}/route.ts`, `apps/web/app/api/port-calls/[id]/{route,phase/route,sub-status/route}.ts`.

## S2 Final Verification

- `pnpm --filter web exec tsc --noEmit` → clean
- `pnpm --filter web lint` → no warnings/errors
- `bash scripts/ci-tenant-isolation-guard.sh` → ✓ S1 guards still pass (no regression)
- `bash scripts/ci-audit-trail-guard.sh` → ✓ 6 mutation files checked, all import auditedMutation; negative test (synthetic raw mutation) correctly fails with EXIT=1
- `pnpm --filter @shipops/db db:verify-audit-trail` → ✓ all 16 checks pass against real DB (happy path + ROLLBACK on bad SQL + SystemActor rejection)
- `pnpm --filter @shipops/db db:verify-isolation` → ✓ S1 isolation still verified
- **Pre-existing seed.ts typecheck failure** — `seed.ts` lines 504-505 (ActiveSubStatus/SettledSubStatus enum vs string) **FIXED in `56f86f1`** (committed earlier this session as a standalone narrow commit; predated S1, surfaced when S2 first typechecked the db package end-to-end). `pnpm --filter @shipops/db exec tsc --noEmit` now clean.

## Commit Log This Session

- `56f86f1` — `chore(db): type ActiveSubStatus/SettledSubStatus enums in seed + add typecheck script`
- `5bbea3b` — `feat(audit): write audit_logs atomically via auditedMutation helper (S2)` (note: pinned DEV_USER_ID to user-mg-001/MANAGER — superseded by `a891c41` below)
- `a891c41` — `chore(seed): consolidate seed_offices_users.sql into prisma/seed.ts and restore CEO as dev actor` (ported the orphan SQL, archived original, restored user-hq-ceo as dev actor, re-added the dropped db:verify-audit-trail script alias)

Local-only — nothing pushed.

## Open Items (for next session)

- **Production blocker #3** — service adapters throwing "Phase B not implemented" — next major piece. Per CLAUDE.md's ports-and-adapters section, 7+ external dependencies (AIS, email, OCR, AI, file storage, sanctions, port data, PDF) are abstracted behind interfaces in `packages/services/[name]/port.ts`. Each has a mock adapter (returns fixture JSON, runs in dev/demo) and is supposed to have a production adapter calling real APIs. The "Phase B" error means the production adapter throws unconditionally — fine for demo, blocks anything real.
- **Tech debt: `PortCallPhase` enum is numeric-valued** (1–9) while every other enum in `packages/shared/src/enums/index.ts` is string-keyed, and routes + Postgres both use string keys. Forces schemas to hand-list string keys instead of using `z.nativeEnum(PortCallPhase)` (drift hazard if a new phase is added). Spawn-task chip filed during S2.5.
- **created_by/updated_by on rows still write the literal `'system'`.** The audit_logs row is now the source of truth for forensics; row-level attribution columns are a separate cleanup, deliberately out of S2 scope.
- **Multi-write atomicity gap** in `port-calls/route.ts` POST (port_call + cargo_line in separate transactions) is pre-existing and unchanged. Worth fixing whenever a follow-up touches that route.

## Completed Previous Session (S1 — 2026-05-28)

(prior S1 detail preserved below for restore-point continuity)

## S1 Scout Findings (2026-05-28)

## S1 Scout Findings (2026-05-28)

- **No Prisma at runtime.** `packages/db/src/client.ts` exports a `pg.Pool` and `query()`/`queryOne()` helpers. Prisma is type-stub only. Comment: "Direct pg pool — bypasses Prisma's P1010 permission check bug with PG16. Prisma ORM will be re-integrated once production DB is on Azure PostgreSQL."
- **Hardcode is a SQL literal, not a variable.** ~26 occurrences across 12 files. Embedded directly in template strings, e.g. `WHERE pc.tenant_id = 'tenant-gca-001'`. Migration requires rewriting SQL to `WHERE tenant_id = $N` + threading the param.
- **Clerk is bypassed in dev.** `apps/web/middleware.ts:17` — no real key ⇒ `devBypassMiddleware` lets all requests through with no session. Need a dev shim before any session-based code can be tested locally.
- **Files affected** (raw counts): `apps/web/app/api/ports/route.ts` (6), `port-calls/route.ts` (5), `vessels/route.ts` (3), `port-calls/[id]/route.ts` (2), `port-calls/[id]/phase/route.ts` (2), `(dashboard)/port-calls/page.tsx` (2), `port-calls/[id]/sub-status/route.ts` (1), `organizations/route.ts` (1), `offices/route.ts` (1), `(dashboard)/port-calls/[id]/page.tsx` (1), `(dashboard)/port-calls/[id]/layout.tsx` (1). Plus `prisma/seed.ts` (1, legitimate).

## Architecture Decision

**Explicit `tenantQuery(tenantId, sql, params)` helper** chosen over AsyncLocalStorage implicit context.
- **Why:** structural safety. TypeScript enforces tenantId at every call site; AsyncLocalStorage's failure mode is silent (forgotten context = unfiltered query).
- **Pattern:** rename current `query` → `unscopedQuery` (seed/migrations only). New `tenantQuery(tenantId, sql, params)` is the default for app code. Makes the unsafe path grep-able — analogous to Rust's `unsafe {}` block.
- **CI guard:** grep-fail on any new `'tenant-gca-001'` literal in `apps/` outside seed.

## S1 Sub-tasks (all done)

- [x] **S1a** — `getTenantId()` helper at `apps/web/lib/api/auth.ts`. Three modes: dev-without-Clerk → DEV_TENANT_ID; dev-with-Clerk-but-no-orgId → fallback with console.warn (pragmatic dev choice); prod → strict throw on missing orgId. `DEV_TENANT_ID` is the single source of truth for the literal `'tenant-gca-001'`.
- [x] **S1b** — Renamed `query`/`queryOne` → `unscopedQuery`/`unscopedQueryOne` (reserved for seed/migrations). Added `tenantQuery(tenantId, sql, params)` / `tenantQueryOne(tenantId, sql, params)`. TypeScript-enforced at call site.
- [x] **S1c** — Migrated all 12 importer files. Replaced 26 hardcoded literals with $-parameters. Threaded tenantId through shared helper `lib/phase-transitions.ts` (public API now `validatePhaseTransition(tenantId, portCallId, ...)`). Closed cross-tenant leaks in: `phase-transitions.ts` (8 queries with no tenant filter), `(dashboard)/port-calls/[id]/page.tsx` (3 follow-up queries), `(dashboard)/port-calls/page.tsx` (string-interpolated phase filter, now $-param), `api/offices/route.ts` (office_ports query), `api/port-calls/[id]/sub-status/route.ts` (2 UPDATEs with no tenant filter — cross-tenant **write** leak).
- [x] **S1d** — CI grep-guard at `scripts/ci-tenant-isolation-guard.sh` (invoked by `.github/workflows/ci.yml`): fails build if `tenant-gca-001` appears outside `auth.ts` or if `unscopedQuery` is imported from app code. Two-tenant smoke test at `packages/db/scripts/verify-tenant-isolation.ts` (run via `pnpm --filter @shipops/db db:verify-isolation`): creates a sentinel org under a synthetic tenant, verifies real tenant cannot see it and synthetic tenant can. Passed locally against shipops_db.

## S1 Files Touched

- **New:** `apps/web/lib/api/auth.ts`, `scripts/ci-tenant-isolation-guard.sh`, `packages/db/scripts/verify-tenant-isolation.ts`
- **Modified (12 importers):** `apps/web/lib/phase-transitions.ts`, `apps/web/app/api/{offices,organizations,ports,vessels}/route.ts`, `apps/web/app/api/port-calls/route.ts`, `apps/web/app/api/port-calls/[id]/{route,phase/route,sub-status/route}.ts`, `apps/web/app/(dashboard)/port-calls/page.tsx`, `apps/web/app/(dashboard)/port-calls/[id]/{layout,page}.tsx`
- **Modified (infra):** `packages/db/src/{client,index}.ts`, `packages/db/package.json`, `.github/workflows/ci.yml`

## S1 Final Verification

- `pnpm --filter web exec tsc --noEmit` → clean
- `pnpm --filter web lint` → no warnings/errors
- `bash scripts/ci-tenant-isolation-guard.sh` → ✓ guards passed
- `pnpm --filter @shipops/db db:verify-isolation` → ✓ all 4 isolation checks passed against real DB

## Completed Earlier This Session

- Session ritual + S0 commits pushed to `origin/main` (6 commits: `b5a7647`..`fc4d9c2`)
- Scout for S1 — discovered Prisma-vs-pg mismatch in roadmap assumptions
- Decision: explicit `tenantQuery` helper (S1 architecture fork)

## Completed Previous Session (2026-05-28 — S0 restructure)

- **CLAUDE.md change committed standalone** (`b5a7647`) — Directory Map + `_inbox/` intake rules.
- **Dead pre-architecture artifacts removed:**
  - `data_fields_v1_031726` (266 lines) — commit `15cdff7`.
  - `ship-agency-platform.jsx` (524 lines) — commit `ccc4b5f`.
  - `demo`, `demo_1`, `demo_extracted/` (untracked ZIPs + extracts) — pruned, no commit.
- **Completed-task docs archived to `_archive/`** (`4a7561e`): `HANDOFF.md`, `user_convo_shipops.md`.
- **Working docs migrated to Obsidian** (`1113f81`, 18 files, -4828 lines):
  - `FIELD_INVENTORY.md`, `BRAINSTORM_PORT_CALL_UX.md`, `SERVICE_FILE_PATTERN.md` → `~/Documents/Claude/10_Projects/ShipOps/`
  - `agency_docs/`, `market_study/` → same destination.
- **`.gitignore`** updated: `_inbox/`, `market_study/`.
- **Obsidian roadmap promoted** to `~/Documents/Claude/10_Projects/ShipOps/ROADMAP.md`.

## Key Facts

- Canonical repo path: `/Users/wsd/agency_platform`
- Origin/main: at `fc4d9c2` (S0 pushed). Local now equal to origin.
- DB client: **`pg.Pool` direct, not Prisma at runtime** (per client.ts comment, until Azure PG migration).
- DB: `shipops_db` Docker container on port 5433, schema synced, seed includes 11 port calls spanning all 9 phases.
- Dev Clerk bypass: middleware currently passes all requests in dev without a real pk_ key.
- CI: `.github/workflows/ci.yml` runs typecheck + lint + build on push/PR to main.
- Project memory: pointer to roadmap saved at `~/.claude/projects/-Users-wsd-agency-platform/memory/project_shipops_roadmap.md`.
- Three production blockers — S1 (in progress) addresses #1:
  1. Tenant isolation hardcoded — S1 (THIS SESSION)
  2. Zero audit-trail writes — S2
  3. All 7 service adapters throw "Phase B not implemented" — S3+

## Rollback
- Soft (back to pre-S1): `git reset --hard fc4d9c2`
- Restore points in `SESSION_ARCHIVE/`:
  - `restore_point_2026-05-28_s0-complete.md` (pre-S1 baseline)
- Tag preserved: `consolidation-complete-2026-04-17`

## Context / Notes
- Dev server: `pnpm --filter web dev` → port 3000
- Docker DB: `docker compose up -d` from project root → Postgres on 5433
- William chose "Recommended: explicit `tenantQuery` helper" on the S1 architecture fork — codifies the safer-than-implicit-context preference.
