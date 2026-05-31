import { tenantQuery, tenantQueryOne, auditedMutation } from '@shipops/db'
import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getRequestContext, getTenantId } from '@/lib/api/auth'

export async function GET() {
  const tenantId = await getTenantId()
  const rows = await tenantQuery(
    tenantId,
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
     WHERE pc.deleted_at IS NULL AND pc.tenant_id = $1
     ORDER BY pc.created_at DESC`,
    [tenantId]
  )
  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const ctx = await getRequestContext()
  const tenantId = ctx.tenantId
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
  const office = await tenantQueryOne<{ code: string }>(
    tenantId,
    `SELECT code FROM offices WHERE id = $1 AND tenant_id = $2`,
    [officeId, tenantId]
  )
  const officeCode = office?.code ?? 'GCA'

  // Sequential number: 5-digit per office per year
  const year = new Date().getFullYear()
  const seqRow = await tenantQueryOne<{ cnt: string }>(
    tenantId,
    `SELECT COUNT(*) AS cnt FROM port_calls
     WHERE tenant_id = $1
       AND EXTRACT(YEAR FROM created_at) = $2
       AND office_id = $3`,
    [tenantId, year, officeId]
  )
  const seq = (parseInt(seqRow?.cnt ?? '0') + 1).toString().padStart(5, '0')
  const portCallNumber = `${officeCode}-${year}-${seq}`

  // Audited INSERT — port_calls. Generate id in JS so it can be both the
  // INSERT param and the audit resourceId. No auditedTable on INSERTs.
  const portCallId = randomUUID()
  const row = await auditedMutation<{ id: string; port_call_number: string }>({
    tenantId,
    actor: ctx.actor,
    audit: { action: 'CREATE', resourceType: 'port_call', resourceId: portCallId },
    mutationSql:
      `INSERT INTO port_calls (
         id, tenant_id, port_call_number, phase, port_call_type, service_scope,
         vessel_id, principal_id, charterer_id, port_id, terminal_id, office_id,
         cargo_group, last_port, next_port,
         eta, etd, laycan_open, laycan_close,
         voyage_number, principal_ref, notes,
         file_status, is_sub_file, is_locked,
         created_at, updated_at, created_by, updated_by
       ) VALUES (
         $1, $2, $3,
         'PROFORMA_ESTIMATED',
         $4, $5::text[]::"ServiceScope"[],
         $6, $7, $8, $9, $10, $11,
         $12, $13, $14,
         $15, $16, $17, $18,
         $19, $20, $21,
         'ACTIVE', false, false,
         NOW(), NOW(), 'system', 'system'
       ) RETURNING id, port_call_number`,
    mutationParams: [
      portCallId,
      tenantId,
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
    ],
  })

  // Audited INSERT — cargo_line (if provided). Independent transaction; if
  // this fails, the port_call survives without a cargo line. Cross-write
  // atomicity across port_call + cargo_line is a pre-existing gap, not
  // introduced by S2 — see SESSION_STATE for the follow-up note.
  if (cargo?.commodity && row?.id) {
    const cargoId = randomUUID()
    await auditedMutation({
      tenantId,
      actor: ctx.actor,
      audit: { action: 'CREATE', resourceType: 'cargo_line', resourceId: cargoId },
      mutationSql:
        `INSERT INTO cargo_lines (
           id, tenant_id, port_call_id, commodity, cargo_type, quantity, unit,
           created_at, updated_at, created_by, updated_by
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           NOW(), NOW(), 'system', 'system'
         ) RETURNING id, commodity, quantity, unit`,
      mutationParams: [
        cargoId,
        tenantId,
        row.id,
        cargo.commodity,
        cargo.cargoType ?? 'DRY_BULK',
        cargo.quantity ?? 0,
        cargo.unit,
      ],
    })
  }

  return Response.json({ id: row?.id, portCallNumber }, { status: 201 })
}
