/**
 * Audit trail smoke test (S2 analogue of verify-tenant-isolation.ts).
 *
 * Proves that `auditedMutation(...)`:
 *   1. Actually executes the wrapped UPDATE (the row changes in the DB).
 *   2. Atomically writes a matching `audit_logs` row with:
 *      - the right tenant_id, user_id, action, resource_type, resource_id
 *      - a non-null `before` jsonb capturing the prior state
 *      - a non-null `after` jsonb capturing the post-mutation state
 *   3. Rolls everything back if the mutation throws — no orphan audit rows,
 *      no half-applied writes.
 *
 * Strategy: pick a real seeded port_call, do a no-op UPDATE that touches
 * `updated_at` only (so we can revert it cleanly), and assert on the
 * audit_logs row. A second test deliberately throws inside the helper and
 * asserts that NO audit row was written.
 *
 * Run:
 *   pnpm --filter @shipops/db db:verify-audit-trail
 */
import { auditedMutation } from '../src/audit'
import { pool, tenantQueryOne, unscopedQuery } from '../src/client'

const REAL_TENANT = 'tenant-gca-001'
const SEED_USER_ID = 'user-hq-ceo'
const SEED_CLERK_USER_ID = 'seed_hq_ceo'

type AuditRow = {
  id: string
  tenant_id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  created_at: Date
}

