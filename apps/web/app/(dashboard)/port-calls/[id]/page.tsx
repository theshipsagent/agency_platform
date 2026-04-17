import { queryOne, query } from '@shipops/db'
import { notFound } from 'next/navigation'
import {
  Ship, MapPin, Building2, Clock, Calendar,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PhaseControls } from '@/components/port-call/PhaseControls'
import { SubStatusControls } from '@/components/port-call/SubStatusControls'
import { formatDate, formatDateTime } from '@/lib/utils/dates'

const PHASE_DISPLAY: Record<string, string> = {
  PROFORMA_ESTIMATED: 'Proforma Estimated',
  AWAITING_APPOINTMENT: 'Awaiting Appointment',
  APPOINTED: 'Appointed',
  ACTIVE: 'Active Port Call',
  SAILED: 'Sailed Port Call',
  COMPLETED: 'Completed Port Call',
  PROCESSING_FDA: 'Processing FDA',
  AWAITING_PAYMENT: 'Awaiting Payment',
  SETTLED: 'Settled',
}

interface PortCallSummary {
  id: string
  port_call_number: string
  phase: string
  active_sub_status: string | null
  settled_sub_status: string | null
  file_status: string
  port_call_type: string
  service_scope: string[]
  is_locked: boolean
  vessel_name: string
  vessel_type: string
  imo_number: string
  flag_state: string
  dwt: number | null
  loa: number | null
  beam: number | null
  summer_draft: number | null
  principal_name: string
  principal_type: string
  charterer_name: string | null
  port_name: string
  un_locode: string
  terminal_name: string | null
  office_name: string | null
  office_code: string | null
  berth_name: string | null
  eta: string | null
  etd: string | null
  arrived_at: string | null
  sailed_at: string | null
  anchored_at: string | null
  berthed_at: string | null
  cargo_commenced_at: string | null
  cargo_completed_at: string | null
  laycan_open: string | null
  laycan_close: string | null
  last_port: string | null
  next_port: string | null
  cargo_group: string | null
  principal_ref: string | null
  notes: string | null
  ops_notes: string | null
  agent_fee_proforma_cents: number | null
  agent_fee_actual_cents: number | null
  husbandry_agent_fee_cents: number | null
  created_at: string
  updated_at: string
}

interface FinancialSummary {
  expense_count: string
  proforma_total: string
  actual_total: string
  pending_expenses: string
}

