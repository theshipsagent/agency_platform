import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { PHASE_LABELS } from '@shipops/shared'
import type { PortCallPhase } from '@shipops/shared'

const phaseColors: Record<PortCallPhase, string> = {
  PROFORMA_ESTIMATED: 'bg-slate-100 text-slate-700 border-slate-200',
  AWAITING_APPOINTMENT: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  APPOINTED: 'bg-blue-50 text-blue-700 border-blue-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SAILED: 'bg-violet-50 text-violet-700 border-violet-200',
  COMPLETED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PROCESSING_FDA: 'bg-orange-50 text-orange-700 border-orange-200',
  AWAITING_PAYMENT: 'bg-red-50 text-red-700 border-red-200',
  SETTLED: 'bg-green-50 text-green-700 border-green-200',
}

interface PhaseBadgeProps {
  phase: PortCallPhase
  subStatus?: string | null
  size?: 'sm' | 'md'
}

export function PhaseBadge({ phase, subStatus, size = 'md' }: PhaseBadgeProps) {
  return (
    <span className="inline-flex flex-col gap-0.5">
      <Badge
        variant="outline"
        className={cn(
          phaseColors[phase],
          size === 'sm' && 'text-[10px] px-1.5 py-0',
          'font-medium whitespace-nowrap'
        )}
      >
        {PHASE_LABELS[phase]}
      </Badge>
      {subStatus && (
        <span className="text-[10px] text-muted-foreground pl-0.5">{subStatus.replace(/_/g, ' ')}</span>
      )}
    </span>
  )
}
