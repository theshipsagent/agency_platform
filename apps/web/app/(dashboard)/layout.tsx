import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { OmniBar } from '@/components/layout/OmniBar'

const isDev = process.env.NODE_ENV === 'development'
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const hasRealClerkKey = clerkKey.startsWith('pk_') && clerkKey.length > 10

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Skip auth check in dev mode without real Clerk keys
  if (!isDev || hasRealClerkKey) {
    const { auth } = await import('@clerk/nextjs/server')
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <OmniBar />
    </div>
  )
}