function cents(amount: number | null | undefined): string {
  if (amount == null) return '$0.00'
  return (amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default async function PortCallDetailPage({ params }: { params: { id: string } }) {
  const pc = await queryOne<PortCallSummary>(
    `SELECT
       pc.id, pc.port_call_number,
       pc.phase::text AS phase,
       pc.active_sub_status::text AS active_sub_status,
       pc.settled_sub_status::text AS settled_sub_status,
       pc.file_status, pc.port_call_type::text AS port_call_type,
       pc.service_scope::text[] AS service_scope,
       pc.is_locked,
       pc.eta, pc.etd, pc.arrived_at, pc.sailed_at,
       pc.anchored_at, pc.berthed_at, pc.cargo_commenced_at, pc.cargo_completed_at,
       pc.laycan_open, pc.laycan_close,
       pc.last_port, pc.next_port, pc.berth_name,
       pc.cargo_group::text AS cargo_group,
       pc.principal_ref, pc.notes, pc.ops_notes,
       pc.agent_fee_proforma_cents, pc.agent_fee_actual_cents, pc.husbandry_agent_fee_cents,
       pc.created_at, pc.updated_at,
       v.name AS vessel_name, v.vessel_type, v.imo_number, v.flag_state,
       v.dwt, v.loa, v.beam, v.summer_draft,
       o.name AS principal_name, o.type::text AS principal_type,
       ch.name AS charterer_name,
       p.name AS port_name, p.un_locode,
       t.name AS terminal_name,
       of.name AS office_name, of.code AS office_code
     FROM port_calls pc
     JOIN vessels v ON v.id = pc.vessel_id
     JOIN organizations o ON o.id = pc.principal_id
     LEFT JOIN organizations ch ON ch.id = pc.charterer_id
     JOIN ports p ON p.id = pc.port_id
     LEFT JOIN terminals t ON t.id = pc.terminal_id
     LEFT JOIN offices of ON of.id = pc.office_id
     WHERE pc.id = $1 AND pc.tenant_id = 'tenant-gca-001' AND pc.deleted_at IS NULL`,
    [params.id]
  )

  if (!pc) notFound()

  // Financial summary
  const fin = await queryOne<FinancialSummary>(
    `SELECT
       COUNT(*)::text AS expense_count,
       COALESCE(SUM(proforma_amount), 0)::text AS proforma_total,
       COALESCE(SUM(actual_amount), 0)::text AS actual_total,
       COUNT(*) FILTER (WHERE status IN ('ESTIMATED', 'ACCRUED'))::text AS pending_expenses
     FROM expenses
     WHERE port_call_id = $1 AND deleted_at IS NULL`,
    [params.id]
  )

  const fundRow = await queryOne<{ funded_total: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS funded_total
     FROM funding_records
     WHERE port_call_id = $1 AND status = 'RECEIVED' AND deleted_at IS NULL`,
    [params.id]
  )

  const proforma = parseInt(fin?.proforma_total ?? '0')
  const actual = parseInt(fin?.actual_total ?? '0')
  const funded = parseInt(fundRow?.funded_total ?? '0')
  const balance = funded - actual

  // Cargo lines
  const cargoLines = await query<{
    commodity: string
    cargo_type: string
    quantity: number
    unit: string
  }>(
    `SELECT commodity, cargo_type::text AS cargo_type, quantity, unit
     FROM cargo_lines WHERE port_call_id = $1 AND deleted_at IS NULL`,
    [params.id]
  )

  return (
    <div className="p-6 space-y-6">
      {/* Phase Controls Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-medium">Summary</h2>
          {pc.phase === 'ACTIVE' && (
            <SubStatusControls
              portCallId={pc.id}
              currentSubStatus={pc.active_sub_status ?? 'AT_ANCHOR'}
            />
          )}
        </div>
        <PhaseControls
          portCallId={pc.id}
          currentPhase={pc.phase}
          currentPhaseLabel={PHASE_DISPLAY[pc.phase] ?? pc.phase}
          fileStatus={pc.file_status}
          isLocked={pc.is_locked}
        />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Proforma Total"
          value={cents(proforma)}
          accent="blue"
        />
        <KpiCard
          label="Actual Total"
          value={cents(actual)}
          accent={actual > proforma ? 'red' : 'green'}
        />
        <KpiCard
          label="Funded"
          value={cents(funded)}
          accent="emerald"
        />
        <KpiCard
          label="Balance"
          value={cents(balance)}
          accent={balance < 0 ? 'red' : balance > 0 ? 'amber' : 'green'}
          subtitle={balance < 0 ? 'Underfunded' : balance > 0 ? 'Overfunded' : 'Balanced'}
        />
      </div>

      {/* Detail Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Vessel Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ship className="w-4 h-4 text-muted-foreground" />
              Vessel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Name" value={pc.vessel_name} />
            <DetailRow label="IMO" value={pc.imo_number} />
            <DetailRow label="Flag" value={pc.flag_state} />
            <DetailRow label="Type" value={pc.vessel_type?.replace(/_/g, ' ')} />
            {pc.dwt && <DetailRow label="DWT" value={`${pc.dwt.toLocaleString()} MT`} />}
            {pc.loa && <DetailRow label="LOA" value={`${pc.loa} m`} />}
            {pc.summer_draft && <DetailRow label="Draft" value={`${pc.summer_draft} m`} />}
          </CardContent>
        </Card>

        {/* Port & Terminal Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Port & Terminal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Port" value={pc.port_name} />
            <DetailRow label="LOCODE" value={pc.un_locode} />
            {pc.terminal_name && <DetailRow label="Terminal" value={pc.terminal_name} />}
            {pc.berth_name && <DetailRow label="Berth" value={pc.berth_name} />}
            {pc.last_port && <DetailRow label="Last Port" value={pc.last_port} />}
            {pc.next_port && <DetailRow label="Next Port" value={pc.next_port} />}
          </CardContent>
        </Card>

        {/* Parties Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Parties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Principal" value={pc.principal_name} />
            <DetailRow label="Role" value={pc.principal_type?.replace(/_/g, ' ')} />
            {pc.charterer_name && <DetailRow label="Charterer" value={pc.charterer_name} />}
            {pc.principal_ref && <DetailRow label="Ref" value={pc.principal_ref} />}
            {pc.office_name && <DetailRow label="Office" value={`${pc.office_name} (${pc.office_code})`} />}
          </CardContent>
        </Card>

        {/* Timing Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pc.eta && <DetailRow label="ETA" value={formatDateTime(pc.eta)} />}
            {pc.etd && <DetailRow label="ETD" value={formatDateTime(pc.etd)} />}
            {pc.arrived_at && <DetailRow label="Arrived" value={formatDateTime(pc.arrived_at)} />}
            {pc.anchored_at && <DetailRow label="Anchored" value={formatDateTime(pc.anchored_at)} />}
            {pc.berthed_at && <DetailRow label="Berthed" value={formatDateTime(pc.berthed_at)} />}
            {pc.cargo_commenced_at && <DetailRow label="Cargo Commenced" value={formatDateTime(pc.cargo_commenced_at)} />}
            {pc.cargo_completed_at && <DetailRow label="Cargo Complete" value={formatDateTime(pc.cargo_completed_at)} />}
            {pc.sailed_at && <DetailRow label="Sailed" value={formatDateTime(pc.sailed_at)} />}
          </CardContent>
        </Card>

        {/* Laycan Card */}
        {(pc.laycan_open || pc.laycan_close) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Laycan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {pc.laycan_open && <DetailRow label="Open" value={formatDate(pc.laycan_open)} />}
              {pc.laycan_close && <DetailRow label="Close" value={formatDate(pc.laycan_close)} />}
            </CardContent>
          </Card>
        )}

        {/* Cargo Card */}
        {cargoLines.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Cargo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {pc.cargo_group && <DetailRow label="Group" value={pc.cargo_group.replace(/_/g, ' ')} />}
              {cargoLines.map((cl, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">{cl.commodity}</span>
                  <span>{cl.quantity?.toLocaleString()} {cl.unit}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Service Scope Card */}
        {pc.service_scope && pc.service_scope.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Service Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {pc.service_scope.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs capitalize">
                    {s.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes */}
      {(pc.notes || pc.ops_notes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pc.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pc.notes}</p>
              </CardContent>
            </Card>
          )}
          {pc.ops_notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Ops Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pc.ops_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* File Metadata */}
      <div className="text-xs text-muted-foreground flex gap-4">
        <span>Created: {formatDateTime(pc.created_at)}</span>
        <span>Updated: {formatDateTime(pc.updated_at)}</span>
      </div>
    </div>
  )
}

// ─── Helper Components ───────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function KpiCard({
  label,
  value,
  accent,
  subtitle,
}: {
  label: string
  value: string
  accent: string
  subtitle?: string
}) {
  const colors: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50/50',
    green: 'border-green-200 bg-green-50/50',
    emerald: 'border-emerald-200 bg-emerald-50/50',
    red: 'border-red-200 bg-red-50/50',
    amber: 'border-amber-200 bg-amber-50/50',
  }

  return (
    <div className={`rounded-lg border p-4 ${colors[accent] ?? ''}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1 tabular-nums">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
  )
}
