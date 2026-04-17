import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShipOps',
  description: 'Ship Agency Operational Platform',
}

const isDev = process.env.NODE_ENV === 'development'
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const hasRealClerkKey = clerkKey.startsWith('pk_') && clerkKey.length > 10
const useClerk = !isDev || hasRealClerkKey

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (useClerk) {
    return (
      <ClerkProvider>
        <html lang="en" className="dark" suppressHydrationWarning>
          <body>{children}</body>
        </html>
      </ClerkProvider>
    )
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
