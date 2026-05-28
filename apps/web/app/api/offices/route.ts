import { tenantQuery } from '@shipops/db'
import { NextRequest } from 'next/server'
import { getTenantId } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const tenantId = await getTenantId()
  const { searchParams } = req.nextUrl
  const officeId = searchParams.get('officeId')
  const wantPorts = searchParams.get('ports')

  // Return port IDs for a specific office (office→port cascade)
  if (officeId && wantPorts) {
    const rows = await tenantQuery<{ port_id: string }>(
      tenantId,
      `SELECT port_id FROM office_ports WHERE office_id = $1 AND tenant_id = $2`,
      [officeId, tenantId]
    )
    return Response.json({ portIds: rows.map(r => r.port_id) })
  }

  // Default: return all offices
  const rows = await tenantQuery<{ id: string; name: string; code: string }>(
    tenantId,
    `SELECT id, name, code FROM offices WHERE tenant_id = $1 ORDER BY code`,
    [tenantId]
  )
  return Response.json(rows)
}
