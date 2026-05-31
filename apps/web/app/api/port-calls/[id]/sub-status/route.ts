import { tenantQueryOne, auditedMutation } from '@shipops/db'
import { NextRequest } from 'next/server'
import { UpdateSubStatusBodySchema } from '@shipops/shared/validation'
import { getRequestContext } from '@/lib/api/auth'
import { parseBody } from '@/lib/api/parse'

// Valid sub-status transitions within Phase 4
const ACTIVE_SUB_TRANSITIONS: Record<string, string[]> = {
  AT_ANCHOR: ['BERTHED'],
  BERTHED: ['WORKING_CARGO', 'AT_ANCHOR'], // Can go back to anchor (shifted off berth)
  WORKING_CARGO: ['CARGO_COMPLETE', 'BERTHED'], // Rare: cargo ops suspended
  CARGO_COMPLETE: [], // Terminal — must transition to Phase 5 (Sailed)
}

// PATCH /api/port-calls/[id]/sub-status
// Body: exactly one of { activeSubStatus } or { settledSubStatus }
// The XOR is enforced by the schema (.refine in UpdateSubStatusBodySchema).

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getRequestContext()
  const tenantId = ctx.tenantId
  const parsed = parseBody(UpdateSubStatusBodySchema, await req.json())
  if (!parsed.ok) return parsed.response
  const body = parsed.data
  // Schema guarantees: exactly one of activeSubStatus / settledSubStatus is
  // present and valid. The VALID_ACTIVE_SUBS / VALID_SETTLED_SUBS runtime
  // guards the route used to carry are gone — z.nativeEnum does it.

  // Fetch current state
  const pc = await tenantQueryOne<{
    id: string
    phase: string
    active_sub_status: string | null
    settled_sub_status: string | null
    file_status: string
  }>(
    tenantId,
    `SELECT id, phase::text AS phase, active_sub_status::text, settled_sub_status::text, file_status
     FROM port_calls WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [params.id, tenantId]
  )

  if (!pc) {
    return Response.json({ error: 'Port call not found' }, { status: 404 })
  }

  if (pc.file_status !== 'ACTIVE') {
    return Response.json({ error: 'Port call is not active' }, { status: 422 })
  }

  // Handle Phase 4 sub-status (active)
  if (body.activeSubStatus) {
    if (pc.phase !== 'ACTIVE') {
      return Response.json(
        { error: 'Active sub-status only applies to Phase 4 (Active Port Call)' },
        { status: 422 }
      )
    }

    const current = pc.active_sub_status || 'AT_ANCHOR'
    const allowed = ACTIVE_SUB_TRANSITIONS[current] || []
    if (!allowed.includes(body.activeSubStatus)) {
      return Response.json(
        { error: `Cannot transition from ${current} to ${body.activeSubStatus}. Allowed: ${allowed.join(', ') || 'none (terminal)'}` },
        { status: 422 }
      )
    }

    // Build timestamp updates based on sub-status
    const tsUpdates: string[] = []
    switch (body.activeSubStatus) {
      case 'AT_ANCHOR': tsUpdates.push('anchored_at = NOW()'); break
      case 'BERTHED': tsUpdates.push('berthed_at = NOW()'); break
      case 'WORKING_CARGO': tsUpdates.push('cargo_commenced_at = NOW()'); break
      case 'CARGO_COMPLETE': tsUpdates.push('cargo_completed_at = NOW()'); break
    }

    const row = await auditedMutation({
      tenantId,
      actor: ctx.actor,
      audit: {
        action: 'ACTIVE_SUB_STATUS_CHANGE',
        resourceType: 'port_call',
        resourceId: params.id,
        auditedTable: 'port_calls',
      },
      mutationSql:
        `UPDATE port_calls
         SET active_sub_status = $1::"ActiveSubStatus", updated_at = NOW()${tsUpdates.length ? ', ' + tsUpdates.join(', ') : ''}
         WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
         RETURNING id, phase::text, active_sub_status::text, port_call_number`,
      mutationParams: [body.activeSubStatus, params.id, tenantId],
    })

    return Response.json(row)
  }

  // Handle Phase 9 sub-status (settled) — schema's XOR refine guarantees we
  // reach here only when settledSubStatus is set and activeSubStatus is not.
  if (pc.phase !== 'SETTLED') {
    return Response.json(
      { error: 'Settled sub-status only applies to Phase 9 (Settled)' },
      { status: 422 }
    )
  }

  const row = await auditedMutation({
    tenantId,
    actor: ctx.actor,
    audit: {
      action: 'SETTLED_SUB_STATUS_CHANGE',
      resourceType: 'port_call',
      resourceId: params.id,
      auditedTable: 'port_calls',
    },
    mutationSql:
      `UPDATE port_calls
       SET settled_sub_status = $1::"SettledSubStatus", updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
       RETURNING id, phase::text, settled_sub_status::text, port_call_number`,
    mutationParams: [body.settledSubStatus, params.id, tenantId],
  })

  return Response.json(row)
}
