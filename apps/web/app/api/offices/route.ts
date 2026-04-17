import { query } from '@shipops/db'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const officeId = searchParams.get('officeId')
  const wantPorts = searchParams.get('ports')

  // Return port IDs for a specific office (office→port cascade)
  if (officeId && wantPorts) {
    const rows = await query<{ port_id: string }>(
      `SELECT port_id FROM office_ports WHERE office_id = $1`,
      [officeId]
    )
    return Response.json({ portIds: rows.map(r => r.port_id) })
  }

  // Default: return all offices
  const rows = await query<{ id: string; name: string; code: string }>(
    `SELECT id, name, code FROM offices WHERE tenant_id = 'tenant-gca-001' ORDER BY code`
  )
  return Response.json(rows)
}
