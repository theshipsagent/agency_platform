import { query } from '@shipops/db'
import { NextRequest } from 'next/server'

// GET /api/ports
// (no params)   — tenant ports + terminals for form selects
// ?foreign=1&q= — search Schedule K foreign ports register
// ?us=1&q=      — search CBP Schedule D US ports register

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const like = `%${q}%`

  if (req.nextUrl.searchParams.get('foreign') === '1') {
    const rows = await query<{
      schedule_k_code: string
      port_name: string
      country_name: string
      latitude: number | null
      longitude: number | null
      is_official: boolean
    }>(
      `SELECT schedule_k_code, port_name, country_name, latitude, longitude, is_official
       FROM foreign_ports
       WHERE (port_name ILIKE $1 OR country_name ILIKE $1 OR schedule_k_code ILIKE $1)
       ORDER BY is_official DESC, port_name
       LIMIT 30`,
      [like]
    )
    return Response.json({ foreignPorts: rows })
  }

  if (req.nextUrl.searchParams.get('us') === '1') {
    const rows = await query<{
      cbp_code: string
      port_name: string
      region: string
      state: string
    }>(
      `SELECT cbp_code, port_name, region, state
       FROM us_ports
       WHERE (port_name ILIKE $1 OR state ILIKE $1 OR cbp_code ILIKE $1)
       ORDER BY port_name
       LIMIT 30`,
      [like]
    )
    return Response.json({ usPorts: rows })
  }

  // Default: tenant ports + terminals for the create form selects
  const [ports, terminals] = await Promise.all([
    query<{ id: string; name: string; un_locode: string; country: string }>(
      `SELECT id, name, un_locode, country
       FROM ports
       WHERE tenant_id = 'tenant-gca-001'
       ORDER BY name`
    ),
    query<{
      id: string; port_id: string; name: string; terminal_type: string
      max_draft_m: number | null; max_loa_m: number | null
      cargo_types_handled: string[] | null; pilot_required: boolean
      tug_count_required: number | null
    }>(
      `SELECT t.id, t.port_id, t.name, t.terminal_type,
              t.max_draft_m, t.max_loa_m, t.cargo_types_handled,
              t.pilot_required, t.tug_count_required
       FROM terminals t
       JOIN ports p ON p.id = t.port_id
       WHERE p.tenant_id = 'tenant-gca-001'
       ORDER BY t.name`
    ),
  ])

  return Response.json({ ports, terminals })
}

// POST /api/ports
// Register a port from a reference table into the tenant's ports table.
// Body: { scheduleKCode } for foreign  OR  { cbpCode } for US

export async function POST(req: NextRequest) {
  const body = await req.json() as { scheduleKCode?: string; cbpCode?: string }

  // ── US port (CBP Schedule D) ──────────────────────────────────────────────
  if (body.cbpCode) {
    const { cbpCode } = body

    const up = await query<{ cbp_code: string; port_name: string; state: string }>(
      `SELECT cbp_code, port_name, state FROM us_ports WHERE cbp_code = $1`,
      [cbpCode]
    ).then((r) => r[0] ?? null)
    if (!up) return Response.json({ error: 'CBP code not found' }, { status: 404 })

    const existing = await query<{ id: string }>(
      `SELECT id FROM ports WHERE tenant_id = 'tenant-gca-001' AND un_locode = $1`,
      [cbpCode]
    ).then((r) => r[0] ?? null)
    if (existing) return Response.json(existing)

    const row = await query<{ id: string }>(
      `INSERT INTO ports (id, tenant_id, name, un_locode, country, region, time_zone)
       VALUES (gen_random_uuid(), 'tenant-gca-001', $1, $2, 'US', $3, 'UTC')
       RETURNING id`,
      [up.port_name, cbpCode, up.state]
    ).then((r) => r[0] ?? null)

    return Response.json({ id: row?.id, name: up.port_name, un_locode: cbpCode }, { status: 201 })
  }

  // ── Foreign port (Schedule K) ─────────────────────────────────────────────
  if (body.scheduleKCode) {
    const { scheduleKCode } = body

    const fp = await query<{ schedule_k_code: string; port_name: string; country_name: string }>(
      `SELECT schedule_k_code, port_name, country_name
       FROM foreign_ports WHERE schedule_k_code = $1 AND is_official = true LIMIT 1`,
      [scheduleKCode]
    ).then((r) => r[0] ?? null)
    if (!fp) return Response.json({ error: 'Schedule K code not found' }, { status: 404 })

    const existing = await query<{ id: string }>(
      `SELECT id FROM ports WHERE tenant_id = 'tenant-gca-001' AND un_locode = $1`,
      [scheduleKCode]
    ).then((r) => r[0] ?? null)
    if (existing) return Response.json(existing)

    const row = await query<{ id: string }>(
      `INSERT INTO ports (id, tenant_id, name, un_locode, country, time_zone)
       VALUES (gen_random_uuid(), 'tenant-gca-001', $1, $2, $3, 'UTC')
       RETURNING id`,
      [fp.port_name, scheduleKCode, fp.country_name]
    ).then((r) => r[0] ?? null)

    return Response.json({ id: row?.id, name: fp.port_name, un_locode: scheduleKCode }, { status: 201 })
  }

  return Response.json({ error: 'cbpCode or scheduleKCode required' }, { status: 400 })
}
