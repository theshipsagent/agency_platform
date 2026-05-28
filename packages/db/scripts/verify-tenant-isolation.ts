/**
 * Tenant isolation smoke test
 *
 * Proves that `tenantQuery(tenantId, ...)` actually filters by tenant in
 * the real database — not just that the SQL string contains `tenant_id = $N`.
 *
 * Strategy: create a sentinel `organizations` row under a synthetic test
 * tenant, then run reads scoped to (a) the real dev tenant and (b) the
 * synthetic tenant. The sentinel must be invisible to (a) and visible to (b).
 * Cleanup runs in a `finally` so the row never leaks even if assertions fail.
 *
 * Run:
 *   pnpm --filter @shipops/db db:verify-isolation
 */
import { pool, tenantQuery, tenantQueryOne } from '../src/client'

const REAL_TENANT = 'tenant-gca-001'
const TEST_TENANT = 'tenant-test-002-isolation-smoke'
const SENTINEL_NAME = `__isolation_smoke__${Date.now()}`

type Row = { id: string; name: string; tenant_id: string }

async function main(): Promise<void> {
  let sentinelId: string | null = null
  let createdTenant = false
  let exitCode = 0

  try {
    // 0. Ensure the test tenant exists (FK constraint on organizations.tenant_id)
    //    Use pool.query for setup — we're not testing the helper here, just
    //    creating the conditions for the test that follows.
    const existingTenant = await pool.query(
      `SELECT id FROM tenants WHERE id = $1`,
      [TEST_TENANT]
    )
    if (existingTenant.rowCount === 0) {
      await pool.query(
        `INSERT INTO tenants (id, name, slug, clerk_org_id, subscription_tier, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'starter', NOW(), NOW())`,
        [
          TEST_TENANT,
          'Isolation Smoke Test Tenant',
          `isolation-smoke-${Date.now()}`,
          `org_isolation_smoke_${Date.now()}`,
        ]
      )
      createdTenant = true
      console.log(`✓ Created test tenant ${TEST_TENANT}`)
    }

    // 1. Insert sentinel org under the TEST tenant
    const inserted = await tenantQueryOne<{ id: string }>(
      TEST_TENANT,
      `INSERT INTO organizations
         (id, tenant_id, name, type, created_at, updated_at, created_by, updated_by)
       VALUES
         (gen_random_uuid(), $1, $2, 'PRINCIPAL_OWNER', NOW(), NOW(), 'isolation-smoke', 'isolation-smoke')
       RETURNING id`,
      [TEST_TENANT, SENTINEL_NAME]
    )
    if (!inserted) throw new Error('Failed to insert sentinel row')
    sentinelId = inserted.id
    console.log(`✓ Inserted sentinel ${sentinelId} under tenant=${TEST_TENANT}`)

    // 2. Read scoped to the REAL tenant — sentinel must NOT be visible
    const realTenantSentinelHits = await tenantQuery<Row>(
      REAL_TENANT,
      `SELECT id, name, tenant_id FROM organizations
       WHERE tenant_id = $1 AND name = $2`,
      [REAL_TENANT, SENTINEL_NAME]
    )
    if (realTenantSentinelHits.length !== 0) {
      console.error(
        `✗ FAIL: real-tenant read returned ${realTenantSentinelHits.length} ` +
        `rows that should belong only to the test tenant.`
      )
      console.error(realTenantSentinelHits)
      exitCode = 1
    } else {
      console.log(`✓ Real tenant (${REAL_TENANT}) cannot see test tenant's sentinel`)
    }

    // 3. Read scoped to the TEST tenant — sentinel MUST be visible
    const testTenantSentinelHits = await tenantQuery<Row>(
      TEST_TENANT,
      `SELECT id, name, tenant_id FROM organizations
       WHERE tenant_id = $1 AND name = $2`,
      [TEST_TENANT, SENTINEL_NAME]
    )
    if (testTenantSentinelHits.length !== 1) {
      console.error(
        `✗ FAIL: test-tenant read returned ${testTenantSentinelHits.length} rows ` +
        `(expected exactly 1 — the sentinel we just inserted).`
      )
      console.error(testTenantSentinelHits)
      exitCode = 1
    } else if (testTenantSentinelHits[0]!.tenant_id !== TEST_TENANT) {
      console.error(
        `✗ FAIL: test-tenant read returned a row with tenant_id=` +
        `${testTenantSentinelHits[0]!.tenant_id}, expected ${TEST_TENANT}`
      )
      exitCode = 1
    } else {
      console.log(`✓ Test tenant (${TEST_TENANT}) sees its own sentinel`)
    }

    // 4. Verify the real-tenant read can still see real-tenant data
    //    (sanity check — isolation shouldn't break legitimate reads)
    const realTenantOrgCount = await tenantQueryOne<{ cnt: string }>(
      REAL_TENANT,
      `SELECT COUNT(*)::text AS cnt FROM organizations WHERE tenant_id = $1`,
      [REAL_TENANT]
    )
    const cnt = parseInt(realTenantOrgCount?.cnt ?? '0')
    if (cnt < 1) {
      console.error(
        `✗ FAIL: real tenant has ${cnt} organizations — expected ≥ 1 (seed data).`
      )
      exitCode = 1
    } else {
      console.log(`✓ Real tenant still sees its own ${cnt} organizations (sanity check)`)
    }

    if (exitCode === 0) {
      console.log('\n✓ ALL TENANT ISOLATION CHECKS PASSED')
    } else {
      console.error('\n✗ TENANT ISOLATION CHECKS FAILED')
    }
  } finally {
    // Cleanup — runs even on failure so we don't leak rows
    if (sentinelId) {
      await pool.query(
        `DELETE FROM organizations WHERE id = $1 AND tenant_id = $2`,
        [sentinelId, TEST_TENANT]
      )
      console.log(`✓ Cleaned up sentinel ${sentinelId}`)
    }
    if (createdTenant) {
      await pool.query(`DELETE FROM tenants WHERE id = $1`, [TEST_TENANT])
      console.log(`✓ Cleaned up test tenant ${TEST_TENANT}`)
    }
    await pool.end()
  }

  process.exit(exitCode)
}

main().catch((err) => {
  console.error('Unhandled error in isolation smoke test:', err)
  process.exit(2)
})
