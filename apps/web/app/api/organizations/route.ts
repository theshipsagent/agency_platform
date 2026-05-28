import { tenantQuery } from '@shipops/db'
import { NextRequest } from 'next/server'
import { getTenantId } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const tenantId = await getTenantId()
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const principalsOnly = req.nextUrl.searchParams.get('principals') === 'true'

  const typeFilter = principalsOnly
    ? `AND type IN ('PRINCIPAL_CHARTERER','PRINCIPAL_OWNER','PRINCIPAL_CARGO_INTEREST')`
    : ''

  const rows = await tenantQuery<{ id: string; name: string; type: string }>(
    tenantId,
    `SELECT id, name, type
     FROM organizations
     WHERE tenant_id = $1
       AND deleted_at IS NULL
       AND name ILIKE $2
       ${typeFilter}
     ORDER BY name
     LIMIT 20`,
    [tenantId, `%${q}%`]
  )
  return Response.json(rows)
}
