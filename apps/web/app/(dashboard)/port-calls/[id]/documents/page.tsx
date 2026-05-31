// Port-call Documents tab — Server Component.
//
// Renders three sections:
//   - Generated   — system-rendered documents (today: FDA download)
//   - Upload      — multipart form posting to POST /api/port-calls/[id]/documents
//   - Uploaded    — list of documents stored on this port call, newest first
//
// We fetch the document list server-side so first render is one round trip,
// then re-renders are driven by router.refresh() inside UploadDocumentForm.

import Link from 'next/link'
import { Download, FileText, Paperclip } from 'lucide-react'
import { tenantQuery } from '@shipops/db'
import { getTenantId } from '@/lib/api/auth'
import { UploadDocumentForm } from '@/components/port-call/UploadDocumentForm'

interface DocumentRow {
  id: string
  document_type: string
  source: string
  file_name: string
  mime_type: string
  size_bytes: number
  version: number
  created_at: Date
}

// Friendly labels for the wire enum values — kept in step with the upload
// form's options array. Duplicated by design (no shared module yet) because
// the form needs them as a `<select>` source while this page needs them as
// a lookup map; merging into one helper file is a small follow-up if the
// list grows.
const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  OTHER: 'Other',
  NOR: 'Notice of Readiness',
  SOF: 'Statement of Facts',
  BILL_OF_LADING: 'Bill of Lading',
  MANIFEST: 'Manifest',
  INVOICE: 'Invoice',
  RECEIPT: 'Receipt',
  SURVEY_REPORT: 'Survey Report',
  CUSTOMS_ENTRY: 'Customs Entry',
  CREW_LIST: 'Crew List',
  STORES_LIST: 'Stores List',
  STOWAGE_PLAN: 'Stowage Plan',
  MATES_RECEIPT: "Mate's Receipt",
  TALLY_SHEET: 'Tally Sheet',
  OUTTURN_REPORT: 'Outturn Report',
  CHARTER_PARTY: 'Charter Party',
  AGENCY_AGREEMENT: 'Agency Agreement',
  CORRESPONDENCE: 'Correspondence',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function PortCallDocumentsPage({
  params,
}: {
  params: { id: string }
}) {
  const tenantId = await getTenantId()

  // List of uploaded documents on this port call. SYSTEM_GENERATED-source rows
  // are excluded — those are surfaced in the Generated section by name (just
  // the FDA today). If we later persist generated documents to storage too,
  // this filter is what we'd flip to a UNION.
  const documents = await tenantQuery<DocumentRow>(
    tenantId,
    `SELECT id,
            document_type::text AS document_type,
            source::text       AS source,
            file_name, mime_type, size_bytes, version, created_at
       FROM documents
      WHERE port_call_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        AND source <> 'SYSTEM_GENERATED'
      ORDER BY created_at DESC`,
    [params.id, tenantId]
  )

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate and download documents for this port call. Upload NORs,
          B/Ls, invoices, and other documents the agency receives.
        </p>
      </header>

      {/* ── Generated ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Generated
        </h2>

        <div className="border rounded-lg p-4 flex items-start justify-between gap-4 bg-background">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-2 rounded-md bg-muted">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Final Disbursement Account</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                Renders a PDF summarizing vessel + principal + all expense
                lines with proforma vs actual totals and short-funding
                highlight. Layout is a working placeholder pending real
                template input.
              </p>
            </div>
          </div>
          <Link
            href={`/api/port-calls/${params.id}/fda`}
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download FDA
          </Link>
        </div>
      </section>

      {/* ── Upload ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Upload
        </h2>
        <UploadDocumentForm portCallId={params.id} />
      </section>

      {/* ── Uploaded list ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Uploaded ({documents.length})
        </h2>

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-lg p-4 bg-background">
            No documents uploaded yet. Upload one above and it will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="border rounded-lg p-3 flex items-start justify-between gap-4 bg-background"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 p-2 rounded-md bg-muted shrink-0">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {DOCUMENT_TYPE_LABEL[doc.document_type] ?? doc.document_type}
                      {' · '}
                      {formatSize(doc.size_bytes)}
                      {' · '}
                      {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/api/documents/${doc.id}/download`}
                  className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
