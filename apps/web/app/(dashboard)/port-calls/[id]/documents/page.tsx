// Port-call documents tab.
//
// First real content: a "Generate FDA" download card that hits
// /api/port-calls/[id]/fda. This is the user-facing edge of the first
// vertical slice exercising the @shipops/services PDF port end-to-end.
//
// Held to a minimum on purpose — when more generated documents land (SOF,
// proforma DA, invoice packets), this becomes a grid of cards and grows
// upload/version-history sections. Premature abstraction until then.

import Link from 'next/link'
import { Download, FileText } from 'lucide-react'

export default function PortCallDocumentsPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate and download documents for this port call. Uploaded
          documents (NORs, B/Ls, invoices) land here too once the upload
          pipeline ships.
        </p>
      </header>

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
            // Native browser download — the route sets
            // Content-Disposition: attachment with a per-port-call filename.
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download FDA
          </Link>
        </div>
      </section>
    </div>
  )
}
