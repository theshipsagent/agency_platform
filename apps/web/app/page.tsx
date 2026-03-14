import { redirect } from 'next/navigation'

const isDev = process.env.NODE_ENV === 'development'
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const hasRealClerkKey = clerkKey.startsWith('pk_') && clerkKey.length > 10

export default async function HomePage() {
  // In dev without real Clerk keys — skip auth check and go straight to dashboard
  if (isDev && !hasRealClerkKey) {
    redirect('/port-calls')
  }

  // With Clerk keys — dynamic import to avoid build errors when keys aren't set
  const { auth } = await import('@clerk/nextjs/server')
  const { userId } = await auth()
  if (userId) redirect('/port-calls')
  redirect('/sign-in')
}
