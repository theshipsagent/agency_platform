import { Ship, MapPin, Building2, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PhaseBadge } from '@/components/shared/PhaseBadge'
import { FileStatusBadge } from '@/components/port-call/FileStatusActions'

const phaseEnumToNumber: Record<string, number> = {
  PROFORMA_ESTIMATED: 1, AWAITING_APPOINTMENT: 2, APPOINTED: 3,
  ACTIVE: 4, SAILED: 5, COMPLETED: 6, PROCESSING_FDA: 7,
  AWAITING_PAYMENT: 8, SETTLED: 9,
}

interface PortCallHeaderProps {
  portCall: {
    id: string
    port_call_number: string
    phase: string
    active_sub_status: string | null
    settled_sub_status: string | null
    file_status: string
    port_call_type: string
    is_locked: boolean
    vessel_name: string
    flag_state: string
    dwt: number | null
    principal_name: string
    port_name: string
    terminal_name: string | null
    office_code: string | null
  }
}

export function PortCallHeader({ portCall: pc }: PortCallHeaderProps) {
  const phaseNum = phaseEnumToNumber[pc.phase] ?? 1

  return (
    <div className="border-b bg-background px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left: File info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold font-mono tracking-tight">
              {pc.port_call_number}
            </h1>
            <PhaseBadge
              phase={phaseNum as any}
              subStatus={pc.active_sub_status ?? pc.settled_sub_status}
              size="sm"
            />
            <FileStatusBadge status={pc.file_status} />
            {pc.is_locked && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-200 bg-amber-50 gap-1">
                <Lock className="w-2.5 h-2.5" />
                Locked
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Ship className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground">{pc.vessel_name}</span>
              <span>{pc.flag_state}{pc.dwt ? ` · ${Math.round(pc.dwt / 1000)}K DWT` : ''}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{pc.port_name}</span>
              {pc.terminal_name && <span className="text-muted-foreground/60">· {pc.terminal_name}</span>}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>{pc.principal_name}</span>
            </span>
          </div>
        </div>

        {/* Right: Type + Office */}
        <div className="text-right text-sm shrink-0">
          <div className="capitalize font-medium">
            {pc.port_call_type.replace(/_/g, ' ').toLowerCase()}
          </div>
          {pc.office_code && (
            <div className="text-xs text-muted-foreground mt-0.5">Office: {pc.office_code}</div>
          )}
        </div>
      </div>
    </div>
  )
}
