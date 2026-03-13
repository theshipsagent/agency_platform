// All amounts are stored as cents (integers). These helpers handle display only.

export function centsToDisplay(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
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
