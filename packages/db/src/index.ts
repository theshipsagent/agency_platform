export {
  pool,
  // Tenant-scoped helpers — default for app code
  tenantQuery,
  tenantQueryOne,
  // Unscoped helpers — seed scripts and migrations only (CI-enforced)
  unscopedQuery,
  unscopedQueryOne,
} from './client'
export {
  // Audited mutation helper — S2 default for all writes from app code
  auditedMutation,
} from './audit'
export type {
  AuditActor,
  AuditUserActor,
  AuditSystemActor,
  AuditDescriptor,
  AuditedMutationInput,
} from './audit'
export { PrismaClient } from '@prisma/client'
export * from '@prisma/client'
