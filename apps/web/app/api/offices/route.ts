import { query } from '@shipops/db'

export async function GET() {
  const rows = await query<{ id: string; name: string; code: string }>(
    `SELECT id, name, code FROM offices WHERE tenant_id = 'tenant-gca-001' ORDER BY name`
  )
  return Response.json(rows)
}
