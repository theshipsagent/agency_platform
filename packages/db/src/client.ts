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

// Typed query helper
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(sql, params)
  return result.rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

// Re-export PrismaClient type stubs for type compatibility (not instantiated)
export { PrismaClient } from '@prisma/client'
export * from '@prisma/client'
