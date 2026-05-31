# Restore point — 2026-05-31 — S3 Slice #2 shipped

## What landed

Document upload + download end-to-end via the `@shipops/services` storage
port. Live-verified against pc-005 (real seed data) on `http://localhost:3000`:

- `POST /api/port-calls/pc-005/documents` (multipart, 2.9 KB PDF + NOR
  classification) → **HTTP 201**, valid documents row returned.
- `GET /api/port-calls/pc-005/documents` → returns the newly-uploaded doc
  with all metadata.
- `GET /api/documents/{id}/download` → **HTTP 200**, `application/pdf`,
  2,943 bytes, **SHA-256 byte-identical** to source (`6827c17a…`).
- `audit_logs` row written: `action=CREATE`, `resource_type=document`,
  `user_id=user-hq-ceo`, `tenant_id=tenant-gca-001`, `after.document_type=NOR`.

## Three architectural calls + one schema fix

1. **Polymorphic audit_logs FK dropped.** Discovered live: every audited
   mutation for a non-`port_call` resource (vessel, port, cargo_line,
   document, expense) was silently broken by the `audit_log_port_call` FK
   constraint that required `resource_id` to exist in `port_calls`. S2's
   smoke test only ever exercised port_call so it never tripped. Dropped
   the FK on the live DB + removed the Prisma relation; audit_logs.resource_id
   is now a polymorphic soft pointer as the `resource_type` column always
   implied. Extended `verify-audit-trail.ts` with Test 4 (a vessel UPDATE)
   so this regression can't slip past CI again.

2. **Local-fs adapter path resolution walks up to the monorepo root.**
   Initial implementation used `resolve('apps/web/.uploads')` which
   depended on cwd — `next dev` runs from `apps/web/` so it landed at
   `apps/web/apps/web/.uploads/`. Fixed by walking up from cwd looking
   for `pnpm-workspace.yaml` and anchoring `.uploads/` under that. Stable
   across dev server, smoke tests, db scripts.

3. **Storage port extended with `download(key): Promise<Buffer>`.**
   `getSignedUrl` is designed for the S3-style "presigned URL → browser
   fetches direct" pattern. Local-fs can't presign (file:// URLs don't
   work from a web page), so the download route needs an adapter-agnostic
   "give me the bytes server-side" call. Both adapters will eventually
   implement both; the route polymorphically uses `download` for the
   read path, and `getSignedUrl` is reserved for direct-browser-fetch
   uses (thumbnails, public links) when S3 is wired.

4. **File written BEFORE the DB row, not transactional.** If FS write
   succeeds but the audited INSERT rolls back, we leak a file on disk
   (recoverable via an orphan-sweeper script). The inverse — DB row with
   no file on disk — would crash every download. Documented in the route
   header. Orphan sweeper is out of scope for this slice.

## Verification (all green)

- `pnpm --filter web exec tsc --noEmit` — clean
- `pnpm --filter @shipops/services typecheck` — clean
- `pnpm --filter @shipops/shared exec tsc --noEmit` — clean
- `pnpm --filter @shipops/db exec tsc --noEmit` — clean
- `pnpm --filter web lint` — clean
- `bash scripts/ci-tenant-isolation-guard.sh` — ✓
- `bash scripts/ci-audit-trail-guard.sh` — ✓ (7 mutation files; new documents route caught)
- `bash scripts/ci-input-validation-guard.sh` — ✓
- `pnpm --filter @shipops/services smoke-storage` — ✓ 7/7 (round-trip, idempotent delete, path-traversal rejection)
- `pnpm --filter @shipops/services smoke-pdf` — ✓ 2/2
- `pnpm --filter @shipops/shared verify-input-validation` — ✓ 18/18
- `pnpm --filter @shipops/db db:verify-isolation` — ✓ 5/5
- `pnpm --filter @shipops/db db:verify-audit-trail` — ✓ **22/22** (up from 16; +6 for the polymorphic-resource Test 4)
- Live route tests: POST 201, GET list, GET download (SHA-256 identity), audit_logs row present

## Findings parked for follow-up

- **Orphan doc row pc-005:b6b67e11…** — created during the cwd-bug
  reproduction; its `storage_key` resolves under the post-fix root where
  no file exists. Soft-delete with `UPDATE documents SET deleted_at = NOW()
  WHERE id = 'b6b67e11-ab15-49b7-82ca-4d5a9371569d'` if it bothers anyone;
  the misplaced files on disk are at
  `apps/web/apps/web/.uploads/tenant-gca-001/pc-005/` (gitignored via the
  new `**/.uploads/` rule).
- **Prisma schema vs live DB drift continues.** `organizations.credit_score`
  removed from live DB but Prisma + shared type still reference it. Wider
  audit needed.
- **Seed data agency-fee double-count** in FDA PDF totals.
- **No SOF download button yet** (adapter renders it; UI not wired).
- **MIME magic-byte validation deferred.** Today we trust the browser-supplied
  file.type. Add real magic-byte sniffing when abuse becomes plausible.
- **Orphan-file sweeper script** — write one when the documents table grows
  past ~100 rows, OR when we ship to production with a real S3 adapter.

## Next slice candidates

With Storage shipped, the remaining adapter rollout reads:

1. **Email + AI — incoming email triage** — bigger lift but the marquee
   demo. Two mock adapters in one slice. Documents from emails would land
   in storage (which exists now).
2. **Sanctions** — small (single `checkEntity`/`checkVessel`), gates real
   vendor-approval risk. Needs a vendor-approval UI to hook into.
3. **AIS vessel-position widget** — dashboard demo. Mock returns canned
   positions; real providers cost money.
4. **OCR** — defer until invoice automation becomes top priority.

## Rollback

- Soft: `git reset --hard <commit-before-slice-2>` (find via `git log`).
- The audit_logs FK drop is a live-DB change that survives the git rollback —
  to restore it, run:
  ```sql
  ALTER TABLE audit_logs
    ADD CONSTRAINT audit_log_port_call
    FOREIGN KEY (resource_id) REFERENCES port_calls(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;
  ```
  (Don't actually do this — it was wrong; documented for completeness.)
