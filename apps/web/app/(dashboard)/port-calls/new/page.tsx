'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

type Vessel = {
  id: string; name: string; imo_number: string; flag_state: string
  vessel_type: string; dwt?: number | null; source?: string
}
type RegisterResult = {
  id: string; name: string; imo_number: string; flag_state: string
  vessel_type: string; dwt?: number | null; source: 'register'
}
type Org = { id: string; name: string; type: string }
type Port = { id: string; name: string; un_locode: string; country: string }
type Terminal = {
  id: string; port_id: string; name: string; terminal_type: string
  max_draft_m?: number | null; max_loa_m?: number | null
  cargo_types_handled?: string[]; pilot_required?: boolean
  tug_count_required?: number | null
}
type Office = { id: string; name: string; code: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'appointment', label: 'Appointment' },
  { key: 'vessel',      label: 'Vessel & Principal' },
  { key: 'port',        label: 'Port & Terminal' },
  { key: 'cargo',       label: 'Cargo' },
  { key: 'timing',      label: 'Timing' },
  { key: 'review',      label: 'Review & Open' },
] as const

const PORT_CALL_TYPES = [
  { value: 'DISCHARGE', label: 'Discharge' },
  { value: 'LOAD', label: 'Load' },
  { value: 'LOAD_DISCHARGE', label: 'Load & Discharge' },
  { value: 'TRANSSHIPMENT', label: 'Transshipment' },
  { value: 'BUNKERING_ONLY', label: 'Bunkering Only' },
  { value: 'CREW_CHANGE_ONLY', label: 'Crew Change Only' },
  { value: 'REPAIRS_DRYDOCK', label: 'Repairs / Drydock' },
  { value: 'LAY_UP', label: 'Lay-Up' },
  { value: 'TRANSIT', label: 'Transit' },
  { value: 'SURVEY_INSPECTION', label: 'Survey / Inspection' },
]

const SERVICE_SCOPES = [
  { value: 'FULL_AGENCY', label: 'Full Agency' },
  { value: 'HUSBANDRY_ONLY', label: 'Husbandry Only' },
  { value: 'PROTECTING_AGENCY', label: 'Protecting Agency' },
  { value: 'CUSTOMS_CLEARANCE', label: 'Customs Clearance' },
  { value: 'CREW_CHANGE', label: 'Crew Change' },
  { value: 'STORES_PROVISIONS', label: 'Stores / Provisions' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'CASH_TO_MASTER', label: 'Cash to Master' },
  { value: 'BUNKER_COORDINATION', label: 'Bunker Coordination' },
  { value: 'SURVEYOR_COORDINATION', label: 'Surveyor Coordination' },
  { value: 'STEVEDORING_COORDINATION', label: 'Stevedoring' },
  { value: 'LAUNCH_WATER_TAXI', label: 'Launch / Water Taxi' },
  { value: 'WASTE_REMOVAL', label: 'Waste Removal' },
  { value: 'IMMIGRATION_SHORE_LEAVE', label: 'Immigration' },
]

const CARGO_TYPES = [
  { value: 'DRY_BULK', label: 'Dry Bulk' },
  { value: 'BREAK_BULK', label: 'Break Bulk' },
  { value: 'LIQUID_BULK', label: 'Liquid Bulk' },
  { value: 'CONTAINERIZED', label: 'Containerized' },
  { value: 'RORO_VEHICLES', label: 'RoRo / Vehicles' },
  { value: 'PROJECT_CARGO', label: 'Project Cargo' },
  { value: 'TANKER_CLEAN', label: 'Tanker — Clean' },
  { value: 'TANKER_DIRTY', label: 'Tanker — Dirty' },
  { value: 'CHEMICAL_TANKER', label: 'Chemical Tanker' },
  { value: 'GAS_CARRIER', label: 'Gas Carrier' },
]

