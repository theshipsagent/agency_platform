import { Pool } from 'pg'

// Direct pg pool — bypasses Prisma's P1010 permission check bug with PG16
// Prisma ORM will be re-integrated once production DB is on Azure PostgreSQL

const globalForPool = globalThis as unknown as { pgPool: Pool }

export const pool =
  globalForPool.pgPool ??
  new Pool({
    connectionString: process.env['DATABASE_URL'] ?? 'postgresql://shipops:shipops@localhost:5433/shipops',
    max: 10,
  })

if (process.env.NODE_ENV !== 'production') globalForPool.pgPool = pool

// ─────────────────────────────────────────────────────────────────────────────
// Tenant-aware query helpers
//
// `tenantQuery` / `tenantQueryOne` are the default for all app code. They take
// tenantId as a required first argument — TypeScript will not let you call
// them without it. The developer is responsible for using $-params in the SQL
// (e.g. `WHERE tenant_id = $1` with tenantId in the params array). The helper
// does NOT auto-inject WHERE clauses — that path is too fragile for INSERTs,
// UPDATEs, and joins. The guarantee is structural: "you cannot call this
// without thinking about tenantId."
//
// `unscopedQuery` / `unscopedQueryOne` exist for the narrow cases that have no
// tenant context: seed scripts, migrations, and infra-level health checks.
// Using them in `apps/` is a CI failure (see .github/workflows/ci.yml).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs a tenant-scoped query. The caller MUST reference tenantId in the SQL
 * via $-parameter — typically `WHERE tenant_id = $1`. This helper does not
 * rewrite SQL; it enforces a thinking-about-tenancy discipline at the type
 * boundary.
 *
 * @example
 *   const tenantId = await getTenantId()
 *   const rows = await tenantQuery<PortCall>(tenantId,
 *     `SELECT * FROM port_calls WHERE tenant_id = $1 AND deleted_at IS NULL`,
 *     [tenantId]
 *   )
 */
export async function tenantQuery<T = Record<string, unknown>>(
  tenantId: string,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await pool.query(sql, params)
  return result.rows as T[]
}

/** Tenant-scoped single-row helper. See {@link tenantQuery}. */
export async function tenantQueryOne<T = Record<string, unknown>>(
  tenantId: string,
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await tenantQuery<T>(tenantId, sql, params)
  return rows[0] ?? null
}

/**
 * UNSAFE: runs a query with no tenant scoping. Reserved for seed scripts,
 * Prisma migrations, and infra-level health checks. Using this from `apps/`
 * code will fail CI.
 *
 * If you're tempted to use this in a route handler, you almost certainly want
 * `tenantQuery` instead.
 */
export async function unscopedQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(sql, params)
  return result.rows as T[]
}

/** UNSAFE single-row variant. See {@link unscopedQuery}. */
export async function unscopedQueryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await unscopedQuery<T>(sql, params)
  return rows[0] ?? null
}

// Re-export PrismaClient type stubs for type compatibility (not instantiated)
export { PrismaClient } from '@prisma/client'
export * from '@prisma/client'
