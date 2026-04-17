import { query, queryOne } from '@shipops/db'
import { NextRequest } from 'next/server'

const VALID_STATUSES = ['ACTIVE', 'ON_HOLD', 'CANCELLED'] as const
type FileStatus = (typeof VALID_STATUSES)[number]

// PATCH /api/port-calls/[id]
// Body: { fileStatus: 'ACTIVE' | 'ON_HOLD' | 'CANCELLED' }

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json() as { fileStatus: string }
  const { fileStatus } = body

  if (!VALID_STATUSES.includes(fileStatus as FileStatus)) {
    return Response.json({ error: 'Invalid fileStatus' }, { status: 400 })
  }

  const row = await queryOne<{ id: string; file_status: string }>(
    `UPDATE port_calls
     SET file_status = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = 'tenant-gca-001' AND deleted_at IS NULL
     RETURNING id, file_status`,
    [fileStatus, params.id]
  )

  if (!row) return Response.json({ error: 'Port call not found' }, { status: 404 })

  return Response.json(row)
}

// GET /api/port-calls/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const row = await queryOne(
    `SELECT pc.*,
            v.name AS vessel_name, v.imo_number, v.flag_state, v.vessel_type, v.dwt,
            o.name AS principal_name, o.type AS principal_type,
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
    [params.id]
  )

  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(row)
}