const CARGO_GROUPS = [
  { value: 'DRY_BULK', label: 'Dry Bulk' },
  { value: 'BREAK_BULK', label: 'Break Bulk' },
  { value: 'TANKER_CLEAN', label: 'Tanker — Clean' },
  { value: 'TANKER_DIRTY', label: 'Tanker — Dirty' },
  { value: 'CHEMICAL', label: 'Chemical' },
  { value: 'GAS_CARRIER', label: 'Gas Carrier' },
  { value: 'CONTAINER', label: 'Container' },
  { value: 'RO_RO', label: 'RoRo' },
  { value: 'PROJECT_CARGO', label: 'Project Cargo' },
]

// ─── Vessel Combobox ──────────────────────────────────────────────────────────

function VesselCombobox({ selected, onSelect }: {
  selected: Vessel | null; onSelect: (v: Vessel) => void
}) {
  const [query, setQuery] = useState('')
  const [tenantVessels, setTenantVessels] = useState<Vessel[]>([])
  const [registerResults, setRegisterResults] = useState<RegisterResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/vessels?q=${encodeURIComponent(q)}`)
        const data = await res.json() as { tenantVessels: Vessel[]; registerResults: RegisterResult[] }
        setTenantVessels(data.tenantVessels ?? [])
        setRegisterResults(data.registerResults ?? [])
        setOpen(true)
      } finally { setLoading(false) }
    }, 250)
  }, [])

  useEffect(() => { search('') }, [search])
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function selectFromRegister(reg: RegisterResult) {
    setRegistering(true); setOpen(false)
    try {
      const res = await fetch('/api/vessels', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imo: reg.imo_number }),
      })
      const data = await res.json() as { id: string; name: string; imo_number: string }
      onSelect({ id: data.id, name: data.name, imo_number: data.imo_number,
        flag_state: reg.flag_state, vessel_type: reg.vessel_type, source: 'registered' })
    } finally { setRegistering(false); setQuery('') }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={open ? query : (selected ? selected.name : '')}
        placeholder="Search by vessel name or IMO…"
        disabled={registering}
        onFocus={() => { setQuery(''); setOpen(true); search('') }}
        onChange={(e) => { setQuery(e.target.value); search(e.target.value) }}
      />
      {selected && !open && (
        <button type="button" onClick={() => { onSelect(null as unknown as Vessel); setQuery('') }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm">
          ✕
        </button>
      )}
      {selected && !open && (
        <div className="mt-1.5 px-3 py-1.5 rounded-md bg-muted/60 text-xs text-muted-foreground flex gap-3">
          <span>IMO {selected.imo_number}</span>
          {selected.vessel_type && <span>{selected.vessel_type}</span>}
          {selected.flag_state && <span>Flag: {selected.flag_state}</span>}
          {selected.dwt ? <span>{Math.round(selected.dwt / 1000)}K DWT</span> : null}
        </div>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-72 overflow-auto">
          {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>}
          {!loading && tenantVessels.length === 0 && registerResults.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted-foreground">No vessels found</div>
          )}
          {tenantVessels.length > 0 && (<>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b">
              Registered vessels
            </div>
            {tenantVessels.map((v) => (
              <button key={v.id} type="button"
                className={cn('w-full text-left px-3 py-2 text-sm hover:bg-accent', selected?.id === v.id && 'bg-accent font-medium')}
                onMouseDown={(e) => { e.preventDefault(); onSelect(v); setOpen(false); setQuery('') }}>
                <span className="font-medium">{v.name}</span>
                <span className="ml-2 text-muted-foreground text-xs">IMO {v.imo_number}{v.flag_state && ` · ${v.flag_state}`}</span>
              </button>
            ))}
          </>)}
          {registerResults.length > 0 && (<>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-t">
              Ships register — select to add
            </div>
            {registerResults.map((r) => (
              <button key={r.id} type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); void selectFromRegister(r) }}>
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-muted-foreground text-xs">IMO {r.imo_number}{r.dwt ? ` · ${Math.round(r.dwt / 1000)}K DWT` : ''}</span>
              </button>
            ))}
          </>)}
        </div>
      )}
    </div>
  )
}

// ─── Generic Search Combobox ──────────────────────────────────────────────────

function SearchCombobox<T extends { id: string; name: string }>({
  placeholder, fetchUrl, selected, onSelect, renderItem,
}: {
  placeholder: string; fetchUrl: (q: string) => string
  selected: T | null; onSelect: (item: T) => void
  renderItem: (item: T) => React.ReactNode
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(fetchUrl(q))
        setResults(await res.json() as T[])
        setOpen(true)
      } finally { setLoading(false) }
    }, 250)
  }, [fetchUrl])

  useEffect(() => { search('') }, [search])
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={open ? query : (selected ? selected.name : '')}
        placeholder={placeholder}
        onFocus={() => { setQuery(''); setOpen(true); search('') }}
        onChange={(e) => { setQuery(e.target.value); search(e.target.value) }}
      />
      {selected && !open && (
        <button type="button" onClick={() => { onSelect(null as unknown as T); setQuery('') }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm">✕</button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
          {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>}
          {!loading && results.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>}
          {results.map((item) => (
            <button key={item.id} type="button"
              className={cn('w-full text-left px-3 py-2 text-sm hover:bg-accent', selected?.id === item.id && 'bg-accent font-medium')}
              onMouseDown={(e) => { e.preventDefault(); onSelect(item); setOpen(false); setQuery('') }}>
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function StepProgress({ current, steps }: { current: number; steps: typeof STEPS }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1 flex-1">
          <div className={cn(
            'flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium shrink-0 transition-colors',
            i < current ? 'bg-primary text-primary-foreground' :
            i === current ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
            'bg-muted text-muted-foreground'
          )}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={cn(
            'text-xs truncate hidden sm:block',
            i === current ? 'font-medium text-foreground' : 'text-muted-foreground'
          )}>
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div className={cn('flex-1 h-px mx-1', i < current ? 'bg-primary' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function NewPortCallPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 1: Appointment
  const [portCallType, setPortCallType] = useState('')
  const [serviceScope, setServiceScope] = useState<string[]>([])
  const [selectedOffice, setSelectedOffice] = useState('')

  // Step 2: Vessel & Principal
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null)
  const [selectedPrincipal, setSelectedPrincipal] = useState<Org | null>(null)
  const [selectedCharterer, setSelectedCharterer] = useState<Org | null>(null)

  // Step 3: Port & Terminal
  const [selectedPort, setSelectedPort] = useState('')
  const [selectedTerminal, setSelectedTerminal] = useState('')
  const [lastPort, setLastPort] = useState('')
  const [nextPort, setNextPort] = useState('')

  // Step 4: Cargo
  const [cargoGroup, setCargoGroup] = useState('')
  const [commodity, setCommodity] = useState('')
  const [cargoType, setCargoType] = useState('')
  const [cargoQty, setCargoQty] = useState('')
  const [cargoUnit, setCargoUnit] = useState('MT')

  // Step 5: Timing
  const [eta, setEta] = useState('')
  const [etd, setEtd] = useState('')
  const [laycanOpen, setLaycanOpen] = useState('')
  const [laycanClose, setLaycanClose] = useState('')
  const [voyageNumber, setVoyageNumber] = useState('')
  const [principalRef, setPrincipalRef] = useState('')

  // Notes & submit
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reference data
  const [offices, setOffices] = useState<Office[]>([])
  const [allPorts, setAllPorts] = useState<Port[]>([])
  const [allTerminals, setAllTerminals] = useState<Terminal[]>([])
  const [officePorts, setOfficePorts] = useState<string[]>([]) // port IDs for selected office

  // Load reference data
  useEffect(() => {
    fetch('/api/offices').then(r => r.json()).then((d: Office[]) => setOffices(d)).catch(() => {})
    fetch('/api/ports').then(r => r.json()).then((d: { ports: Port[]; terminals: Terminal[] }) => {
      setAllPorts(d.ports); setAllTerminals(d.terminals)
    }).catch(() => {})
  }, [])

  // When office changes, fetch which ports it covers
  useEffect(() => {
    if (!selectedOffice) { setOfficePorts([]); return }
    fetch(`/api/offices?officeId=${selectedOffice}&ports=true`)
      .then(r => r.json())
      .then((d: { portIds: string[] }) => setOfficePorts(d.portIds))
      .catch(() => setOfficePorts([]))
  }, [selectedOffice])

  // Filtered ports: if office is selected, only show ports that office covers
  const filteredPorts = officePorts.length > 0
    ? allPorts.filter(p => officePorts.includes(p.id))
    : allPorts

  const portTerminals = allTerminals.filter(t => t.port_id === selectedPort)

  function toggleScope(value: string) {
    setServiceScope(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  // Step validation
  function canAdvance(): boolean {
    switch (step) {
      case 0: return !!portCallType && !!selectedOffice
      case 1: return !!selectedVessel && !!selectedPrincipal
      case 2: return !!selectedPort
      case 3: return true // cargo is optional at creation time
      case 4: return true // timing is optional at creation time
      case 5: return true
      default: return false
    }
  }

  // Submit
  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    try {
      const body = {
        portCallType, serviceScope, officeId: selectedOffice,
        vesselId: selectedVessel!.id, principalId: selectedPrincipal!.id,
        chartererId: selectedCharterer?.id || undefined,
        portId: selectedPort, terminalId: selectedTerminal || undefined,
        cargoGroup: cargoGroup || undefined,
        lastPort: lastPort || undefined, nextPort: nextPort || undefined,
        eta: eta || undefined, etd: etd || undefined,
        laycanOpen: laycanOpen || undefined, laycanClose: laycanClose || undefined,
        voyageNumber: voyageNumber || undefined, principalRef: principalRef || undefined,
        notes: notes || undefined,
        // Cargo line (if provided)
        cargo: commodity ? {
          commodity, cargoType: cargoType || undefined,
          quantity: cargoQty ? parseFloat(cargoQty) : undefined,
          unit: cargoUnit,
        } : undefined,
      }

      const res = await fetch('/api/port-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Failed to create port call')
      }

      const data = await res.json() as { id: string }
      router.push(`/port-calls/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  // Get label helpers
  const getLabel = (opts: { value: string; label: string }[], val: string) =>
    opts.find(o => o.value === val)?.label ?? val
  const getPortName = (id: string) => allPorts.find(p => p.id === id)?.name ?? id
  const getTerminalName = (id: string) => allTerminals.find(t => t.id === id)?.name ?? id
  const getOfficeName = (id: string) => offices.find(o => o.id === id)?.name ?? id

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Open Port Call</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Step {step + 1} of {STEPS.length} — {STEPS[step as number]?.label}
        </p>
      </div>

      <StepProgress current={step} steps={STEPS} />

      {/* ── Step 1: Appointment ── */}
      {step === 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Appointment Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Port Call Type <span className="text-destructive">*</span></Label>
                <Select value={portCallType} onValueChange={setPortCallType}>
                  <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    {PORT_CALL_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Office <span className="text-destructive">*</span></Label>
                <Select value={selectedOffice} onValueChange={(v) => { setSelectedOffice(v); setSelectedPort(''); setSelectedTerminal('') }}>
                  <SelectTrigger><SelectValue placeholder="Select office…" /></SelectTrigger>
                  <SelectContent>
                    {offices.map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name} <span className="text-muted-foreground text-xs">({o.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Service Scope</Label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICE_SCOPES.map(o => (
                  <label key={o.value} className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors',
                    serviceScope.includes(o.value) ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-input hover:bg-muted/50'
                  )}>
                    <input type="checkbox" className="sr-only" checked={serviceScope.includes(o.value)} onChange={() => toggleScope(o.value)} />
                    <span className={cn('h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center',
                      serviceScope.includes(o.value) ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                    )}>
                      {serviceScope.includes(o.value) && <svg viewBox="0 0 10 10" className="h-2.5 w-2.5"><path d="M1.5 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Vessel & Principal ── */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Vessel & Principal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Vessel <span className="text-destructive">*</span></Label>
              <VesselCombobox selected={selectedVessel} onSelect={setSelectedVessel} />
            </div>
            <div className="space-y-1.5">
              <Label>Principal (appointing party) <span className="text-destructive">*</span></Label>
              <SearchCombobox<Org>
                placeholder="Search principals…"
                fetchUrl={(q) => `/api/organizations?q=${encodeURIComponent(q)}&principals=true`}
                selected={selectedPrincipal} onSelect={setSelectedPrincipal}
                renderItem={(o) => (<div><span className="font-medium">{o.name}</span><span className="ml-2 text-muted-foreground text-xs">{o.type.replace(/_/g, ' ')}</span></div>)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Charterer <span className="text-muted-foreground text-xs">(optional — if different from principal)</span></Label>
              <SearchCombobox<Org>
                placeholder="Search charterers…"
                fetchUrl={(q) => `/api/organizations?q=${encodeURIComponent(q)}&principals=true`}
                selected={selectedCharterer} onSelect={setSelectedCharterer}
                renderItem={(o) => (<div><span className="font-medium">{o.name}</span><span className="ml-2 text-muted-foreground text-xs">{o.type.replace(/_/g, ' ')}</span></div>)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Port & Terminal ── */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Port & Terminal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Port <span className="text-destructive">*</span></Label>
                <Select value={selectedPort} onValueChange={(v) => { setSelectedPort(v); setSelectedTerminal('') }}>
                  <SelectTrigger><SelectValue placeholder="Select port…" /></SelectTrigger>
                  <SelectContent>
                    {filteredPorts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} <span className="text-muted-foreground text-xs">({p.un_locode})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOffice && officePorts.length > 0 && (
                  <p className="text-xs text-muted-foreground">Showing ports covered by {getOfficeName(selectedOffice)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Terminal</Label>
                <Select value={selectedTerminal} onValueChange={setSelectedTerminal} disabled={!selectedPort || portTerminals.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedPort ? 'Select port first' : portTerminals.length === 0 ? 'No terminals' : 'Select terminal…'} />
                  </SelectTrigger>
                  <SelectContent>
                    {portTerminals.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} <span className="text-muted-foreground text-xs">({t.terminal_type?.replace(/_/g, ' ')})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTerminal && (() => {
                  const t = allTerminals.find(x => x.id === selectedTerminal)
                  return t ? (
                    <div className="mt-1.5 px-3 py-1.5 rounded-md bg-muted/60 text-xs text-muted-foreground flex flex-wrap gap-3">
                      {t.max_draft_m && <span>Draft: {t.max_draft_m}m</span>}
                      {t.max_loa_m && <span>LOA: {t.max_loa_m}m</span>}
                      {t.pilot_required && <span>Pilot req.</span>}
                      {t.tug_count_required && <span>{t.tug_count_required} tugs</span>}
                    </div>
                  ) : null
                })()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Last Port</Label>
                <Input value={lastPort} onChange={(e) => setLastPort(e.target.value)} placeholder="e.g., Santos, Brazil" />
              </div>
              <div className="space-y-1.5">
                <Label>Next Port</Label>
                <Input value={nextPort} onChange={(e) => setNextPort(e.target.value)} placeholder="e.g., Rotterdam" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Cargo ── */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Cargo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Optional at this stage — can be added after the file is opened.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cargo Group</Label>
                <Select value={cargoGroup} onValueChange={setCargoGroup}>
                  <SelectTrigger><SelectValue placeholder="Select group…" /></SelectTrigger>
                  <SelectContent>
                    {CARGO_GROUPS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cargo Type</Label>
                <Select value={cargoType} onValueChange={setCargoType}>
                  <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    {CARGO_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-1">
                <Label>Commodity</Label>
                <Input value={commodity} onChange={(e) => setCommodity(e.target.value)} placeholder="e.g., Pet Coke" />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" value={cargoQty} onChange={(e) => setCargoQty(e.target.value)} placeholder="e.g., 55000" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={cargoUnit} onValueChange={setCargoUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MT">MT</SelectItem>
                    <SelectItem value="ST">Short Tons</SelectItem>
                    <SelectItem value="CBM">CBM</SelectItem>
                    <SelectItem value="TEU">TEU</SelectItem>
                    <SelectItem value="units">Units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Timing ── */}
      {step === 4 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Timing & References</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ETA</Label>
                <Input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ETD</Label>
                <Input type="datetime-local" value={etd} onChange={(e) => setEtd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Laycan Open</Label>
                <Input type="date" value={laycanOpen} onChange={(e) => setLaycanOpen(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Laycan Close</Label>
                <Input type="date" value={laycanClose} onChange={(e) => setLaycanClose(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Voyage Number</Label>
                <Input value={voyageNumber} onChange={(e) => setVoyageNumber(e.target.value)} placeholder="e.g., V.2601" />
              </div>
              <div className="space-y-1.5">
                <Label>Principal Reference</Label>
                <Input value={principalRef} onChange={(e) => setPrincipalRef(e.target.value)} placeholder="Principal's ref number" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Any initial remarks or instructions from the principal…" rows={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 6: Review ── */}
      {step === 5 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Review & Open</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <ReviewRow label="Type" value={getLabel(PORT_CALL_TYPES, portCallType)} />
              <ReviewRow label="Office" value={getOfficeName(selectedOffice)} />
              <ReviewRow label="Scope" value={serviceScope.map(s => getLabel(SERVICE_SCOPES, s)).join(', ') || '—'} />
              <ReviewRow label="Vessel" value={selectedVessel?.name ?? '—'} />
              <ReviewRow label="Principal" value={selectedPrincipal?.name ?? '—'} />
              <ReviewRow label="Charterer" value={selectedCharterer?.name || '—'} />
              <ReviewRow label="Port" value={getPortName(selectedPort)} />
              <ReviewRow label="Terminal" value={selectedTerminal ? getTerminalName(selectedTerminal) : '—'} />
              <ReviewRow label="Last Port" value={lastPort || '—'} />
              <ReviewRow label="Next Port" value={nextPort || '—'} />
              <ReviewRow label="Cargo Group" value={cargoGroup ? getLabel(CARGO_GROUPS, cargoGroup) : '—'} />
              <ReviewRow label="Commodity" value={commodity || '—'} />
              {cargoQty && <ReviewRow label="Quantity" value={`${cargoQty} ${cargoUnit}`} />}
              <ReviewRow label="ETA" value={eta ? new Date(eta).toLocaleString() : '—'} />
              <ReviewRow label="ETD" value={etd ? new Date(etd).toLocaleString() : '—'} />
              {laycanOpen && <ReviewRow label="Laycan" value={`${laycanOpen} – ${laycanClose || '?'}`} />}
              {voyageNumber && <ReviewRow label="Voyage #" value={voyageNumber} />}
              {principalRef && <ReviewRow label="Principal Ref" value={principalRef} />}
            </div>
            {notes && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-xs font-medium text-muted-foreground">Notes</span>
                <p className="text-sm mt-1">{notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Navigation ── */}
      {error && <p className="text-sm text-destructive mt-3">{error}</p>}

      <div className="flex gap-3 justify-between mt-6">
        <div>
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} disabled={submitting}>
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={submitting}>
            Cancel
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Opening…' : 'Open Port Call'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Review Row ───────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-border/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
