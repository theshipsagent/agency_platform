/**
 * Server-side request context resolution.
 *
 * The single source of truth for "who is making this request, and on which
 * tenant?" Called by every API route and server-component page that touches
 * the DB.
 *
 * S2 extends S1's tenant-only context to a full {tenantId, actor} pair so
 * audit_logs rows have a real users.id FK to point at.
 *
 * Three modes (same as S1's getTenantId — preserved for behavioral parity):
 *   - Dev shim:   No real Clerk key → DEV_CONTEXT (admin actor).
 *                 Matches middleware.ts's devBypassMiddleware path.
 *   - Dev fallback: Clerk key set but session has no orgId/userId →
 *                   DEV_CONTEXT with a console.warn. Pragmatic dev-experience
 *                   choice; production stays strict.
 *   - Production: Real Clerk session. Resolves orgId → tenantId and looks up
 *                 users.id by (tenant_id, clerk_user_id). Throws if no User
 *                 row exists for the Clerk identity (future auto-provisioning
 *                 via Clerk webhook will populate this on user creation).
 *
 * Why one helper and not two: every audited mutation needs BOTH tenantId AND
 * actor. Forcing two separate helpers invites the bug where a route remembers
 * the tenant scope and forgets the actor — defeating S2's whole point. One
 * call, one context object, threaded through every layer.
 */
import { auth } from '@clerk/nextjs/server'
import { tenantQueryOne } from '@shipops/db'

/**
 * The seeded dev tenant. Matches the seed in packages/db/prisma/seed.ts and
 * seed_offices_users.sql. After S1c, the ONLY place this literal lives.
 */
export const DEV_TENANT_ID = 'tenant-gca-001'

/**
 * The seeded dev actor — currently the MANAGER user from `prisma/seed.ts`.
 *
 * The original S2 design picked the CEO/ADMIN (`user-hq-ceo` from
 * `seed_offices_users.sql`) as the most-privileged dev actor, but that side-car
 * SQL is orphan — not wired into `db:seed`. Until the seed sources are
 * consolidated (see spawn_task on this), MANAGER is the most senior role that
 * actually exists in the live dev DB and avoids approval-gate blocks during
 * dev work.
 *
 * Pinned to a literal seed id, not looked up at runtime, to keep the dev path
 * zero-roundtrip — matching the DEV_TENANT_ID literal pattern.
 */
export const DEV_USER_ID = 'user-mg-001'

/** Clerk user identifier seeded against DEV_USER_ID. Used in dev shim only. */
const DEV_CLERK_USER_ID = 'user_demo_manager'

/**
 * Actor discriminated union.
 *
 * Audit rows record "who did this." Sometimes the answer is a real user; other
 * times the answer is "the system did it" (cron, webhook, migration backfill).
 * Conflating those two would corrupt the audit trail — a webhook-driven write
 * laundered under a real user's id is worse than no audit at all for forensics.
 *
 * Routes that handle user-initiated mutations expect `kind: 'user'` and can
 * narrow accordingly. The SystemActor variant exists for future cron/webhook
 * handlers — not used in S2c's route migrations.
 */
export type UserActor = {
  kind: 'user'
  /** users.id (UUID) — what audit_logs.user_id FKs to. */
  userId: string
  /** Clerk session subject — for log lines and debugging, not stored in audit. */
  clerkUserId: string
}

export type SystemActor = {
  kind: 'system'
  /** Why the system acted. e.g. 'cron:nightly-burn-rate', 'webhook:clerk-user-created'. */
  reason: string
}

export type Actor = UserActor | SystemActor

export type RequestContext = {
  tenantId: string
  actor: Actor
}

function hasRealClerkKey(): boolean {
  const key = process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] ?? ''
  return key.startsWith('pk_') && key.length > 10
}

const DEV_CONTEXT: RequestContext = {
  tenantId: DEV_TENANT_ID,
  actor: {
    kind: 'user',
    userId: DEV_USER_ID,
    clerkUserId: DEV_CLERK_USER_ID,
  },
}

/**
 * Returns the full request context: tenantId + actor.
 *
 * S2's primary entry point. S1 call sites that only need tenantId continue
 * to use getTenantId() (defined below as a thin alias) until S2c migrates
 * them route-by-route alongside audit wiring.
 *
 * @throws In production: if the session has no orgId/userId, or if no User
 *   row exists for the Clerk identity in this tenant.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const isDev = process.env.NODE_ENV === 'development'

  // Dev shim: no real Clerk key → match middleware's devBypassMiddleware path
  if (isDev && !hasRealClerkKey()) {
    return DEV_CONTEXT
  }

  const { orgId, userId: clerkUserId } = await auth()

  if (!orgId || !clerkUserId) {
    // Pragmatic dev fallback — see getTenantId's original rationale.
    if (isDev) {
      console.warn(
        '[getRequestContext] Session missing orgId or userId in dev — falling back to DEV_CONTEXT. ' +
        'In production this would throw. Create a Clerk org + sign in to silence this warning.'
      )
      return DEV_CONTEXT
    }
    throw new Error(
      'No active organization or user on session. User must be assigned to an org before accessing tenant-scoped resources.'
    )
  }

  // Resolve clerk_user_id → users.id within the tenant scope. The AND clause
  // is defense-in-depth: even if Clerk somehow returns a userId from a
  // different tenant, the row simply won't exist and we throw.
  const user = await tenantQueryOne<{ id: string }>(
    orgId,
    `SELECT id
       FROM users
      WHERE tenant_id = $1
        AND clerk_user_id = $2
        AND deleted_at IS NULL`,
    [orgId, clerkUserId]
  )

  if (!user) {
    throw new Error(
      `Clerk user ${clerkUserId} has no provisioned User row in tenant ${orgId}. ` +
      'A User row must exist before this user can perform tenant-scoped actions ' +
      '(typically created via the Clerk user-created webhook on first sign-in).'
    )
  }

  return {
    tenantId: orgId,
    actor: { kind: 'user', userId: user.id, clerkUserId },
  }
}

/**
 * Returns just the tenantId for the current request.
 *
 * Backwards-compatible alias kept so S1's 12 call sites keep compiling until
 * S2c migrates them to getRequestContext alongside audit wiring. New code
 * should prefer getRequestContext() so the actor is available for audit rows.
 */
export async function getTenantId(): Promise<string> {
  return (await getRequestContext()).tenantId
}
