import Link from 'next/link'
import { Ship } from 'lucide-react'
import { query } from '@shipops/db'
import { PHASE_LABELS, PortCallPhase } from '@shipops/shared'
import { Badge } from '@/components/ui/badge'
import { PhaseBadge } from '@/components/shared/PhaseBadge'
import { FileStatusBadge, FileStatusActions } from '@/components/port-call/FileStatusActions'
import { NewPortCallModal } from '@/components/port-call/NewPortCallModal'
import { formatDate } from '@/lib/utils/dates'

const PHASE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as PortCallPhase[]

const phaseEnumToNumber: Record<string, PortCallPhase> = {
  PROFORMA_ESTIMATED: 1, AWAITING_APPOINTMENT: 2, APPOINTED: 3,
  ACTIVE: 4, SAILED: 5, COMPLETED: 6, PROCESSING_FDA: 7,
  AWAITING_PAYMENT: 8, SETTLED: 9,
}

const phaseNumberToEnum: Record<number, string> = {
  1: 'PROFORMA_ESTIMATED', 2: 'AWAITING_APPOINTMENT', 3: 'APPOINTED',
  4: 'ACTIVE', 5: 'SAILED', 6: 'COMPLETED', 7: 'PROCESSING_FDA',
  8: 'AWAITING_PAYMENT', 9: 'SETTLED',
}

interface PortCallRow {
  id: string
  port_call_number: string
  phase: string
  file_status: string
  active_sub_status: string | null
  settled_sub_status: string | null
  port_call_type: string
  eta: Date | null
  arrived_at: Date | null
  vessel_name: string
  flag_state: string
  dwt: number | null
  vessel_type: string
  principal_name: string
  port_name: string
  terminal_name: string | null
  office_code: string | null
  open_tasks: number
  open_expenses: number
}

interface PhaseCount { phase: string; count: string }

interface PageProps {
  searchParams: { phase?: string }
}

