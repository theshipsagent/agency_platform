'use client'

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOmniBar } from '@/lib/stores/omnibar'

const isDev = process.env.NODE_ENV === 'development'
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const hasRealClerkKey = clerkKey.startsWith('pk_') && clerkKey.length > 10
const useClerk = !isDev || hasRealClerkKey

// Only import Clerk components when keys are configured
let UserButton: React.ComponentType<{ afterSignOutUrl: string }> | null = null
let OrganizationSwitcher: React.ComponentType<{ hidePersonal?: boolean; appearance?: unknown }> | null = null
if (useClerk) {
  const clerk = require('@clerk/nextjs')
  UserButton = clerk.UserButton
  OrganizationSwitcher = clerk.OrganizationSwitcher
}

export function Topbar() {
  const { open } = useOmniBar()

  return (
    <header className="h-14 border-b bg-card flex items-center px-4 gap-4 sticky top-0 z-20">
      {/* OmniBar trigger */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground w-64 justify-start font-normal"
        onClick={open}
      >
        <Search className="w-4 h-4" />
        <span>Search port calls, vessels…</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <div className="flex-1" />

      {useClerk && OrganizationSwitcher && UserButton ? (
        <>
          {/* Org switcher */}
          <OrganizationSwitcher
            hidePersonal
            appearance={{
              elements: {
                organizationSwitcherTrigger: 'text-sm border rounded-md px-2 py-1',
              },
            }}
          />
          {/* User menu */}
          <UserButton afterSignOutUrl="/sign-in" />
        </>
      ) : (
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border">
          Dev mode · no auth
        </div>
      )}
    </header>
  )
}
