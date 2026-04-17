import { query, queryOne } from '@shipops/db'
import { ROLE_CAN_BACKWARD_TRANSITION } from '@shipops/shared/constants'

// ─── DB Phase Enum Values (match Postgres "PortCallPhase" enum) ──────────────

export const DB_PHASES = [
  'PROFORMA_ESTIMATED',
  'AWAITING_APPOINTMENT',
  'APPOINTED',
  'ACTIVE',
  'SAILED',
  'COMPLETED',
  'PROCESSING_FDA',
  'AWAITING_PAYMENT',
  'SETTLED',
] as const

export type DbPhase = (typeof DB_PHASES)[number]

export const PHASE_DISPLAY: Record<DbPhase, string> = {
  PROFORMA_ESTIMATED: 'Proforma Estimated',
  AWAITING_APPOINTMENT: 'Awaiting Appointment',
  APPOINTED: 'Appointed',
  ACTIVE: 'Active Port Call',
  SAILED: 'Sailed Port Call',
  COMPLETED: 'Completed Port Call',
  PROCESSING_FDA: 'Processing FDA',
  AWAITING_PAYMENT: 'Awaiting Payment',
  SETTLED: 'Settled',
}

// Phase ordering for forward/backward comparison
const PHASE_ORDER: Record<DbPhase, number> = {
  PROFORMA_ESTIMATED: 1,
  AWAITING_APPOINTMENT: 2,
  APPOINTED: 3,
  ACTIVE: 4,
  SAILED: 5,
  COMPLETED: 6,
  PROCESSING_FDA: 7,
  AWAITING_PAYMENT: 8,
  SETTLED: 9,
}

// Valid forward transitions (using DB enum strings)
export const VALID_TRANSITIONS: Record<DbPhase, DbPhase[]> = {
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
  phase: DbPhase
  file_status: string
  active_sub_status: string | null
  settled_sub_status: string | null
}

// ─── Prerequisite Checks ─────────────────────────────────────────────────────

async function checkAwaitingAppointment(portCallId: string): Promise<string | null> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM expenses WHERE port_call_id = $1 AND deleted_at IS NULL`,
    [portCallId]
  )
  if (!row || parseInt(row.count) === 0) {
    return 'At least one proforma expense line must exist before sending to principal'
  }
  return null
}

async function checkActive(portCallId: string): Promise<string | null> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM timeline_events
     WHERE port_call_id = $1
       AND event_type IN ('ARRIVED_PILOT_STATION', 'NOR_TENDERED', 'ALL_FAST')
       AND deleted_at IS NULL
     LIMIT 1`,
    [portCallId]
  )
  if (!row) {
    return 'Vessel arrival event must be logged (Arrived Pilot Station, NOR Tendered, or All Fast)'
  }
  return null
}

async function checkSailed(portCallId: string): Promise<string | null> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM timeline_events
     WHERE port_call_id = $1 AND event_type = 'SAILED' AND deleted_at IS NULL
     LIMIT 1`,
    [portCallId]
  )
  if (!row) {
    return 'Sailed event must be logged in timeline before marking as sailed'
  }
  return null
}

async function checkCompleted(portCallId: string): Promise<string | null> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM expenses
     WHERE port_call_id = $1
       AND status IN ('ESTIMATED', 'ACCRUED')
       AND deleted_at IS NULL`,
    [portCallId]
  )
  if (row && parseInt(row.count) > 0) {
    return `${row.count} expense line(s) still below Invoice Received status`
  }
  return null
}

async function checkProcessingFda(portCallId: string): Promise<string | null> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM expenses
     WHERE port_call_id = $1
       AND status NOT IN ('APPROVED', 'PAID')
       AND deleted_at IS NULL`,
    [portCallId]
  )
  if (row && parseInt(row.count) > 0) {
    return `${row.count} expense line(s) not yet approved — all must be Approved or Paid before rendering FDA`
  }
  return null
}

async function checkSettled(portCallId: string): Promise<string | null> {
  const funding = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS total FROM funding_records
     WHERE port_call_id = $1 AND status = 'RECEIVED' AND deleted_at IS NULL`,
    [portCallId]
  )
  const expenses = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(actual_amount), 0)::text AS total FROM expenses
     WHERE port_call_id = $1 AND deleted_at IS NULL`,
    [portCallId]
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

const PREREQUISITE_CHECKS: Partial<Record<DbPhase, (id: string) => Promise<string | null>>> = {
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
  portCallId: string,
  targetPhase: DbPhase,
  userRole?: string
): Promise<PhaseTransitionResult> {
  // 1. Fetch current port call state
  const pc = await queryOne<PortCallRow>(
    `SELECT id, phase::text AS phase, file_status, active_sub_status::text, settled_sub_status::text
     FROM port_calls WHERE id = $1 AND deleted_at IS NULL`,
    [portCallId]
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
    return { allowed: false, reason: `Port call is already in ${PHASE_DISPLAY[currentPhase]}` }
  }

  // 4. Backward transition
  if (PHASE_ORDER[targetPhase] < PHASE_ORDER[currentPhase]) {
    if (!userRole || !ROLE_CAN_BACKWARD_TRANSITION.includes(userRole as any)) {
      return { allowed: false, reason: 'Backward phase transitions require Manager or Admin role' }
    }
    return {
      allowed: true,
      warnings: [`Rolling back from ${PHASE_DISPLAY[currentPhase]} to ${PHASE_DISPLAY[targetPhase]}`],
    }
  }

  // 5. Valid forward transitions
  const allowed = VALID_TRANSITIONS[currentPhase]
  if (!allowed?.includes(targetPhase)) {
    const allowedLabels = allowed?.map(p => PHASE_DISPLAY[p]).join(', ') || 'none'
    return {
      allowed: false,
      reason: `Cannot transition from ${PHASE_DISPLAY[currentPhase]} to ${PHASE_DISPLAY[targetPhase]}. Allowed: ${allowedLabels}`,
    }
  }

  // 6. Prerequisites
  const check = PREREQUISITE_CHECKS[targetPhase]
  if (check) {
    const blocker = await check(portCallId)
    if (blocker) {
      return { allowed: false, reason: blocker }
    }
  }

  // 7. Warnings
  const warnings: string[] = []
  if (targetPhase === 'ACTIVE') {
    const funding = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM funding_records
       WHERE port_call_id = $1 AND status = 'RECEIVED' AND deleted_at IS NULL`,
      [portCallId]
    )
    if (!funding || parseInt(funding.count) === 0) {
      warnings.push('No funding received yet — consider requesting funds before going active')
    }
  }

  return { allowed: true, warnings: warnings.length > 0 ? warnings : undefined }
}

// ─── Phase Timestamp Columns ─────────────────────────────────────────────────

export function getPhaseTimestampColumn(phase: DbPhase): string | null {
  switch (phase) {
    case 'SAILED': return 'sailed_at'
    case 'SETTLED': return 'settled_at'
    default: return null
  }
}