export default async function PortCallsPage({ searchParams }: PageProps) {
  const phaseFilter = searchParams.phase ? parseInt(searchParams.phase) : undefined
  const phaseEnumFilter = phaseFilter ? phaseNumberToEnum[phaseFilter] : undefined

  const whereClause = phaseEnumFilter
    ? `AND pc.phase = '${phaseEnumFilter}'`
    : ''

  const portCalls = await query<PortCallRow>(`
    SELECT
      pc.id,
      pc.port_call_number,
      pc.phase,
      pc.file_status,
      pc.active_sub_status,
      pc.settled_sub_status,
      pc.port_call_type,
      pc.eta,
      pc.arrived_at,
      v.name AS vessel_name,
      v.flag_state,
      v.dwt,
      v.vessel_type,
      o.name AS principal_name,
      p.name AS port_name,
      t.name AS terminal_name,
      of.code AS office_code,
      (SELECT COUNT(*) FROM tasks tk WHERE tk.port_call_id = pc.id AND tk.status != 'DONE' AND tk.deleted_at IS NULL)::int AS open_tasks,
      (SELECT COUNT(*) FROM expenses ex WHERE ex.port_call_id = pc.id AND ex.status = 'ESTIMATED' AND ex.deleted_at IS NULL)::int AS open_expenses
    FROM port_calls pc
    JOIN vessels v ON v.id = pc.vessel_id
    JOIN organizations o ON o.id = pc.principal_id
    JOIN ports p ON p.id = pc.port_id
    LEFT JOIN terminals t ON t.id = pc.terminal_id
    LEFT JOIN offices of ON of.id = pc.office_id
    WHERE pc.deleted_at IS NULL
      AND pc.tenant_id = 'tenant-gca-001'
      ${whereClause}
    ORDER BY
      CASE pc.file_status WHEN 'ACTIVE' THEN 0 WHEN 'ON_HOLD' THEN 1 WHEN 'CANCELLED' THEN 2 END ASC,
      CASE pc.phase
        WHEN 'PROFORMA_ESTIMATED' THEN 1
        WHEN 'AWAITING_APPOINTMENT' THEN 2
        WHEN 'APPOINTED' THEN 3
        WHEN 'ACTIVE' THEN 4
        WHEN 'SAILED' THEN 5
        WHEN 'COMPLETED' THEN 6
        WHEN 'PROCESSING_FDA' THEN 7
        WHEN 'AWAITING_PAYMENT' THEN 8
        WHEN 'SETTLED' THEN 9
      END ASC,
      pc.eta ASC NULLS LAST
  `)

  const phaseCounts = await query<PhaseCount>(`
    SELECT phase, COUNT(*)::text AS count
    FROM port_calls
    WHERE deleted_at IS NULL AND tenant_id = 'tenant-gca-001'
    GROUP BY phase
  `)

  const countByPhase = Object.fromEntries(
    phaseCounts.map((r) => [r.phase, parseInt(r.count)])
  )
  const totalCount = Object.values(countByPhase).reduce((a, b) => a + b, 0)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Port Calls</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {phaseFilter
              ? `${portCalls.length} in ${PHASE_LABELS[phaseFilter as PortCallPhase]}`
              : `${totalCount} total`}
          </p>
        </div>
        <NewPortCallModal />
      </div>

      {/* Phase filter chips */}
      <div className="flex flex-wrap gap-2">
        <Link href="/port-calls">
          <Badge
            variant={!phaseFilter ? 'default' : 'outline'}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            All ({totalCount})
          </Badge>
        </Link>
        {PHASE_NUMBERS.map((phase) => {
          const enumKey = phaseNumberToEnum[phase]!
          const count = countByPhase[enumKey] ?? 0
          if (count === 0) return null
          return (
            <Link key={phase} href={`/port-calls?phase=${phase}`}>
              <Badge
                variant={phaseFilter === phase ? 'default' : 'outline'}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                {PHASE_LABELS[phase as PortCallPhase]} ({count})
              </Badge>
            </Link>
          )
        })}
      </div>

      {/* Table */}
      {portCalls.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-lg">
          <Ship className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No port calls in this phase</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">File No.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vessel</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Principal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Port · Terminal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">ETA / Arrived</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phase</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Open</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {portCalls.map((pc) => {
                const phaseNum = phaseEnumToNumber[pc.phase] as PortCallPhase
                return (
                  <tr key={pc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/port-calls/${pc.id}`}
                        className="font-mono text-xs font-semibold text-primary hover:underline"
                      >
                        {pc.port_call_number}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5 capitalize flex items-center gap-1.5">
                        {pc.office_code && <span className="font-medium text-foreground">{pc.office_code}</span>}
                        <span>{pc.port_call_type.replace(/_/g, ' ').toLowerCase()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{pc.vessel_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {pc.flag_state} · {pc.dwt ? `${Math.round(pc.dwt / 1000)}K DWT` : pc.vessel_type}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{pc.principal_name}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{pc.port_name}</div>
                      {pc.terminal_name && (
                        <div className="text-xs text-muted-foreground">{pc.terminal_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {pc.arrived_at ? (
                        <span className="text-foreground font-medium">{formatDate(pc.arrived_at)}</span>
                      ) : pc.eta ? (
                        <span>ETA {formatDate(pc.eta)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <PhaseBadge
                        phase={phaseNum}
                        subStatus={pc.active_sub_status ?? pc.settled_sub_status}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <FileStatusBadge status={pc.file_status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {pc.open_tasks > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-600 border-orange-200 bg-orange-50">
                            {pc.open_tasks} tasks
                          </Badge>
                        )}
                        {pc.open_expenses > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 border-blue-200 bg-blue-50">
                            {pc.open_expenses} exp
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <FileStatusActions portCallId={pc.id} currentStatus={pc.file_status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
