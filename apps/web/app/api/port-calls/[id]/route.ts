import { tenantQueryOne, auditedMutation } from '@shipops/db'
import { NextRequest } from 'next/server'
import { UpdatePortCallFileStatusBodySchema } from '@shipops/shared/validation'
import { getRequestContext, getTenantId } from '@/lib/api/auth'
import { parseBody } from '@/lib/api/parse'

// PATCH /api/port-calls/[id]
// Body: { fileStatus: 'ACTIVE' | 'ON_HOLD' | 'CANCELLED' } — see schema.

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getRequestContext()
  const parsed = parseBody(UpdatePortCallFileStatusBodySchema, await req.json())
  if (!parsed.ok) return parsed.response
  const { fileStatus } = parsed.data
  // The schema enforces fileStatus is one of ACTIVE/ON_HOLD/CANCELLED — the
  // VALID_STATUSES runtime guard the route used to carry is gone.

  const row = await auditedMutation<{ id: string; file_status: string }>({
    tenantId: ctx.tenantId,
    actor: ctx.actor,
    audit: {
      action: 'UPDATE_FILE_STATUS',
      resourceType: 'port_call',
      resourceId: params.id,
      auditedTable: 'port_calls',
    },
    mutationSql:
      `UPDATE port_calls
       SET file_status = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
       RETURNING id, file_status`,
    mutationParams: [fileStatus, params.id, ctx.tenantId],
  })

  if (!row) return Response.json({ error: 'Port call not found' }, { status: 404 })

  return Response.json(row)
}

// GET /api/port-calls/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantId = await getTenantId()
  const row = await tenantQueryOne(
    tenantId,
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
     WHERE pc.id = $1 AND pc.tenant_id = $2 AND pc.deleted_at IS NULL`,
    [params.id, tenantId]
  )

  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(row)
}
