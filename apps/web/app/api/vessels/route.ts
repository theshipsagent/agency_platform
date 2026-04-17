import { query, queryOne } from '@shipops/db'
import { NextRequest } from 'next/server'

// ─── Search vessels ───────────────────────────────────────────────────────────
// Returns tenant vessels first (registered in this agency), then falls back
// to the global ships_register if fewer than 5 tenant results.

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const like = `%${q}%`

  // 1. Tenant-registered vessels
  const tenantVessels = await query<{
    id: string
    name: string
    imo_number: string
    flag_state: string
    vessel_type: string
    source: 'registered'
  }>(
    `SELECT id, name, imo_number, flag_state, vessel_type, 'registered' AS source
     FROM vessels
     WHERE tenant_id = 'tenant-gca-001'
       AND deleted_at IS NULL
       AND (name ILIKE $1 OR imo_number ILIKE $1)
     ORDER BY name
     LIMIT 10`,
    [like]
  )

  // 2. Ships register fallback — exclude IMOs already in tenant list
  const excludeImos = tenantVessels.map((v) => v.imo_number)
  const registerResults = await query<{
    id: string
    name: string
    imo_number: string
    flag_state: string
    vessel_type: string
    dwt: number | null
    gt: number | null
    loa: number | null
    source: 'register'
  }>(
    `SELECT
       imo          AS id,
       vessel_name  AS name,
       imo          AS imo_number,
       ''           AS flag_state,
       vessel_type,
       NULLIF(dwt, 0)  AS dwt,
       NULLIF(gt,  0)  AS gt,
       NULLIF(loa, 0)  AS loa,
       'register'   AS source
     FROM ships_register
     WHERE (vessel_name ILIKE $1 OR imo ILIKE $1)
       ${excludeImos.length ? `AND imo NOT IN (${excludeImos.map((_, i) => `$${i + 2}`).join(',')})` : ''}
     ORDER BY vessel_name
     LIMIT ${Math.max(0, 20 - tenantVessels.length)}`,
    excludeImos.length ? [like, ...excludeImos] : [like]
  )

  return Response.json({ tenantVessels, registerResults })
}

// ─── Register a vessel from ships_register into the tenant vessels table ──────
// Called when user selects a vessel from the ships_register results.

export async function POST(req: NextRequest) {
  const body = await req.json() as { imo: string }
  const { imo } = body

  if (!imo) return Response.json({ error: 'imo required' }, { status: 400 })

  // Already registered?
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM vessels WHERE tenant_id = 'tenant-gca-001' AND imo_number = $1 AND deleted_at IS NULL`,
    [imo]
  )
  if (existing) return Response.json(existing)

  // Look up from register
  const reg = await queryOne<{
    vessel_name: string; vessel_type: string | null; dwt: number | null
    loa: number | null; beam: number | null; depth_m: number | null
    gt: number | null; nrt: number | null; dwt_draft_m: number | null
  }>(
    `SELECT vessel_name, vessel_type, NULLIF(dwt,0) AS dwt,
            NULLIF(loa,0) AS loa, NULLIF(beam,0) AS beam,
            NULLIF(depth_m,0) AS depth_m, NULLIF(gt,0) AS gt,
            NULLIF(nrt,0) AS nrt, NULLIF(dwt_draft_m,0) AS dwt_draft_m
     FROM ships_register WHERE imo = $1`,
    [imo]
  )
  if (!reg) return Response.json({ error: 'IMO not found in register' }, { status: 404 })

  const row = await queryOne<{ id: string }>(
    `INSERT INTO vessels (
       id, tenant_id, imo_number, name, flag_state, vessel_type,
       loa, beam, summer_draft, gross_tonnage, net_tonnage, dwt,
       created_at, updated_at, created_by, updated_by
     ) VALUES (
       gen_random_uuid(), 'tenant-gca-001', $1, $2, '', $3,
       $4, $5, $6, $7, $8, $9,
       NOW(), NOW(), 'system', 'system'
     ) RETURNING id`,
    [
      imo,
      reg.vessel_name,
      reg.vessel_type ?? '',
      reg.loa ?? null,
      reg.beam ?? null,
      reg.dwt_draft_m ?? null,
      reg.gt ?? null,
      reg.nrt ?? null,
      reg.dwt ?? null,
    ]
  )

  return Response.json({ id: row?.id, name: reg.vessel_name, imo_number: imo }, { status: 201 })
}
