'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Anchor, BarChart3, Building2, ChevronDown,
  FileText, Receipt, Settings, Ship, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const NAV = [
  {
    section: 'OPERATIONS',
    items: [
      { label: 'Port Calls',  href: '/port-calls',  icon: Anchor,    badge: '23' },
      { label: 'Vessels',     href: '/vessels',      icon: Ship },
      { label: 'Customers',   href: '/customers',    icon: Users },
    ],
  },
  {
    section: 'FINANCE',
    items: [
      { label: 'PDA / FDA',     href: '/finance/pda',         icon: FileText },
      { label: 'AR / AP',       href: '/finance/ar-ap',       icon: Receipt },
      { label: 'Reports',       href: '/finance/reports',     icon: BarChart3 },
    ],
  },
  {
    section: 'ADMIN',
    items: [
      { label: 'Organizations', href: '/organizations', icon: Building2 },
      { label: 'Settings',      href: '/settings',      icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar-bg sidebar-border flex flex-col w-56 border-r h-screen sticky top-0 shrink-0">

      {/* ── Brand ── */}
      <div className="flex items-center gap-2.5 px-4 h-13 border-b sidebar-border py-3.5">
        <div className="flex items-center justify-center w-7 h-7 rounded bg-primary/90 shrink-0">
          <Anchor className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-foreground">ShipOps</div>
          <div className="text-[10px] text-muted-foreground leading-none mt-0.5">Gulf Coast Agency</div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="section-label px-2 mb-1">{group.section}</div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}
                    className={cn(
                      'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-all',
                      active
                        ? 'bg-primary/12 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                    )}>
                    {/* Active indicator bar */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
                    )}
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {'badge' in item && item.badge && (
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full tabular-nums',
                        active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User ── */}
      <div className="border-t sidebar-border p-2">
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-accent/60 transition-colors text-left group">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-primary">WD</span>
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[12px] font-medium text-foreground truncate">Will Davis</div>
            <div className="text-[10px] text-muted-foreground truncate">Manager · NOL</div>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground/50 shrink-0" />
        </button>
      </div>

    </aside>
  )
}
