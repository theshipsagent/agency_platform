import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { PHASE_LABELS } from '@shipops/shared'
import type { PortCallPhase } from '@shipops/shared'

const phaseColors: Record<PortCallPhase, string> = {
  1: 'bg-slate-100 text-slate-700 border-slate-200',
  2: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  3: 'bg-blue-50 text-blue-700 border-blue-200',
  4: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  5: 'bg-violet-50 text-violet-700 border-violet-200',
  6: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  7: 'bg-orange-50 text-orange-700 border-orange-200',
  8: 'bg-red-50 text-red-700 border-red-200',
  9: 'bg-green-50 text-green-700 border-green-200',
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
