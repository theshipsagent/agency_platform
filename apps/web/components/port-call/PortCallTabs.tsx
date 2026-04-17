'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

// Port call types that show cargo-related tabs
const CARGO_TYPES = new Set([
  'DISCHARGE', 'LOAD', 'LOAD_DISCHARGE', 'TRANSSHIPMENT',
])

interface Tab {
  id: string
  label: string
  href: (id: string) => string
  showFor?: (portCallType: string) => boolean
  placeholder?: boolean // Future module — shows as disabled
}

const TABS: Tab[] = [
  {
    id: 'summary',
    label: 'Summary',
    href: (id) => `/port-calls/${id}`,
  },
  {
    id: 'operations',
    label: 'Operations',
    href: (id) => `/port-calls/${id}/timeline`,
  },
  {
    id: 'cargo',
    label: 'Cargo',
    href: (id) => `/port-calls/${id}/cargo`,
    showFor: (type) => CARGO_TYPES.has(type),
  },
  {
    id: 'voyage-da',
    label: 'Voyage DA',
    href: (id) => `/port-calls/${id}/disbursement`,
  },
  {
    id: 'husbandry',
    label: 'Husbandry',
    href: (id) => `/port-calls/${id}/husbandry`,
    placeholder: true,
  },
  {
    id: 'liner-traffic',
    label: 'Liner / Traffic',
    href: (id) => `/port-calls/${id}/liner-traffic`,
    showFor: (type) => CARGO_TYPES.has(type),
    placeholder: true,
  },
  {
    id: 'forwarding',
    label: 'Forwarding',
    href: (id) => `/port-calls/${id}/forwarding`,
    showFor: (type) => ['LOAD', 'LOAD_DISCHARGE'].includes(type),
    placeholder: true,
  },
  {
    id: 'funding',
    label: 'Funding',
    href: (id) => `/port-calls/${id}/funding`,
  },
  {
    id: 'documents',
    label: 'Documents',
    href: (id) => `/port-calls/${id}/documents`,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: (id) => `/port-calls/${id}/tasks`,
  },
]

interface PortCallTabsProps {
  portCallId: string
  portCallType: string
}

export function PortCallTabs({ portCallId, portCallType }: PortCallTabsProps) {
  const pathname = usePathname()

  const visibleTabs = TABS.filter(
    (tab) => !tab.showFor || tab.showFor(portCallType)
  )

  return (
    <div className="border-b bg-background px-6">
      <nav className="flex gap-0 -mb-px overflow-x-auto">
        {visibleTabs.map((tab) => {
          const href = tab.href(portCallId)
          const isActive = tab.id === 'summary'
            ? pathname === href
            : pathname.startsWith(href)

          if (tab.placeholder) {
            return (
              <span
                key={tab.id}
                className="px-4 py-2.5 text-sm text-muted-foreground/40 border-b-2 border-transparent cursor-default whitespace-nowrap"
                title="Coming soon"
              >
                {tab.label}
              </span>
            )
          }

          return (
            <Link
              key={tab.id}
              href={href}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
