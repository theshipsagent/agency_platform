'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Anchor, Building2, Search, Ship } from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { useOmniBar } from '@/lib/stores/omnibar'

export function OmniBar() {
  const { isOpen, close, toggle } = useOmniBar()
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
      <DialogContent className="p-0 gap-0 max-w-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            placeholder="Search port calls, vessels, organizations…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Quick links */}
        <div className="px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Quick links</p>
          <div className="space-y-1">
            {[
              { icon: Anchor, label: 'Port Calls', href: '/port-calls' },
              { icon: Ship, label: 'Vessels', href: '/vessels' },
              { icon: Building2, label: 'Organizations', href: '/organizations' },
            ].map((item) => (
              <button
                key={item.href}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm transition-colors text-left"
                onClick={() => { router.push(item.href); close() }}
              >
                <item.icon className="w-4 h-4 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2 border-t bg-muted/50 flex gap-4 text-xs text-muted-foreground">
          <span><kbd className="border rounded px-1">↵</kbd> select</span>
          <span><kbd className="border rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border rounded px-1">Esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
