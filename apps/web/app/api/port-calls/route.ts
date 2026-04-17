import { query, queryOne } from '@shipops/db'
import { NextRequest } from 'next/server'

export async function GET() {
  const rows = await query(
    `SELECT pc.id, pc.port_call_number, pc.phase, pc.port_call_type,
            v.name AS vessel_name, o.name AS principal_name, p.name AS port_name,
            pc.eta, pc.created_at
     FROM port_calls pc
     JOIN vessels v ON v.id = pc.vessel_id
     JOIN organizations o ON o.id = pc.principal_id
     JOIN ports p ON p.id = pc.port_id
     WHERE pc.deleted_at IS NULL AND pc.tenant_id = 'tenant-gca-001'
     ORDER BY pc.created_at DESC`
  )
  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    portCallType: string
    serviceScope: string[]
    vesselId: string
    principalId: string
    portId: string
    terminalId?: string
    officeId?: string
    eta?: string
    notes?: string
  }

  const { portCallType, serviceScope, vesselId, principalId, portId, terminalId, officeId, eta, notes } = body

  if (!portCallType || !vesselId || !principalId || !portId) {
    return Response.json({ error: 'portCallType, vesselId, principalId, and portId are required' }, { status: 400 })
  }

  // Resolve office code for file number prefix
  let officeCode = 'GCA'
  if (officeId) {
    const office = await queryOne<{ code: string }>(
      `SELECT code FROM offices WHERE id = $1 AND tenant_id = 'tenant-gca-001'`,
      [officeId]
    )
    if (office) officeCode = office.code
  }

  // Sequential number per office per year
  const year = new Date().getFullYear()
  const seqRow = await queryOne<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM port_calls
     WHERE tenant_id = 'tenant-gca-001'
       AND EXTRACT(YEAR FROM created_at) = $1
       AND (office_id = $2 OR ($2::text IS NULL AND office_id IS NULL))`,
    [year, officeId ?? null]
  )
  const seq = (parseInt(seqRow?.cnt ?? '0') + 1).toString().padStart(3, '0')
  const portCallNumber = `${officeCode}-${year}-${seq}`

  const row = await queryOne<{ id: string }>(
    `INSERT INTO port_calls (
       id, tenant_id, port_call_number, phase, port_call_type, service_scope,
       vessel_id, principal_id, port_id, terminal_id, office_id, eta, notes,
       file_status, is_locked, created_at, updated_at, created_by, updated_by
     ) VALUES (
       gen_random_uuid(), 'tenant-gca-001', $1,
       'PROFORMA_ESTIMATED'::port_call_phase,
       $2::port_call_type,
       $3::service_scope[],
       $4, $5, $6, $7, $8, $9, $10,
       'ACTIVE', false, NOW(), NOW(), 'system', 'system'
     ) RETURNING id`,
    [
      portCallNumber,
      portCallType,
      serviceScope ?? [],
      vesselId,
      principalId,
      portId,
      terminalId ?? null,
      officeId ?? null,
      eta ? new Date(eta) : null,
      notes ?? null,
    ]
  )

  return Response.json({ id: row?.id, portCallNumber }, { status: 201 })
}
