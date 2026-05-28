/**
 * Server-side tenant resolution.
 *
 * The single source of truth for "which tenant is this request for?"
 * Called by every API route and server-component page that touches DB.
 *
 * Two modes:
 *   - Dev shim:     No real Clerk key configured → returns DEV_TENANT_ID
 *                   (matches middleware.ts's devBypassMiddleware path).
 *   - Clerk mode:   Real Clerk key → reads orgId from the active session.
 *                   Throws if the user has no active organization.
 *
 * Why a function and not a constant: in production, tenantId comes from the
 * request's session, not a build-time value. Same call site, different value
 * per request — that's exactly what a function gives us and a constant cannot.
 */
import { auth } from '@clerk/nextjs/server'

/**
 * The seeded dev tenant. Matches the literal currently hardcoded in SQL
 * across the 12 files S1 is migrating. After S1c, this is the ONLY place
 * the literal string lives.
 */
export const DEV_TENANT_ID = 'tenant-gca-001'

function hasRealClerkKey(): boolean {
  const key = process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] ?? ''
  return key.startsWith('pk_') && key.length > 10
}

/**
 * Returns the tenantId for the current request.
 *
 * Works in both API route handlers and server-component pages because
 * Clerk's auth() reads the request context implicitly via Next.js headers().
 *
 * @throws If running in Clerk mode and the session has no active orgId.
 */
export async function getTenantId(): Promise<string> {
  const isDev = process.env.NODE_ENV === 'development'

  // Dev shim: no real Clerk key → match middleware's devBypassMiddleware path
  if (isDev && !hasRealClerkKey()) {
    return DEV_TENANT_ID
  }

  const { orgId } = await auth()
  if (!orgId) {
    // Pragmatic dev fallback: developer signed in with a personal Clerk
    // account that isn't part of any org. Let them see seeded data instead
    // of forcing them to set up a Clerk org for every fresh DB. The warning
    // keeps the fallback visible in the dev console — production stays strict.
    if (isDev) {
      console.warn(
        '[getTenantId] Session has no orgId in dev — falling back to DEV_TENANT_ID. ' +
        'In production this would throw. Create a Clerk org to silence this warning.'
      )
      return DEV_TENANT_ID
    }
    throw new Error(
      'No active organization on session. User must be assigned to an org before accessing tenant-scoped resources.'
    )
  }
  return orgId
}
