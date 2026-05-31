import { tenantQueryOne } from '@shipops/db'
import { ROLE_CAN_BACKWARD_TRANSITION } from '@shipops/shared/constants'
import {
  PortCallPhase,
  PHASE_LABELS,
  PHASE_ORDINAL,
} from '@shipops/shared/enums'

// Valid forward transitions (using DB enum strings)
export const VALID_TRANSITIONS: Record<PortCallPhase, PortCallPhase[]> = {
  PROFORMA_ESTIMATED: ['AWAITING_APPOINTMENT', 'APPOINTED'], // Can skip to Appointed
  AWAITING_APPOINTMENT: ['APPOINTED'],
  APPOINTED: ['ACTIVE'],
  ACTIVE: ['SAILED'],
  SAILED: ['COMPLETED'],
  COMPLETED: ['PROCESSING_FDA'],
  PROCESSING_FDA: ['AWAITING_PAYMENT', 'PROCESSING_FDA'], // FDA can loop
  AWAITING_PAYMENT: ['SETTLED'],
  SETTLED: [], // Terminal
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PhaseTransitionResult {
  allowed: boolean
  reason?: string | undefined
  warnings?: string[] | undefined
}

interface PortCallRow {
  id: string
  phase: PortCallPhase
  file_status: string
  active_sub_status: string | null
  settled_sub_status: string | null
}

// ─── Prerequisite Checks ─────────────────────────────────────────────────────
// Each check takes tenantId so it can scope its SQL to the right tenant.
// Previously these queries filtered only by port_call_id — a cross-tenant info
// leak if a caller passed a portCallId from a different tenant. Fixed in S1.

async function checkAwaitingAppointment(tenantId: string, portCallId: string): Promise<string | null> {
  const row = await tenantQueryOne<{ count: string }>(
    tenantId,
    `SELECT COUNT(*)::text AS count FROM expenses
     WHERE port_call_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [portCallId, tenantId]
  )
  if (!row || parseInt(row.count) === 0) {
    return 'At least one proforma expense line must exist before sending to principal'
  }
  return null
}

async function checkActive(tenantId: string, portCallId: string): Promise<string | null> {
  const row = await tenantQueryOne<{ id: string }>(
    tenantId,
    `SELECT id FROM timeline_events
     WHERE port_call_id = $1 AND tenant_id = $2
       AND event_type IN ('ARRIVED_PILOT_STATION', 'NOR_TENDERED', 'ALL_FAST')
       AND deleted_at IS NULL
     LIMIT 1`,
    [portCallId, tenantId]
  )
  if (!row) {
    return 'Vessel arrival event must be logged (Arrived Pilot Station, NOR Tendered, or All Fast)'
  }
  return null
}

async function checkSailed(tenantId: string, portCallId: string): Promise<string | null> {
  const row = await tenantQueryOne<{ id: string }>(
    tenantId,
    `SELECT id FROM timeline_events
     WHERE port_call_id = $1 AND tenant_id = $2
       AND event_type = 'SAILED' AND deleted_at IS NULL
     LIMIT 1`,
    [portCallId, tenantId]
  )
  if (!row) {
    return 'Sailed event must be logged in timeline before marking as sailed'
  }
  return null
}

async function checkCompleted(tenantId: string, portCallId: string): Promise<string | null> {
  const row = await tenantQueryOne<{ count: string }>(
    tenantId,
    `SELECT COUNT(*)::text AS count FROM expenses
     WHERE port_call_id = $1 AND tenant_id = $2
       AND status IN ('ESTIMATED', 'ACCRUED')
       AND deleted_at IS NULL`,
    [portCallId, tenantId]
  )
  if (row && parseInt(row.count) > 0) {
    return `${row.count} expense line(s) still below Invoice Received status`
  }
  return null
}

async function checkProcessingFda(tenantId: string, portCallId: string): Promise<string | null> {
  const row = await tenantQueryOne<{ count: string }>(
    tenantId,
    `SELECT COUNT(*)::text AS count FROM expenses
     WHERE port_call_id = $1 AND tenant_id = $2
       AND status NOT IN ('APPROVED', 'PAID')
       AND deleted_at IS NULL`,
    [portCallId, tenantId]
  )
  if (row && parseInt(row.count) > 0) {
    return `${row.count} expense line(s) not yet approved — all must be Approved or Paid before rendering FDA`
  }
  return null
}

async function checkSettled(tenantId: string, portCallId: string): Promise<string | null> {
  const funding = await tenantQueryOne<{ total: string }>(
    tenantId,
    `SELECT COALESCE(SUM(amount), 0)::text AS total FROM funding_records
     WHERE port_call_id = $1 AND tenant_id = $2
       AND status = 'RECEIVED' AND deleted_at IS NULL`,
    [portCallId, tenantId]
  )
  const expenses = await tenantQueryOne<{ total: string }>(
    tenantId,
    `SELECT COALESCE(SUM(actual_amount), 0)::text AS total FROM expenses
     WHERE port_call_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [portCallId, tenantId]
  )
  const funded = parseInt(funding?.total ?? '0')
  const actual = parseInt(expenses?.total ?? '0')
  const balance = funded - actual

  if (balance !== 0) {
    const formatted = (Math.abs(balance) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    const direction = balance > 0 ? 'overfunded' : 'underfunded'
    return `Balance is not zero — ${direction} by ${formatted}. All AR must be collected and AP paid.`
  }
  return null
}

type PrerequisiteCheck = (tenantId: string, portCallId: string) => Promise<string | null>

const PREREQUISITE_CHECKS: Partial<Record<PortCallPhase, PrerequisiteCheck>> = {
  AWAITING_APPOINTMENT: checkAwaitingAppointment,
  APPOINTED: async () => null, // Operator action = confirmation
  ACTIVE: checkActive,
  SAILED: checkSailed,
  COMPLETED: checkCompleted,
  PROCESSING_FDA: checkProcessingFda,
  AWAITING_PAYMENT: async () => null, // Operator confirms principal approved
  SETTLED: checkSettled,
}

// ─── Main Validation ─────────────────────────────────────────────────────────

export async function validatePhaseTransition(
  tenantId: string,
  portCallId: string,
  targetPhase: PortCallPhase,
  userRole?: string
): Promise<PhaseTransitionResult> {
  // 1. Fetch current port call state (tenant-scoped)
  const pc = await tenantQueryOne<PortCallRow>(
    tenantId,
    `SELECT id, phase::text AS phase, file_status, active_sub_status::text, settled_sub_status::text
     FROM port_calls WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [portCallId, tenantId]
  )

  if (!pc) {
    return { allowed: false, reason: 'Port call not found' }
  }

  // 2. File status checks
  if (pc.file_status === 'CANCELLED') {
    return { allowed: false, reason: 'Cannot transition a cancelled port call' }
  }
  if (pc.file_status === 'ON_HOLD') {
    return { allowed: false, reason: 'Port call is on hold — release hold before transitioning' }
  }

  const currentPhase = pc.phase

  // 3. Same phase
  if (currentPhase === targetPhase) {
    return { allowed: false, reason: `Port call is already in ${PHASE_LABELS[currentPhase]}` }
  }

  // 4. Backward transition
  if (PHASE_ORDINAL[targetPhase] < PHASE_ORDINAL[currentPhase]) {
    if (!userRole || !ROLE_CAN_BACKWARD_TRANSITION.includes(userRole as any)) {
      return { allowed: false, reason: 'Backward phase transitions require Manager or Admin role' }
    }
    return {
      allowed: true,
      warnings: [`Rolling back from ${PHASE_LABELS[currentPhase]} to ${PHASE_LABELS[targetPhase]}`],
    }
  }

  // 5. Valid forward transitions
  const allowed = VALID_TRANSITIONS[currentPhase]
  if (!allowed?.includes(targetPhase)) {
    const allowedLabels = allowed?.map(p => PHASE_LABELS[p]).join(', ') || 'none'
    return {
      allowed: false,
      reason: `Cannot transition from ${PHASE_LABELS[currentPhase]} to ${PHASE_LABELS[targetPhase]}. Allowed: ${allowedLabels}`,
    }
  }

  // 6. Prerequisites
  const check = PREREQUISITE_CHECKS[targetPhase]
  if (check) {
    const blocker = await check(tenantId, portCallId)
    if (blocker) {
      return { allowed: false, reason: blocker }
    }
  }

  // 7. Warnings
  const warnings: string[] = []
  if (targetPhase === 'ACTIVE') {
    const funding = await tenantQueryOne<{ count: string }>(
      tenantId,
      `SELECT COUNT(*)::text AS count FROM funding_records
       WHERE port_call_id = $1 AND tenant_id = $2
         AND status = 'RECEIVED' AND deleted_at IS NULL`,
      [portCallId, tenantId]
    )
    if (!funding || parseInt(funding.count) === 0) {
      warnings.push('No funding received yet — consider requesting funds before going active')
    }
  }

  return { allowed: true, warnings: warnings.length > 0 ? warnings : undefined }
}

// ─── Phase Timestamp Columns ─────────────────────────────────────────────────

export function getPhaseTimestampColumn(phase: PortCallPhase): string | null {
  switch (phase) {
    case 'SAILED': return 'sailed_at'
    case 'SETTLED': return 'settled_at'
    default: return null
  }
}
