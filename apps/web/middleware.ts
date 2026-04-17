import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/portal/(.*)',
  '/api/webhooks/(.*)',
  '/magic/(.*)',
])

const isDev = process.env.NODE_ENV === 'development'
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const hasRealClerkKey = clerkKey.startsWith('pk_') && clerkKey.length > 10

// In development without real Clerk keys — allow all routes through
const devBypassMiddleware = (_req: NextRequest) => NextResponse.next()

const clerkProtectedMiddleware = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth().protect()
  }
})

export default isDev && !hasRealClerkKey ? devBypassMiddleware : clerkProtectedMiddleware

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
