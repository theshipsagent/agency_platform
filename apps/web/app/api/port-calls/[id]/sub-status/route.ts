import { queryOne } from '@shipops/db'
import { NextRequest } from 'next/server'
import { ActiveSubStatus, SettledSubStatus } from '@shipops/shared/enums'

// Valid sub-status transitions within Phase 4
const ACTIVE_SUB_TRANSITIONS: Record<string, string[]> = {
  AT_ANCHOR: ['BERTHED'],
  BERTHED: ['WORKING_CARGO', 'AT_ANCHOR'], // Can go back to anchor (shifted off berth)
  WORKING_CARGO: ['CARGO_COMPLETE', 'BERTHED'], // Rare: cargo ops suspended
  CARGO_COMPLETE: [], // Terminal — must transition to Phase 5 (Sailed)
}

const VALID_ACTIVE_SUBS = Object.keys(ActiveSubStatus) as string[]
const VALID_SETTLED_SUBS = Object.keys(SettledSubStatus) as string[]

// PATCH /api/port-calls/[id]/sub-status
// Body: { activeSubStatus?: string, settledSubStatus?: string }

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json() as {
    activeSubStatus?: string
    settledSubStatus?: string
  }

  // Fetch current state
  const pc = await queryOne<{
    id: string
    phase: string
    active_sub_status: string | null
    settled_sub_status: string | null
    file_status: string
  }>(
    `SELECT id, phase::text AS phase, active_sub_status::text, settled_sub_status::text, file_status
     FROM port_calls WHERE id = $1 AND tenant_id = 'tenant-gca-001' AND deleted_at IS NULL`,
    [params.id]
  )

  if (!pc) {
    return Response.json({ error: 'Port call not found' }, { status: 404 })
  }

  if (pc.file_status !== 'ACTIVE') {
    return Response.json({ error: 'Port call is not active' }, { status: 422 })
  }

  // Handle Phase 4 sub-status
  if (body.activeSubStatus) {
    if (pc.phase !== 'ACTIVE') {
      return Response.json(
        { error: 'Active sub-status only applies to Phase 4 (Active Port Call)' },
        { status: 422 }
      )
    }
    if (!VALID_ACTIVE_SUBS.includes(body.activeSubStatus)) {
      return Response.json({ error: `Invalid sub-status. Valid: ${VALID_ACTIVE_SUBS.join(', ')}` }, { status: 400 })
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

    const row = await queryOne(
      `UPDATE port_calls
       SET active_sub_status = $1::"ActiveSubStatus", updated_at = NOW()${tsUpdates.length ? ', ' + tsUpdates.join(', ') : ''}
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, phase::text, active_sub_status::text, port_call_number`,
      [body.activeSubStatus, params.id]
    )

    return Response.json(row)
  }

  // Handle Phase 9 sub-status
  if (body.settledSubStatus) {
    if (pc.phase !== 'SETTLED') {
      return Response.json(
        { error: 'Settled sub-status only applies to Phase 9 (Settled)' },
        { status: 422 }
      )
    }
    if (!VALID_SETTLED_SUBS.includes(body.settledSubStatus)) {
      return Response.json({ error: `Invalid sub-status. Valid: ${VALID_SETTLED_SUBS.join(', ')}` }, { status: 400 })
    }

    const row = await queryOne(
      `UPDATE port_calls
       SET settled_sub_status = $1::"SettledSubStatus", updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, phase::text, settled_sub_status::text, port_call_number`,
      [body.settledSubStatus, params.id]
    )

    return Response.json(row)
  }

  return Response.json({ error: 'Provide activeSubStatus or settledSubStatus' }, { status: 400 })
}
