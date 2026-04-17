import { query, queryOne } from '@shipops/db'
import { NextRequest } from 'next/server'

export async function GET() {
  const rows = await query(
    `SELECT pc.id, pc.port_call_number, pc.phase, pc.port_call_type,
            pc.file_status, pc.active_sub_status,
            v.name AS vessel_name, o.name AS principal_name, p.name AS port_name,
            off.code AS office_code,
            pc.eta, pc.created_at
     FROM port_calls pc
     JOIN vessels v ON v.id = pc.vessel_id
     JOIN organizations o ON o.id = pc.principal_id
     JOIN ports p ON p.id = pc.port_id
     LEFT JOIN offices off ON off.id = pc.office_id
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
    chartererId?: string
    portId: string
    terminalId?: string
    officeId: string
    cargoGroup?: string
    lastPort?: string
    nextPort?: string
    eta?: string
    etd?: string
    laycanOpen?: string
    laycanClose?: string
    voyageNumber?: string
    principalRef?: string
    notes?: string
    cargo?: {
      commodity: string
      cargoType?: string
      quantity?: number
      unit: string
    }
  }

  const {
    portCallType, serviceScope, vesselId, principalId, chartererId,
    portId, terminalId, officeId, cargoGroup, lastPort, nextPort,
    eta, etd, laycanOpen, laycanClose, voyageNumber, principalRef, notes,
    cargo,
  } = body

  if (!portCallType || !vesselId || !principalId || !portId || !officeId) {
    return Response.json({ error: 'portCallType, vesselId, principalId, portId, and officeId are required' }, { status: 400 })
  }

  // Resolve office code for file number prefix
  const office = await queryOne<{ code: string }>(
    `SELECT code FROM offices WHERE id = $1 AND tenant_id = 'tenant-gca-001'`,
    [officeId]
  )
  const officeCode = office?.code ?? 'GCA'

  // Sequential number: 5-digit per office per year
  const year = new Date().getFullYear()
  const seqRow = await queryOne<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM port_calls
     WHERE tenant_id = 'tenant-gca-001'
       AND EXTRACT(YEAR FROM created_at) = $1
       AND office_id = $2`,
    [year, officeId]
  )
  const seq = (parseInt(seqRow?.cnt ?? '0') + 1).toString().padStart(5, '0')
  const portCallNumber = `${officeCode}-${year}-${seq}`

  const row = await queryOne<{ id: string }>(
    `INSERT INTO port_calls (
       id, tenant_id, port_call_number, phase, port_call_type, service_scope,
       vessel_id, principal_id, charterer_id, port_id, terminal_id, office_id,
       cargo_group, last_port, next_port,
       eta, etd, laycan_open, laycan_close,
       voyage_number, principal_ref, notes,
       file_status, is_sub_file, is_locked,
       created_at, updated_at, created_by, updated_by
     ) VALUES (
       gen_random_uuid(), 'tenant-gca-001', $1,
       'PROFORMA_ESTIMATED',
       $2, $3::text[]::"ServiceScope"[],
       $4, $5, $6, $7, $8, $9,
       $10, $11, $12,
       $13, $14, $15, $16,
       $17, $18, $19,
       'ACTIVE', false, false,
       NOW(), NOW(), 'system', 'system'
     ) RETURNING id`,
    [
      portCallNumber,
      portCallType,
      serviceScope ?? [],
      vesselId,
      principalId,
      chartererId ?? null,
      portId,
      terminalId ?? null,
      officeId,
      cargoGroup ?? null,
      lastPort ?? null,
      nextPort ?? null,
      eta ? new Date(eta) : null,
      etd ? new Date(etd) : null,
      laycanOpen ? new Date(laycanOpen) : null,
      laycanClose ? new Date(laycanClose) : null,
      voyageNumber ?? null,
      principalRef ?? null,
      notes ?? null,
    ]
  )

  // Insert cargo line if provided
  if (cargo?.commodity && row?.id) {
    await query(
      `INSERT INTO cargo_lines (
         id, tenant_id, port_call_id, commodity, cargo_type, quantity, unit,
         created_at, updated_at, created_by, updated_by
       ) VALUES (
         gen_random_uuid(), 'tenant-gca-001', $1, $2, $3, $4, $5,
         NOW(), NOW(), 'system', 'system'
       )`,
      [
        row.id,
        cargo.commodity,
        cargo.cargoType ?? 'DRY_BULK',
        cargo.quantity ?? 0,
        cargo.unit,
      ]
    )
  }

  return Response.json({ id: row?.id, portCallNumber }, { status: 201 })
}
