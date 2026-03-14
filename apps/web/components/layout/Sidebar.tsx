'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Anchor,
  BarChart3,
  Building2,
  ChevronRight,
  LayoutDashboard,
  Receipt,
  Settings,
  Ship,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const navItems = [
  {
    label: 'Port Calls',
    href: '/port-calls',
    icon: Anchor,
  },
  {
    label: 'Vessels',
    href: '/vessels',
    icon: Ship,
  },
  {
    label: 'Organizations',
    href: '/organizations',
    icon: Building2,
  },
  {
    label: 'Accounting',
    href: '/accounting/payables',
    icon: Receipt,
    children: [
      { label: 'Payables', href: '/accounting/payables' },
      { label: 'Receivables', href: '/accounting/receivables' },
      { label: 'Reports', href: '/accounting/reports' },
    ],
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    disabled: true,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-60 border-r bg-card h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
          <Anchor className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">ShipOps</span>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            if (item.children) {
              const isParentActive = item.children.some((c) =>
                pathname.startsWith(c.href)
              )
              return (
                <div key={item.href}>
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground',
                      isParentActive && 'text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </div>
                  <div className="ml-4 pl-3 border-l mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'block px-3 py-1.5 rounded-md text-sm transition-colors',
                          pathname.startsWith(child.href)
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.disabled ? '#' : item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  item.disabled && 'pointer-events-none opacity-40'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator />
      <div className="p-2">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  )
}
