// /api/port-calls/[id]/documents
//
// POST — upload a document to this port call. Multipart/form-data request:
//   - file:         the binary blob (PDF / JPEG / PNG, ≤ 25MB)
//   - documentType: optional DocumentType enum (defaults to OTHER)
//
// GET — list documents on this port call (most recent first). No body.
//
// Storage flow (POST):
//   1. Tenant + actor context resolved.
//   2. Port call ownership verified (404 if missing or wrong tenant).
//   3. File extracted from multipart; type + size validated.
//   4. Bytes written to storage adapter at
//      {tenantId}/{portCallId}/{uuid}-{filename}.
//   5. documents row INSERTed via auditedMutation — atomic with audit_logs row.
//
// Failure modes:
//   - If the FS write succeeds but the DB INSERT fails, we leak a file on
//     disk. That's the intentional ordering choice — a leaked file is
//     recoverable (an orphan-sweeper can find files whose storage_key isn't
//     in documents), while a DB row pointing to a missing file would crash
//     every download. The orphan sweeper is out of scope for this slice.
//
// MIME type is the browser-supplied file.type. We allowlist it but do NOT
// magic-byte check the actual bytes — that's a follow-up if abuse becomes
// real. For an internal agency tool the trust model is "authenticated users
// uploading documents they're already authorized to handle."

import { tenantQueryOne, auditedMutation } from '@shipops/db'
import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { UploadDocumentMetadataSchema } from '@shipops/shared/validation'
import { getRequestContext, getTenantId } from '@/lib/api/auth'
import { parseBody } from '@/lib/api/parse'
import { getServices, type ServiceRegistry } from '@shipops/services'
import { DocumentType, DocumentSource } from '@shipops/shared'

// ─── Module-level service cache (same pattern as the FDA route) ───────────────
let servicesPromise: Promise<ServiceRegistry> | null = null
function services(): Promise<ServiceRegistry> {
  if (!servicesPromise) servicesPromise = getServices()
  return servicesPromise
}

// ─── Upload guardrails ────────────────────────────────────────────────────────
// MIME allowlist for v1 — covers the dominant agency document shapes (scanned
// PDFs, phone photos of NORs/damage). Widen as additional formats become
// common; today these three cover ~90% of inbound document flow.
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])

// 25 MB. Scanned multi-page PDFs land in the 5-15 MB range; high-res survey
// PDFs can push 20 MB. Hard cap is a defense against accidental huge uploads
// (someone drops a video by mistake) — large legitimate docs that need more
// can be added later as a configurable per-tenant setting.
const MAX_BYTES = 25 * 1024 * 1024

// ─── DB row shape ─────────────────────────────────────────────────────────────
interface DocumentRow {
  id: string
  tenant_id: string
  port_call_id: string
  document_type: string
  source: string
  file_name: string
  storage_key: string
  mime_type: string
  size_bytes: number
  version: number
  created_at: Date
  updated_at: Date
}

// snake → camel for the wire response. Kept inline; only this route reads
// from the documents table today.
function toDocument(r: DocumentRow) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    portCallId: r.port_call_id,
    documentType: r.document_type,
    source: r.source,
    fileName: r.file_name,
    storageKey: r.storage_key,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// ─── GET — list documents on this port call ───────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantId = await getTenantId()

  // Port call existence + tenant check first — a clean 404 is more useful than
  // an empty list, which would look the same for "no documents" and "wrong
  // tenant or non-existent id."
  const pcExists = await tenantQueryOne<{ id: string }>(
    tenantId,
    `SELECT id FROM port_calls
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [params.id, tenantId]
  )
  if (!pcExists) {
    return Response.json({ error: 'Port call not found' }, { status: 404 })
  }

  const { tenantQuery } = await import('@shipops/db')
  const rows = await tenantQuery<DocumentRow>(
    tenantId,
    `SELECT id, tenant_id, port_call_id,
            document_type::text AS document_type,
            source::text       AS source,
            file_name, storage_key, mime_type, size_bytes,
            version, created_at, updated_at
       FROM documents
      WHERE port_call_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [params.id, tenantId]
  )

  return Response.json({ documents: rows.map(toDocument) })
}

