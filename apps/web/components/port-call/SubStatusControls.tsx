'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const SUB_STATUS_FLOW: Record<string, { next: string; label: string }[]> = {
  AT_ANCHOR: [{ next: 'BERTHED', label: 'Berthed' }],
  BERTHED: [
    { next: 'WORKING_CARGO', label: 'Working Cargo' },
    { next: 'AT_ANCHOR', label: 'Back to Anchor' },
  ],
  WORKING_CARGO: [
    { next: 'CARGO_COMPLETE', label: 'Cargo Complete' },
    { next: 'BERTHED', label: 'Back to Berthed' },
  ],
  CARGO_COMPLETE: [],
}

const SUB_STATUS_LABELS: Record<string, string> = {
  AT_ANCHOR: 'At Anchor',
  BERTHED: 'Berthed',
  WORKING_CARGO: 'Working Cargo',
  CARGO_COMPLETE: 'Cargo Complete',
}

const SUB_STATUS_COLORS: Record<string, string> = {
  AT_ANCHOR: 'bg-amber-50 text-amber-700 border-amber-200',
  BERTHED: 'bg-blue-50 text-blue-700 border-blue-200',
  WORKING_CARGO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CARGO_COMPLETE: 'bg-violet-50 text-violet-700 border-violet-200',
}

interface SubStatusControlsProps {
  portCallId: string
  currentSubStatus: string
}

export function SubStatusControls({ portCallId, currentSubStatus }: SubStatusControlsProps) {
  const router = useRouter()
  const [advancing, setAdvancing] = useState(false)

  const nextOptions = SUB_STATUS_FLOW[currentSubStatus] ?? []

  async function advance(nextStatus: string) {
    setAdvancing(true)
    try {
      const res = await fetch(`/api/port-calls/${portCallId}/sub-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeSubStatus: nextStatus }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`text-xs ${SUB_STATUS_COLORS[currentSubStatus] ?? ''}`}>
        {SUB_STATUS_LABELS[currentSubStatus] ?? currentSubStatus}
      </Badge>
      {nextOptions.map((opt) => (
        <Button
          key={opt.next}
          variant="ghost"
          size="sm"
          disabled={advancing}
          onClick={() => advance(opt.next)}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <ChevronRight className="w-3 h-3" />
          {opt.label}
        </Button>
      ))}
    </div>
  )
}
