import { queryOne } from '@shipops/db'
import { NextRequest } from 'next/server'
import {
  DB_PHASES, DbPhase, PHASE_DISPLAY, VALID_TRANSITIONS,
  validatePhaseTransition, getPhaseTimestampColumn,
} from '@/lib/phase-transitions'

// PATCH /api/port-calls/[id]/phase
// Body: { phase: DbPhase (e.g. "APPOINTED"), userRole?: string }

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json() as { phase: string; userRole?: string }
  const { phase: targetPhase, userRole } = body

  // Validate phase value
  if (!targetPhase || !DB_PHASES.includes(targetPhase as DbPhase)) {
    return Response.json(
      { error: `Invalid phase. Valid values: ${DB_PHASES.join(', ')}` },
      { status: 400 }
    )
  }

  const target = targetPhase as DbPhase

  // Run prerequisite validation
  const result = await validatePhaseTransition(params.id, target, userRole)

  if (!result.allowed) {
    return Response.json(
      { error: result.reason, code: 'PHASE_BLOCKED' },
      { status: 422 }
    )
  }

  // Build UPDATE query
  const setClauses = [`phase = $1::"PortCallPhase"`, 'updated_at = NOW()']
  const values: unknown[] = [target]
  let paramIdx = 2

  // Set/clear sub-statuses
  setClauses.push(`active_sub_status = ${target === 'ACTIVE' ? `'AT_ANCHOR'::"ActiveSubStatus"` : 'NULL'}`)
  setClauses.push(`settled_sub_status = ${target === 'SETTLED' ? `'FULLY_SETTLED'::"SettledSubStatus"` : 'NULL'}`)

  // Auto-set phase timestamps
  const tsCol = getPhaseTimestampColumn(target)
  if (tsCol) {
    setClauses.push(`${tsCol} = NOW()`)
  }

  // Lock record when settled
  if (target === 'SETTLED') {
    setClauses.push('is_locked = true')
  }

  values.push(params.id)
  const idParam = '$' + paramIdx

  const row = await queryOne<{
    id: string; phase: string; port_call_number: string
    active_sub_status: string | null; settled_sub_status: string | null
    file_status: string; is_locked: boolean
  }>(
    `UPDATE port_calls
     SET ${setClauses.join(', ')}
     WHERE id = ${idParam} AND tenant_id = 'tenant-gca-001' AND deleted_at IS NULL
     RETURNING id, phase::text, port_call_number, active_sub_status::text, settled_sub_status::text, file_status, is_locked`,
    values
  )

  if (!row) {
    return Response.json({ error: 'Port call not found' }, { status: 404 })
  }

  return Response.json({
    ...row,
    phaseLabel: PHASE_DISPLAY[row.phase as DbPhase],
    warnings: result.warnings,
  })
}

// GET /api/port-calls/[id]/phase
// Returns current phase info + available transitions with prerequisite status

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const pc = await queryOne<{
    id: string; phase: string; file_status: string
    active_sub_status: string | null; settled_sub_status: string | null
    port_call_number: string
  }>(
    `SELECT id, phase::text AS phase, file_status, active_sub_status::text, settled_sub_status::text, port_call_number
     FROM port_calls WHERE id = $1 AND tenant_id = 'tenant-gca-001' AND deleted_at IS NULL`,
    [params.id]
  )

  if (!pc) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const currentPhase = pc.phase as DbPhase
  const { VALID_TRANSITIONS } = await import('@/lib/phase-transitions')
  const forwardTransitions = VALID_TRANSITIONS[currentPhase] || []

  // Check prerequisites for each possible next phase
  const availableTransitions = await Promise.all(
    forwardTransitions
      .filter(p => p !== currentPhase) // Skip self-loop display for FDA
      .map(async (phase) => {
        const result = await validatePhaseTransition(params.id, phase)
        return {
          phase,
          label: PHASE_DISPLAY[phase],
          allowed: result.allowed,
          reason: result.reason,
          warnings: result.warnings,
        }
      })
  )

  return Response.json({
    portCallId: pc.id,
    portCallNumber: pc.port_call_number,
    currentPhase: pc.phase,
    currentPhaseLabel: PHASE_DISPLAY[currentPhase],
    fileStatus: pc.file_status,
    activeSubStatus: pc.active_sub_status,
    settledSubStatus: pc.settled_sub_status,
    availableTransitions,
  })
}
