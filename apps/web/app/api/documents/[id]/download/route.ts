// GET /api/documents/[id]/download
//
// Streams a previously-uploaded document back to the browser. Tenant-scoped:
// a tenant cannot fetch another tenant's documents even with a guessed id.
//
// Why this lives under /documents and not /port-calls/[pcid]/documents/[id]:
// a document id is already globally unique. The documents row owns the
// port_call_id, so we don't need it in the URL — and a shorter URL keeps
// the markup (and any future link sharing) simpler.

import { tenantQueryOne } from '@shipops/db'
import { NextRequest } from 'next/server'
import { getTenantId } from '@/lib/api/auth'
import { getServices, type ServiceRegistry } from '@shipops/services'

let servicesPromise: Promise<ServiceRegistry> | null = null
function services(): Promise<ServiceRegistry> {
  if (!servicesPromise) servicesPromise = getServices()
  return servicesPromise
}

interface DocumentMetaRow {
  storage_key: string
  file_name: string
  mime_type: string
  size_bytes: number
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const tenantId = await getTenantId()

  const meta = await tenantQueryOne<DocumentMetaRow>(
    tenantId,
    `SELECT storage_key, file_name, mime_type, size_bytes
       FROM documents
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [params.id, tenantId]
  )
  if (!meta) {
    return Response.json({ error: 'Document not found' }, { status: 404 })
  }

  // Pull bytes through the storage port — adapter-agnostic. Local-fs reads
  // from disk; a future S3 adapter would call GetObject. Route stays the same.
  const svc = await services()
  const bytes = await svc.storage.download(meta.storage_key)

  // Defense-in-depth: if disk + DB drift, the size of the file we read should
  // match documents.size_bytes. This guards against corrupted/truncated reads
  // (and a 500 here is more honest than streaming half a file).
  if (bytes.byteLength !== meta.size_bytes) {
    return Response.json(
      {
        error: `File size mismatch — DB says ${meta.size_bytes}, disk has ${bytes.byteLength}. Possible corruption.`,
      },
      { status: 500 }
    )
  }

  // RFC 5987 encoding for non-ASCII filenames. Quoted filename is the ASCII
  // fallback; filename*= is the percent-encoded UTF-8 the modern browser
  // actually reads.
  const asciiFallback = meta.file_name.replace(/[^\x20-\x7E]/g, '_')
  const encodedName = encodeURIComponent(meta.file_name)

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': meta.mime_type,
      'Content-Length': bytes.byteLength.toString(),
      'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`,
      'Cache-Control': 'no-store',
    },
  })
}
