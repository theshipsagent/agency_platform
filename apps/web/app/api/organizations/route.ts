import { query } from '@shipops/db'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const principalsOnly = req.nextUrl.searchParams.get('principals') === 'true'

  const typeFilter = principalsOnly
    ? `AND type IN ('PRINCIPAL_CHARTERER','PRINCIPAL_OWNER','PRINCIPAL_CARGO_INTEREST')`
    : ''

  const rows = await query<{ id: string; name: string; type: string }>(
    `SELECT id, name, type
     FROM organizations
     WHERE tenant_id = 'tenant-gca-001'
       AND deleted_at IS NULL
       AND name ILIKE $1
       ${typeFilter}
     ORDER BY name
     LIMIT 20`,
    [`%${q}%`]
  )
  return Response.json(rows)
}
