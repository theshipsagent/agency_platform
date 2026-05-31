/**
 * Input validation smoke test (S2.5 analogue of verify-tenant-isolation.ts
 * and verify-audit-trail.ts).
 *
 * Pure in-process: no DB. Proves the route-body Zod schemas behave the way
 * the API contract requires:
 *   1. .strict() actually rejects unknown fields (catches "I dropped the
 *      .strict() during refactor" regressions).
 *   2. PortCallPhase validation accepts string keys, not numbers (catches
 *      a regression of the z.nativeEnum → z.enum fix made in S2.5).
 *   3. The sub-status XOR refine accepts exactly one of activeSubStatus /
 *      settledSubStatus and rejects zero or both.
 *   4. The required fields on CreatePortCallBodySchema actually fail when
 *      missing (would catch someone making a critical field .optional()).
 *
 * Run:
 *   pnpm --filter @shipops/shared verify-input-validation
 */
import {
  CreateVesselBodySchema,
  RegisterPortBodySchema,
  CreatePortCallBodySchema,
  UpdatePortCallFileStatusBodySchema,
  PhaseTransitionBodySchema,
  UpdateSubStatusBodySchema,
} from '../src/validation'

let checks = 0
function check(label: string, condition: boolean, detail?: string): void {
  checks++
  const tag = condition ? '✓' : '✗'
  console.log(`  ${tag} ${label}${detail && !condition ? ` — ${detail}` : ''}`)
  if (!condition) {
    process.exitCode = 1
    throw new Error(`Assertion failed: ${label}`)
  }
}

function expectFail<T>(schema: { safeParse: (x: unknown) => { success: boolean } }, input: T): boolean {
  return !schema.safeParse(input).success
}
function expectPass<T>(schema: { safeParse: (x: unknown) => { success: boolean } }, input: T): boolean {
  return schema.safeParse(input).success
}

console.log('\nS2.5 input validation smoke test')
console.log('────────────────────────────────')

// ── Test 1: .strict() rejects unknown fields ────────────────────────────────
console.log('Test 1 — .strict() rejects unknown fields')
check(
  'CreateVesselBodySchema rejects extra { unknownField }',
  expectFail(CreateVesselBodySchema, { imo: '1234567', unknownField: 'x' }),
)
check(
  'CreateVesselBodySchema accepts the canonical { imo } shape',
  expectPass(CreateVesselBodySchema, { imo: '1234567' }),
)
check(
  'UpdatePortCallFileStatusBodySchema rejects extra { unknownField }',
  expectFail(UpdatePortCallFileStatusBodySchema, { fileStatus: 'ACTIVE', unknownField: 'x' }),
)

// ── Test 2: PortCallPhase string keys, not numbers ──────────────────────────
console.log('\nTest 2 — PhaseTransitionBodySchema uses string keys, not numbers')
check(
  'Accepts the string key "APPOINTED"',
  expectPass(PhaseTransitionBodySchema, { phase: 'APPOINTED' }),
)
check(
  'Rejects the numeric value 3 (would mismatch Postgres enum wire format)',
  expectFail(PhaseTransitionBodySchema, { phase: 3 }),
)
check(
  'Rejects an unknown phase string',
  expectFail(PhaseTransitionBodySchema, { phase: 'NOT_A_PHASE' }),
)

// ── Test 3: sub-status XOR refine ────────────────────────────────────────────
console.log('\nTest 3 — UpdateSubStatusBodySchema enforces XOR')
check(
  'Accepts { activeSubStatus: "BERTHED" } alone',
  expectPass(UpdateSubStatusBodySchema, { activeSubStatus: 'BERTHED' }),
)
check(
  'Accepts { settledSubStatus: "FULLY_SETTLED" } alone',
  expectPass(UpdateSubStatusBodySchema, { settledSubStatus: 'FULLY_SETTLED' }),
)
check(
  'Rejects empty object {} (neither provided)',
  expectFail(UpdateSubStatusBodySchema, {}),
)
check(
  'Rejects both provided at once',
  expectFail(UpdateSubStatusBodySchema, {
    activeSubStatus: 'BERTHED',
    settledSubStatus: 'FULLY_SETTLED',
  }),
)

// ── Test 4: required fields ──────────────────────────────────────────────────
console.log('\nTest 4 — CreatePortCallBodySchema enforces required fields')
const validCreate = {
  portCallType: 'LOAD',
  serviceScope: ['FULL_AGENCY'],
  vesselId: '00000000-0000-0000-0000-000000000001',
  principalId: '00000000-0000-0000-0000-000000000002',
  portId: '00000000-0000-0000-0000-000000000003',
  officeId: '00000000-0000-0000-0000-000000000004',
}
check('Accepts the minimal required shape', expectPass(CreatePortCallBodySchema, validCreate))

const { vesselId: _v, ...missingVessel } = validCreate
check(
  'Rejects when vesselId is missing',
  expectFail(CreatePortCallBodySchema, missingVessel),
)

const { officeId: _o, ...missingOffice } = validCreate
check(
  'Rejects when officeId is missing',
  expectFail(CreatePortCallBodySchema, missingOffice),
)

check(
  'Rejects an empty serviceScope array (min(1))',
  expectFail(CreatePortCallBodySchema, { ...validCreate, serviceScope: [] }),
)

check(
  'Rejects a non-UUID vesselId',
  expectFail(CreatePortCallBodySchema, { ...validCreate, vesselId: 'not-a-uuid' }),
)

// ── Test 5: ports route 400-shape ────────────────────────────────────────────
console.log('\nTest 5 — RegisterPortBodySchema field constraints')
check(
  'Accepts { cbpCode: "1234" } alone',
  expectPass(RegisterPortBodySchema, { cbpCode: '1234' }),
)
check(
  'Accepts { scheduleKCode: "12345" } alone',
  expectPass(RegisterPortBodySchema, { scheduleKCode: '12345' }),
)
check(
  'Rejects unknown field { something: "x" }',
  expectFail(RegisterPortBodySchema, { something: 'x' }),
)

console.log(`\n✓ All ${checks} input-validation checks passed\n`)
