'use client'

// Inline upload form for a port-call's Documents tab.
//
// File + optional document-type classification, multipart POST to
// /api/port-calls/[id]/documents, then router.refresh() so the server
// component above us re-fetches the document list. No external state
// management — useState is fine for a single-form interaction.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2 } from 'lucide-react'

// Mirror the route's allowlist. Kept in sync by convention — these strings
// also live in the route file; if we add image/heic, both places update.
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_BYTES = 25 * 1024 * 1024

// DocumentType options in roughly the order an agency operator would reach
// for them — most-used first. Kept as a hand-ordered array because alpha
// order would push OTHER to the end (good) but bury NOR (bad).
const DOCUMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'OTHER', label: 'Other / Uncategorized' },
  { value: 'NOR', label: 'Notice of Readiness' },
  { value: 'SOF', label: 'Statement of Facts' },
  { value: 'BILL_OF_LADING', label: 'Bill of Lading' },
  { value: 'MANIFEST', label: 'Manifest' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'SURVEY_REPORT', label: 'Survey Report' },
  { value: 'CUSTOMS_ENTRY', label: 'Customs Entry' },
  { value: 'CREW_LIST', label: 'Crew List' },
  { value: 'STORES_LIST', label: 'Stores List' },
  { value: 'STOWAGE_PLAN', label: 'Stowage Plan' },
  { value: 'MATES_RECEIPT', label: "Mate's Receipt" },
  { value: 'TALLY_SHEET', label: 'Tally Sheet' },
  { value: 'OUTTURN_REPORT', label: 'Outturn Report' },
  { value: 'CHARTER_PARTY', label: 'Charter Party' },
  { value: 'AGENCY_AGREEMENT', label: 'Agency Agreement' },
  { value: 'CORRESPONDENCE', label: 'Correspondence' },
]

interface UploadDocumentFormProps {
  portCallId: string
}

export function UploadDocumentForm({ portCallId }: UploadDocumentFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<string>('OTHER')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const next = e.target.files?.[0] ?? null
    if (!next) {
      setFile(null)
      return
    }
    if (!ALLOWED_MIME.includes(next.type)) {
      setError(
        `Unsupported file type: ${next.type || '(unknown)'}. Allowed: PDF, JPEG, PNG.`
      )
      setFile(null)
      e.target.value = ''
      return
    }
    if (next.size > MAX_BYTES) {
      setError(
        `File too large: ${(next.size / 1024 / 1024).toFixed(1)} MB (max 25 MB).`
      )
      setFile(null)
      e.target.value = ''
      return
    }
    setFile(next)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || uploading) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('documentType', documentType)
      const res = await fetch(`/api/port-calls/${portCallId}/documents`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Upload failed (HTTP ${res.status})`)
        return
      }
      // Success — reset the form + ask the server component to re-render
      // with the now-current document list.
      setFile(null)
      setDocumentType('OTHER')
      if (fileInputRef.current) fileInputRef.current.value = ''
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border rounded-lg p-4 bg-background space-y-3"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="upload-file" className="text-sm font-medium">
          File
        </label>
        <input
          ref={fileInputRef}
          id="upload-file"
          type="file"
          accept={ALLOWED_MIME.join(',')}
          onChange={onFileChange}
          disabled={uploading}
          className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-muted file:text-foreground file:hover:bg-muted/80 file:cursor-pointer cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          PDF, JPEG, or PNG. Max 25 MB.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="upload-type" className="text-sm font-medium">
          Document type
        </label>
        <select
          id="upload-type"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          disabled={uploading}
          className="text-sm rounded-md border border-input bg-background px-2.5 py-1.5 max-w-xs"
        >
          {DOCUMENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Pick the closest match — you can change it later.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={!file || uploading}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? 'Uploading…' : 'Upload document'}
        </button>
        {file && !uploading && (
          <span className="text-xs text-muted-foreground truncate max-w-[16rem]">
            {file.name} ({(file.size / 1024).toFixed(0)} KB)
          </span>
        )}
      </div>
    </form>
  )
}