let checks = 0
function check(label: string, condition: boolean, detail?: string): void {
  checks++
  const tag = condition ? '✓' : '✗'
  console.log(`  ${tag} ${label}${detail && !condition ? ` — ${detail}` : ''}`)
  if (!condition) {
    process.exitCode = 1
    throw new Error(`Assertion failed: ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

async function main(): Promise<void> {
  console.log('\nS2 audit trail smoke test')
  console.log('─────────────────────────')

  // Pick a seeded port call to use as the target.
  const target = await tenantQueryOne<{ id: string; updated_at: Date }>(
    REAL_TENANT,
    `SELECT id, updated_at FROM port_calls
      WHERE tenant_id = $1 AND deleted_at IS NULL
      ORDER BY created_at ASC LIMIT 1`,
    [REAL_TENANT]
  )
  if (!target) {
    throw new Error('No port_calls found in seed. Run db:seed first.')
  }
  console.log(`Target port_call: ${target.id}\n`)

  // ── Test 1: happy path ────────────────────────────────────────────────────
  console.log('Test 1 — happy path: audited UPDATE writes both row and audit_log')
  const beforeAuditCount = await pool.query(
    `SELECT COUNT(*)::int AS n FROM audit_logs WHERE resource_id = $1`,
    [target.id]
  )
  const startCount: number = (beforeAuditCount.rows[0] as { n: number }).n

  const updated = await auditedMutation<{ id: string; updated_at: Date }>({
    tenantId: REAL_TENANT,
    actor: { kind: 'user', userId: SEED_USER_ID, clerkUserId: SEED_CLERK_USER_ID },
    audit: {
      action: 'SMOKE_TEST_UPDATE',
      resourceType: 'port_call',
      resourceId: target.id,
      auditedTable: 'port_calls',
    },
    mutationSql:
      `UPDATE port_calls
          SET updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, updated_at`,
    mutationParams: [target.id, REAL_TENANT],
  })

  check('Mutation returned the updated row', updated !== null)
  check('Returned row has expected id', updated?.id === target.id)
  check(
    'updated_at advanced past the original',
    !!updated && new Date(updated.updated_at).getTime() > new Date(target.updated_at).getTime()
  )

  const afterAuditCount = await pool.query(
    `SELECT COUNT(*)::int AS n FROM audit_logs WHERE resource_id = $1`,
    [target.id]
  )
  const endCount: number = (afterAuditCount.rows[0] as { n: number }).n
  check(
    'Exactly one audit_logs row inserted',
    endCount === startCount + 1,
    `expected ${startCount + 1}, got ${endCount}`
  )

  const auditRows = await unscopedQuery<AuditRow>(
    `SELECT id, tenant_id, user_id, action, resource_type, resource_id, before, after, created_at
       FROM audit_logs
      WHERE resource_id = $1 AND action = 'SMOKE_TEST_UPDATE'
      ORDER BY created_at DESC LIMIT 1`,
    [target.id]
  )
  const audit = auditRows[0]
  check('Audit row exists with correct action', !!audit)
  check('tenant_id matches', audit?.tenant_id === REAL_TENANT)
  check('user_id matches the actor', audit?.user_id === SEED_USER_ID)
  check('resource_type = "port_call"', audit?.resource_type === 'port_call')
  check('resource_id matches', audit?.resource_id === target.id)
  check('before snapshot is populated', audit?.before !== null && audit?.before !== undefined)
  check(
    'before.id matches target',
    (audit?.before as { id?: string } | null | undefined)?.id === target.id
  )
  check('after snapshot is populated', audit?.after !== null && audit?.after !== undefined)
  check(
    'after.id matches target',
    (audit?.after as { id?: string } | null | undefined)?.id === target.id
  )

  // ── Test 2: rollback on mutation error ────────────────────────────────────
  console.log('\nTest 2 — rollback path: failed mutation writes NO audit row')
  const preFailCount = await pool.query(
    `SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'SMOKE_TEST_FAIL'`
  )
  const preFail: number = (preFailCount.rows[0] as { n: number }).n

  let threw = false
  try {
    await auditedMutation({
      tenantId: REAL_TENANT,
      actor: { kind: 'user', userId: SEED_USER_ID, clerkUserId: SEED_CLERK_USER_ID },
      audit: {
        action: 'SMOKE_TEST_FAIL',
        resourceType: 'port_call',
        resourceId: target.id,
        auditedTable: 'port_calls',
      },
      // Deliberately invalid SQL — should throw, helper should ROLLBACK.
      mutationSql: `UPDATE port_calls SET nonexistent_column = 'x' WHERE id = $1 RETURNING id`,
      mutationParams: [target.id],
    })
  } catch {
    threw = true
  }
  check('Helper propagated the SQL error', threw)

  const postFailCount = await pool.query(
    `SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'SMOKE_TEST_FAIL'`
  )
  const postFail: number = (postFailCount.rows[0] as { n: number }).n
  check(
    'No SMOKE_TEST_FAIL audit row was written (transaction rolled back)',
    postFail === preFail,
    `expected ${preFail}, got ${postFail}`
  )

  // ── Test 3: SystemActor rejection ─────────────────────────────────────────
  console.log('\nTest 3 — SystemActor is rejected with a typed error')
  let sysThrew = false
  try {
    await auditedMutation({
      tenantId: REAL_TENANT,
      actor: { kind: 'system', reason: 'smoke:test' },
      audit: {
        action: 'SMOKE_TEST_SYS',
        resourceType: 'port_call',
        resourceId: target.id,
        auditedTable: 'port_calls',
      },
      mutationSql: `UPDATE port_calls SET updated_at = NOW() WHERE id = $1 RETURNING id`,
      mutationParams: [target.id],
    })
  } catch (err) {
    sysThrew = err instanceof Error && /SystemActor not yet supported/.test(err.message)
  }
  check('SystemActor call threw the expected error', sysThrew)

  // ── Cleanup ───────────────────────────────────────────────────────────────
  // Remove the smoke-test audit rows so re-runs don't accumulate noise.
  await unscopedQuery(
    `DELETE FROM audit_logs WHERE action IN ('SMOKE_TEST_UPDATE', 'SMOKE_TEST_FAIL', 'SMOKE_TEST_SYS')`
  )

  console.log(`\n✓ All ${checks} audit-trail checks passed\n`)
}

main()
  .catch((err) => {
    console.error('\n✗ Audit trail smoke test FAILED')
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
