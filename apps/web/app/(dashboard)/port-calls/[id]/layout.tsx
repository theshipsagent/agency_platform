import { queryOne } from '@shipops/db'
import { notFound } from 'next/navigation'
import { PortCallHeader } from '@/components/port-call/PortCallHeader'
import { PortCallTabs } from '@/components/port-call/PortCallTabs'

interface PortCallDetail {
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
  principal_name: string
  principal_type: string
  port_name: string
  un_locode: string
  terminal_name: string | null
  office_name: string | null
  office_code: string | null
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
  berth_name: string | null
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

async function getPortCall(id: string): Promise<PortCallDetail | null> {
  return queryOne<PortCallDetail>(
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
       v.name AS vessel_name, v.vessel_type, v.imo_number, v.flag_state, v.dwt,
       o.name AS principal_name, o.type::text AS principal_type,
       p.name AS port_name, p.un_locode,
       t.name AS terminal_name,
       of.name AS office_name, of.code AS office_code
     FROM port_calls pc
     JOIN vessels v ON v.id = pc.vessel_id
     JOIN organizations o ON o.id = pc.principal_id
     JOIN ports p ON p.id = pc.port_id
     LEFT JOIN terminals t ON t.id = pc.terminal_id
     LEFT JOIN offices of ON of.id = pc.office_id
     WHERE pc.id = $1 AND pc.tenant_id = 'tenant-gca-001' AND pc.deleted_at IS NULL`,
    [id]
  )
}

export default async function PortCallDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const pc = await getPortCall(params.id)
  if (!pc) notFound()

  return (
    <div className="flex flex-col h-full">
      <PortCallHeader portCall={pc} />
      <PortCallTabs portCallId={pc.id} portCallType={pc.port_call_type} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
