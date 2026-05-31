import { tenantQuery, tenantQueryOne, auditedMutation } from '@shipops/db'
import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { CreateVesselBodySchema } from '@shipops/shared/validation'
import { getRequestContext, getTenantId } from '@/lib/api/auth'
import { parseBody } from '@/lib/api/parse'

// ─── Search vessels ───────────────────────────────────────────────────────────
// Returns tenant vessels first (registered in this agency), then falls back
// to the global ships_register if fewer than 5 tenant results.

export async function GET(req: NextRequest) {
  const tenantId = await getTenantId()
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const like = `%${q}%`

  // 1. Tenant-registered vessels
  const tenantVessels = await tenantQuery<{
    id: string
    name: string
    imo_number: string
    flag_state: string
    vessel_type: string
    source: 'registered'
  }>(
    tenantId,
    `SELECT id, name, imo_number, flag_state, vessel_type, 'registered' AS source
     FROM vessels
     WHERE tenant_id = $1
       AND deleted_at IS NULL
       AND (name ILIKE $2 OR imo_number ILIKE $2)
     ORDER BY name
     LIMIT 10`,
    [tenantId, like]
  )

  // 2. Ships register fallback — global reference table, no tenant filter
  const excludeImos = tenantVessels.map((v) => v.imo_number)
  const baseParams: unknown[] = [like]
  const excludeClause = excludeImos.length
    ? `AND imo NOT IN (${excludeImos.map((_, i) => `$${i + 2}`).join(',')})`
    : ''
  const registerResults = await tenantQuery<{
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
    tenantId,
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
       ${excludeClause}
     ORDER BY vessel_name
     LIMIT ${Math.max(0, 20 - tenantVessels.length)}`,
    excludeImos.length ? [...baseParams, ...excludeImos] : baseParams
  )

  return Response.json({ tenantVessels, registerResults })
}

// ─── Register a vessel from ships_register into the tenant vessels table ──────
// Called when user selects a vessel from the ships_register results.

export async function POST(req: NextRequest) {
  const ctx = await getRequestContext()
  const parsed = parseBody(CreateVesselBodySchema, await req.json())
  if (!parsed.ok) return parsed.response
  const { imo } = parsed.data
  // Note: the `if (!imo)` runtime guard the route used to have is now
  // structurally enforced by the schema (imo is a required 7-digit string).

  // Already registered?
  const existing = await tenantQueryOne<{ id: string }>(
    ctx.tenantId,
    `SELECT id FROM vessels WHERE tenant_id = $1 AND imo_number = $2 AND deleted_at IS NULL`,
    [ctx.tenantId, imo]
  )
  if (existing) return Response.json(existing)

  // Look up from register — global reference table, no tenant filter
  const reg = await tenantQueryOne<{
    vessel_name: string; vessel_type: string | null; dwt: number | null
    loa: number | null; beam: number | null; depth_m: number | null
    gt: number | null; nrt: number | null; dwt_draft_m: number | null
  }>(
    ctx.tenantId,
    `SELECT vessel_name, vessel_type, NULLIF(dwt,0) AS dwt,
            NULLIF(loa,0) AS loa, NULLIF(beam,0) AS beam,
            NULLIF(depth_m,0) AS depth_m, NULLIF(gt,0) AS gt,
            NULLIF(nrt,0) AS nrt, NULLIF(dwt_draft_m,0) AS dwt_draft_m
     FROM ships_register WHERE imo = $1`,
    [imo]
  )
  if (!reg) return Response.json({ error: 'IMO not found in register' }, { status: 404 })

  // Audited INSERT: generate id in JS so it can be both the SQL param and the
  // audit resourceId. No auditedTable — INSERT has no prior `before` state.
  const newId = randomUUID()
  const row = await auditedMutation<{ id: string }>({
    tenantId: ctx.tenantId,
    actor: ctx.actor,
    audit: { action: 'CREATE', resourceType: 'vessel', resourceId: newId },
    mutationSql:
      `INSERT INTO vessels (
         id, tenant_id, imo_number, name, flag_state, vessel_type,
         loa, beam, summer_draft, gross_tonnage, net_tonnage, dwt,
         created_at, updated_at, created_by, updated_by
       ) VALUES (
         $1, $2, $3, $4, '', $5,
         $6, $7, $8, $9, $10, $11,
         NOW(), NOW(), 'system', 'system'
       ) RETURNING id, imo_number, name, vessel_type`,
    mutationParams: [
      newId,
      ctx.tenantId,
      imo,
      reg.vessel_name,
      reg.vessel_type ?? '',
      reg.loa ?? null,
      reg.beam ?? null,
      reg.dwt_draft_m ?? null,
      reg.gt ?? null,
      reg.nrt ?? null,
      reg.dwt ?? null,
    ],
  })

  return Response.json({ id: row?.id, name: reg.vessel_name, imo_number: imo }, { status: 201 })
}
