/**
 * Audited mutation helper — S2's structural analogue of S1's `tenantQuery`.
 *
 * Every audited write must go through this helper. The grep-guard at
 * scripts/ci-audit-trail-guard.sh fails the build if a raw INSERT/UPDATE/DELETE
 * appears in apps/web/app/api outside this wrapper.
 *
 * Atomicity: the `before` snapshot, the mutation, and the audit row INSERT
 * all run inside a single `BEGIN/COMMIT/ROLLBACK` block on one PoolClient.
 * If the mutation throws, the audit row never lands either — there is no
 * world in which an audit row exists for a write that rolled back, or a
 * write succeeds with no audit row.
 *
 * What this helper does NOT solve:
 *   - Multi-table atomic writes (port_call + cargo_lines in one transaction).
 *     Each `auditedMutation` call is its own transaction. Routes that need
 *     atomic multi-row writes have to be refactored separately — this is a
 *     pre-existing gap, not one S2 introduced.
 *   - Async-actor writes (cron, webhook). `audit_logs.user_id` is NOT NULL
 *     with an FK; SystemActor calls fail with a typed error until we seed
 *     a system sentinel user.
 */
import type { PoolClient } from 'pg'
import { pool } from './client'

/**
 * Actor identity for the write. Mirrors the type in apps/web/lib/api/auth.ts —
 * duplicated here so packages/db has no dependency on the web app, but kept
 * structurally compatible so a RequestContext.actor can be passed directly.
 */
export type AuditUserActor = {
  kind: 'user'
  userId: string
  clerkUserId: string
}

export type AuditSystemActor = {
  kind: 'system'
  reason: string
}

export type AuditActor = AuditUserActor | AuditSystemActor

/** What this write was, in audit-row terms. */
export type AuditDescriptor = {
  /** Free-form verb. Convention: SCREAMING_SNAKE. e.g. 'CREATE', 'UPDATE', 'PHASE_TRANSITION', 'SUB_STATUS_CHANGE'. */
  action: string
  /** Logical entity type. Convention: snake_case singular. e.g. 'port_call', 'vessel', 'expense'. */
  resourceType: string
  /** The id of the row being mutated. For INSERTs, the id about to be created (pass it explicitly via gen_random_uuid in your SQL, or generate before calling). */
  resourceId: string
  /**
   * The physical table to snapshot for `before`. Omit for INSERT (no prior
   * row exists). Required for UPDATE/DELETE — the helper runs
   * `SELECT row_to_json(t) FROM <table> t WHERE id = $1 AND tenant_id = $2`
   * to capture the pre-mutation state.
   */
  auditedTable?: string
}

export type AuditedMutationInput = {
  /** Tenant scope — must match the WHERE clause in your mutation SQL. */
  tenantId: string
  /** Who is making the write. Only UserActor is supported in S2; SystemActor throws. */
  actor: AuditActor
  /** Audit metadata. */
  audit: AuditDescriptor
  /** The mutation SQL. MUST include `RETURNING row_to_json(<alias>)` or `RETURNING *` so `after` can be captured. */
  mutationSql: string
  /** Parameters for the mutation SQL. */
  mutationParams: unknown[]
}

/**
 * Runs a tenant-scoped mutation and writes a matching audit row atomically.
 *
 * @returns The first row from the mutation's RETURNING clause, typed as Row,
 *   or null if no row was returned (e.g. WHERE clause didn't match).
 * @throws If `actor.kind !== 'user'` (SystemActor not yet supported), if the
 *   mutation throws, or if the before-snapshot fetch fails. The transaction
 *   rolls back on any error — no partial state is committed.
 */
export async function auditedMutation<Row = Record<string, unknown>>(
  input: AuditedMutationInput
): Promise<Row | null> {
  const { tenantId, actor, audit, mutationSql, mutationParams } = input

  if (actor.kind !== 'user') {
    throw new Error(
      `auditedMutation: SystemActor not yet supported (reason: ${actor.reason}). ` +
      'audit_logs.user_id is NOT NULL with FK to users.id; a system sentinel user must be seeded first.'
    )
  }

  const client: PoolClient = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Capture `before` snapshot (skip for INSERTs).
    let before: Record<string, unknown> | null = null
    if (audit.auditedTable) {
      // Table name comes from a small enum of caller-controlled string
      // literals — not user input. Still, the SELECT uses parameterized
      // tenant_id + id to prevent any data-driven injection.
      const beforeResult = await client.query(
        `SELECT row_to_json(t) AS row
           FROM ${audit.auditedTable} t
          WHERE t.id = $1
            AND t.tenant_id = $2`,
        [audit.resourceId, tenantId]
      )
      before = (beforeResult.rows[0]?.row as Record<string, unknown>) ?? null
    }

    // 2. Run the mutation. Caller is responsible for tenant_id in the WHERE
    //    and for RETURNING the row so we can snapshot `after`.
    const mutationResult = await client.query(mutationSql, mutationParams)
    const after = (mutationResult.rows[0] as Record<string, unknown> | undefined) ?? null

    // If the mutation matched nothing (e.g. cross-tenant id), don't write an
    // audit row — there's nothing audit-worthy to record.
    if (!after) {
      await client.query('ROLLBACK')
      return null
    }

    // 3. Write the audit row.
    await client.query(
      `INSERT INTO audit_logs
         (id, tenant_id, user_id, action, resource_type, resource_id, before, after, created_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        tenantId,
        actor.userId,
        audit.action,
        audit.resourceType,
        audit.resourceId,
        before ? JSON.stringify(before) : null,
        JSON.stringify(after),
      ]
    )

    await client.query('COMMIT')
    return after as Row
  } catch (err) {
    await client.query('ROLLBACK').catch(() => { /* swallow rollback errors */ })
    throw err
  } finally {
    client.release()
  }
}
