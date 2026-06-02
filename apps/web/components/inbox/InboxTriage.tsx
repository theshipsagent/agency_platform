'use client'

// Inbox triage — client component.
//
// Renders the ingested communications with their AI classification, and gives
// the operator two actions:
//   - "Sync inbox": POST /api/inbox/sync (pull + classify new mail), then refresh.
//   - "Link to PC-…": POST /api/inbox/[id]/link with the chosen port call, then
//     refresh. One click when the AI resolved a suggestion; a manual id input
//     otherwise (and as an override — the AI suggestion is advice, not a lock).
//
// State is local useState — a single screen of interactions, no store needed.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, Loader2, Link2, CheckCircle2, Mail, Sparkles, AlertCircle,
} from 'lucide-react'
import type { InboxItem } from '@/lib/inbox'

const DOC_TYPE_LABEL: Record<string, string> = {
  NOR: 'Notice of Readiness', SOF: 'Statement of Facts',
  BILL_OF_LADING: 'Bill of Lading', MANIFEST: 'Manifest', INVOICE: 'Invoice',
  RECEIPT: 'Receipt', SURVEY_REPORT: 'Survey Report', CUSTOMS_ENTRY: 'Customs Entry',
  CHARTER_PARTY: 'Charter Party', CORRESPONDENCE: 'Correspondence', OTHER: 'Other',
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function fmtCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

// The AI returns machine-ish figure keys (primaryAmount, amount2, …). Humanize
// for display without losing the ordering the extractor implied.
function fmtFigureLabel(key: string): string {
  if (key === 'primaryAmount') return 'Amount'
  const m = key.match(/^amount(\d+)$/)
  return m ? `Amount ${m[1]}` : key
}

export function InboxTriage({ items }: { items: InboxItem[] }) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSync() {
    if (syncing) return
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/inbox/sync', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Sync failed (HTTP ${res.status})`)
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {items.length} message{items.length === 1 ? '' : 's'} ·{' '}
          {items.filter((i) => i.status === 'LINKED').length} linked
        </p>
        <button
          onClick={onSync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors disabled:opacity-40"
        >
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {syncing ? 'Syncing…' : 'Sync inbox'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground border rounded-lg p-6 bg-background text-center">
          No messages yet. Click <span className="font-medium">Sync inbox</span> to pull and classify incoming mail.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <InboxCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}

function InboxCard({ item }: { item: InboxItem }) {
  const router = useRouter()
  const [linking, setLinking] = useState(false)
  const [manualId, setManualId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const c = item.classification
  const isLinked = item.status === 'LINKED'
  const related = c?.isPortCallRelated ?? false
  const confidencePct = c?.confidence != null ? Math.round(c.confidence * 100) : null
  const figures = c?.extractedFigures ?? {}

  async function link(portCallId: string) {
    if (linking || !portCallId) return
    setLinking(true)
    setError(null)
    try {
      const res = await fetch(`/api/inbox/${item.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portCallId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Link failed (HTTP ${res.status})`)
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Link failed')
    } finally {
      setLinking(false)
    }
  }

  return (
    <li className="border rounded-lg bg-background overflow-hidden">
      {/* ── Email header ── */}
      <div className="p-4 space-y-1">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-md bg-muted shrink-0">
            <Mail className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm leading-snug">{item.subject}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {item.fromAddr} · {fmtDate(item.receivedAt)}
            </p>
          </div>
          {isLinked && (
            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <CheckCircle2 className="w-3 h-3" /> Linked
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 pl-11">{item.bodyText}</p>
      </div>

      {/* ── AI classification strip ── */}
      <div className="border-t bg-muted/30 px-4 py-3 pl-11 space-y-2">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
            <Sparkles className="w-3 h-3" /> AI
          </span>
          {related ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary font-medium px-2 py-0.5">
              Port-call related
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground font-medium px-2 py-0.5">
              Not port-call related
            </span>
          )}
          {confidencePct != null && (
            <span className="text-muted-foreground tabular-nums">{confidencePct}% confident</span>
          )}
          {c?.suggestedDocumentType && (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-muted-foreground">
              {DOC_TYPE_LABEL[c.suggestedDocumentType] ?? c.suggestedDocumentType}
            </span>
          )}
        </div>

        {c?.summary && <p className="text-xs text-muted-foreground italic">“{c.summary}”</p>}

        {(Object.keys(figures).length > 0 || c?.extractedEta) && (
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            {c?.extractedEta && <span>ETA: {fmtDate(c.extractedEta)}</span>}
            {Object.entries(figures).map(([k, v]) => (
              <span key={k} className="tabular-nums">{fmtFigureLabel(k)}: {fmtCents(v)}</span>
            ))}
          </div>
        )}

        {/* ── Link action ── */}
        {!isLinked && (
          <div className="pt-1">
            {item.suggestedPortCall ? (
              <button
                onClick={() => link(item.suggestedPortCall!.id)}
                disabled={linking}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border bg-background hover:bg-muted transition-colors disabled:opacity-40"
              >
                {linking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                Link to {item.suggestedPortCall.portCallNumber} ({item.suggestedPortCall.vesselName})
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="port call id (e.g. pc-003)"
                  className="text-xs rounded-md border border-input bg-background px-2 py-1 w-48"
                />
                <button
                  onClick={() => link(manualId.trim())}
                  disabled={linking || manualId.trim().length === 0}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border bg-background hover:bg-muted transition-colors disabled:opacity-40"
                >
                  {linking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                  Link
                </button>
              </div>
            )}
            {error && (
              <p className="text-xs text-red-600 mt-1 inline-flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>
        )}

        {isLinked && item.portCallId && (
          <p className="text-xs text-muted-foreground pt-1">Linked to port call <span className="font-medium">{item.portCallId}</span>.</p>
        )}
      </div>
    </li>
  )
}
