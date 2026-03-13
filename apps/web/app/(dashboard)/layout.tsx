import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

// TODO Phase B: Replace with full shell layout (sidebar, topbar, omnibar)
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <div className="min-h-screen bg-background">
      <main className="flex-1">{children}</main>
    </div>
  )
}