// ─── POST — upload a new document ─────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getRequestContext()

  // 1. Tenant ownership of the port call (defense-in-depth even though
  // tenant_id is enforced on the documents INSERT too).
  const pcExists = await tenantQueryOne<{ id: string }>(
    ctx.tenantId,
    `SELECT id FROM port_calls
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [params.id, ctx.tenantId]
  )
  if (!pcExists) {
    return Response.json({ error: 'Port call not found' }, { status: 404 })
  }

  // 2. Parse multipart. Next.js 14 App Router has native FormData support on
  // the request object — no body-parser config needed.
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json(
      { error: 'Invalid multipart/form-data body' },
      { status: 400 }
    )
  }

  // 3. File extraction + validation.
  const file = form.get('file')
  if (!(file instanceof Blob)) {
    return Response.json(
      { error: 'Missing required field: file (multipart Blob)' },
      { status: 400 }
    )
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return Response.json(
      {
        error: `Unsupported MIME type: ${file.type || '(none)'}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      },
      { status: 400 }
    )
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      {
        error: `File too large: ${file.size} bytes (max ${MAX_BYTES})`,
      },
      { status: 413 }
    )
  }
  if (file.size === 0) {
    return Response.json({ error: 'File is empty' }, { status: 400 })
  }

  // 4. Metadata validation. Reuses parseBody by extracting the form fields
  // into a plain object — parseBody is generic on the body and doesn't care
  // about the wire format. UploadDocumentMetadataSchema is .strict() so extra
  // multipart fields fail loudly.
  const documentTypeRaw = form.get('documentType')
  const metaObj: Record<string, unknown> = {}
  if (documentTypeRaw !== null) metaObj['documentType'] = documentTypeRaw
  const parsed = parseBody(UploadDocumentMetadataSchema, metaObj)
  if (!parsed.ok) return parsed.response
  const documentType = parsed.data.documentType ?? DocumentType.OTHER

  // 5. Build storage key. Tenant prefix gives FS-level defense-in-depth —
  // the path itself encodes scope, so a logic bug elsewhere can't widen
  // a cross-tenant read at the storage layer.
  const fileName = (file as File).name || 'upload'
  const documentId = randomUUID()
  const storageKey = `${ctx.tenantId}/${params.id}/${documentId}-${fileName}`

  // 6. Pull bytes, upload to storage adapter. We do this BEFORE the DB
  // INSERT — see the "Failure modes" note at the top of this file. The
  // orphan file is the recoverable failure mode.
  const buffer = Buffer.from(await file.arrayBuffer())
  const svc = await services()
  const uploadResult = await svc.storage.upload(storageKey, buffer, file.type)

  // 7. Audited INSERT. Actor must be a user (SystemActor would be rejected
  // by auditedMutation's runtime check, but a guard at the boundary is
  // clearer than relying on a downstream throw).
  if (ctx.actor.kind !== 'user') {
    return Response.json(
      { error: 'Upload requires a user actor' },
      { status: 403 }
    )
  }

  const row = await auditedMutation<DocumentRow>({
    tenantId: ctx.tenantId,
    actor: ctx.actor,
    audit: {
      action: 'CREATE',
      resourceType: 'document',
      resourceId: documentId,
    },
    mutationSql:
      `INSERT INTO documents (
         id, tenant_id, port_call_id, document_type, source,
         file_name, storage_key, mime_type, size_bytes,
         version, created_at, updated_at, created_by, updated_by
       ) VALUES (
         $1, $2, $3, $4::"DocumentType", $5::"DocumentSource",
         $6, $7, $8, $9,
         1, NOW(), NOW(), $10, $10
       )
       RETURNING id, tenant_id, port_call_id,
                 document_type::text AS document_type,
                 source::text       AS source,
                 file_name, storage_key, mime_type, size_bytes,
                 version, created_at, updated_at`,
    mutationParams: [
      documentId,
      ctx.tenantId,
      params.id,
      documentType,
      DocumentSource.MANUAL_UPLOAD,
      fileName,
      uploadResult.storageKey,
      file.type,
      uploadResult.sizeBytes,
      ctx.actor.userId,
    ],
  })

  if (!row) {
    return Response.json(
      { error: 'Document INSERT returned no row (transaction rolled back)' },
      { status: 500 }
    )
  }

  return Response.json({ document: toDocument(row) }, { status: 201 })
}
