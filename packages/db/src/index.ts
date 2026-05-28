export {
  pool,
  // Tenant-scoped helpers — default for app code
  tenantQuery,
  tenantQueryOne,
  // Unscoped helpers — seed scripts and migrations only (CI-enforced)
  unscopedQuery,
  unscopedQueryOne,
} from './client'
export { PrismaClient } from '@prisma/client'
export * from '@prisma/client'
