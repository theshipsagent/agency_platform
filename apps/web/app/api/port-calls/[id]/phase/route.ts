import { tenantQueryOne, auditedMutation } from '@shipops/db'
import { NextRequest } from 'next/server'
import { PhaseTransitionBodySchema } from '@shipops/shared/validation'
import {
  DbPhase, PHASE_DISPLAY, VALID_TRANSITIONS,
  validatePhaseTransition, getPhaseTimestampColumn,
} from '@/lib/phase-transitions'
import { getRequestContext, getTenantId } from '@/lib/api/auth'
import { parseBody } from '@/lib/api/parse'

// PATCH /api/port-calls/[id]/phase
// Body: { phase: PortCallPhase, userRole?: string } — see schema.

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getRequestContext()
  const parsed = parseBody(PhaseTransitionBodySchema, await req.json())
  if (!parsed.ok) return parsed.response
  const { phase: targetPhase, userRole } = parsed.data
  // The schema enforces phase ∈ PortCallPhase — old DB_PHASES.includes runtime
  // check is gone. PortCallPhase enum is the source of truth via z.nativeEnum.
  const target = targetPhase as DbPhase

  // Run prerequisite validation (tenant-scoped)
  const result = await validatePhaseTransition(ctx.tenantId, params.id, target, userRole)

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
  paramIdx++
  values.push(ctx.tenantId)
  const tenantParam = '$' + paramIdx

  // Audited write: the helper captures `before` from port_calls.* via
  // row_to_json (full prior snapshot) and `after` from this RETURNING clause
  // (the columns the route exposes). Both are written atomically with the
  // audit_logs INSERT in a single transaction.
  const row = await auditedMutation<{
    id: string; phase: string; port_call_number: string
    active_sub_status: string | null; settled_sub_status: string | null
    file_status: string; is_locked: boolean
  }>({
    tenantId: ctx.tenantId,
    actor: ctx.actor,
    audit: {
      action: 'PHASE_TRANSITION',
      resourceType: 'port_call',
      resourceId: params.id,
      auditedTable: 'port_calls',
    },
    mutationSql:
      `UPDATE port_calls
       SET ${setClauses.join(', ')}
       WHERE id = ${idParam} AND tenant_id = ${tenantParam} AND deleted_at IS NULL
       RETURNING id, phase::text, port_call_number, active_sub_status::text, settled_sub_status::text, file_status, is_locked`,
    mutationParams: values,
  })

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
  const tenantId = await getTenantId()
  const pc = await tenantQueryOne<{
    id: string; phase: string; file_status: string
    active_sub_status: string | null; settled_sub_status: string | null
    port_call_number: string
  }>(
    tenantId,
    `SELECT id, phase::text AS phase, file_status, active_sub_status::text, settled_sub_status::text, port_call_number
     FROM port_calls WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [params.id, tenantId]
  )

  if (!pc) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const currentPhase = pc.phase as DbPhase
  const forwardTransitions = VALID_TRANSITIONS[currentPhase] || []

  // Check prerequisites for each possible next phase
  const availableTransitions = await Promise.all(
    forwardTransitions
      .filter(p => p !== currentPhase) // Skip self-loop display for FDA
      .map(async (phase) => {
        const result = await validatePhaseTransition(tenantId, params.id, phase)
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
