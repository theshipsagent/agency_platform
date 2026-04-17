'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface AvailableTransition {
  phase: string
  label: string
  allowed: boolean
  reason?: string
  warnings?: string[]
}

interface PhaseControlsProps {
  portCallId: string
  currentPhase: string
  currentPhaseLabel: string
  fileStatus: string
  isLocked: boolean
}

const PHASE_DISPLAY: Record<string, string> = {
  PROFORMA_ESTIMATED: 'Proforma Estimated',
  AWAITING_APPOINTMENT: 'Awaiting Appointment',
  APPOINTED: 'Appointed',
  ACTIVE: 'Active Port Call',
  SAILED: 'Sailed Port Call',
  COMPLETED: 'Completed Port Call',
  PROCESSING_FDA: 'Processing FDA',
  AWAITING_PAYMENT: 'Awaiting Payment',
  SETTLED: 'Settled',
}

export function PhaseControls({
  portCallId,
  currentPhase,
  currentPhaseLabel,
  fileStatus,
  isLocked,
}: PhaseControlsProps) {
  const router = useRouter()
  const [transitions, setTransitions] = useState<AvailableTransition[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTransition, setSelectedTransition] = useState<AvailableTransition | null>(null)
  const [error, setError] = useState<string | null>(null)

  const disabled = fileStatus !== 'ACTIVE' || isLocked || currentPhase === 'SETTLED'

  async function loadTransitions() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/port-calls/${portCallId}/phase`)
      const data = await res.json()
      setTransitions(data.availableTransitions ?? [])
    } catch {
      setError('Failed to load transitions')
    } finally {
      setLoading(false)
    }
  }

  async function executeTransition(phase: string) {
    setAdvancing(true)
    setError(null)
    try {
      const res = await fetch(`/api/port-calls/${portCallId}/phase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase, userRole: 'MANAGER' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Transition failed')
        return
      }
      setDialogOpen(false)
      setSelectedTransition(null)
      setTransitions(null)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      setDialogOpen(open)
      if (open) loadTransitions()
      else { setSelectedTransition(null); setError(null) }
    }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-1.5"
        >
          Advance Phase
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Phase Transition</DialogTitle>
          <DialogDescription>
            Current: {currentPhaseLabel}
          </DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground py-4">Checking prerequisites...</p>}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {transitions && !selectedTransition && (
          <div className="space-y-2 py-2">
            {transitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No available transitions from this phase.</p>
            ) : (
              transitions.map((t) => (
                <button
                  key={t.phase}
                  disabled={!t.allowed}
                  onClick={() => setSelectedTransition(t)}
                  className="w-full text-left p-3 rounded-md border transition-colors hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{t.label}</span>
                    {t.allowed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  {!t.allowed && t.reason && (
                    <p className="text-xs text-muted-foreground mt-1">{t.reason}</p>
                  )}
                  {t.warnings?.map((w, i) => (
                    <p key={i} className="text-xs text-amber-600 mt-1">{w}</p>
                  ))}
                </button>
              ))
            )}
          </div>
        )}

        {selectedTransition && (
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-md bg-muted/50 border">
              <p className="text-sm">
                Transition from <span className="font-medium">{currentPhaseLabel}</span> to{' '}
                <span className="font-medium">{selectedTransition.label}</span>?
              </p>
              {selectedTransition.warnings?.map((w, i) => (
                <div key={i} className="flex items-start gap-2 mt-2 text-xs text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {w}
                </div>
              ))}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTransition(null)}
              >
                Back
              </Button>
              <Button
                size="sm"
                disabled={advancing}
                onClick={() => executeTransition(selectedTransition.phase)}
              >
                {advancing ? 'Transitioning...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
