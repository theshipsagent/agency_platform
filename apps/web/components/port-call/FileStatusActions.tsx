'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

type FileStatus = 'ACTIVE' | 'ON_HOLD' | 'CANCELLED'

const STATUS_STYLES: Record<FileStatus, string> = {
  ACTIVE:    'bg-green-50 text-green-700 border-green-200',
  ON_HOLD:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
}

const STATUS_LABELS: Record<FileStatus, string> = {
  ACTIVE:    'Active',
  ON_HOLD:   'On Hold',
  CANCELLED: 'Cancelled',
}

// Actions available from each status
const TRANSITIONS: Record<FileStatus, { label: string; next: FileStatus }[]> = {
  ACTIVE:    [{ label: 'Hold', next: 'ON_HOLD' }, { label: 'Cancel', next: 'CANCELLED' }],
  ON_HOLD:   [{ label: 'Reactivate', next: 'ACTIVE' }, { label: 'Cancel', next: 'CANCELLED' }],
  CANCELLED: [{ label: 'Reactivate', next: 'ACTIVE' }],
}

export function FileStatusBadge({ status }: { status: string }) {
  const s = (status ?? 'ACTIVE') as FileStatus
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium', STATUS_STYLES[s] ?? STATUS_STYLES.ACTIVE)}>
      {STATUS_LABELS[s] ?? s}
    </span>
  )
}

export function FileStatusActions({ portCallId, currentStatus }: { portCallId: string; currentStatus: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const status = (currentStatus ?? 'ACTIVE') as FileStatus
  const actions = TRANSITIONS[status] ?? []

  async function transition(next: FileStatus) {
    setLoading(true)
    setOpen(false)
    try {
      await fetch(`/api/port-calls/${portCallId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileStatus: next }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (actions.length === 0) return null

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
        title="File actions"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-36 rounded-md border bg-popover shadow-md py-1">
            {actions.map((a) => (
              <button
                key={a.next}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => transition(a.next)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
