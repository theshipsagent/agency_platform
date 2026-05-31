// Pure utility functions — formatting primitives shared across packages.
//
// Money: all amounts in this system are stored as cents (integers).
// Display formatters here handle the conversion to human-readable strings.
// Mutation parsers (displayToCents) handle the reverse for form input.
//
// Dates: thin wrappers around date-fns for consistent project-wide formats.
// formatPortCallId is domain logic for the human-facing port call number.

import { format, formatDistanceToNow, parseISO } from 'date-fns'

// ─── Money ───────────────────────────────────────────────────────────────────

export function centsToDisplay(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function centsToDisplayOrDash(
  cents: number | null | undefined,
  currency = 'USD',
): string {
  if (cents === null || cents === undefined) return '—'
  return centsToDisplay(cents, currency)
}

export function displayToCents(displayValue: string): number {
  const cleaned = displayValue.replace(/[^0-9.-]/g, '')
  return Math.round(parseFloat(cleaned) * 100)
}

export function formatCentsCompact(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`
  return centsToDisplay(cents)
}

// ─── Dates ───────────────────────────────────────────────────────────────────

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy')
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy HH:mm')
}

export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatPortCallId(year: number, sequence: number): string {
  return `PC-${year}-${String(sequence).padStart(4, '0')}`
}
