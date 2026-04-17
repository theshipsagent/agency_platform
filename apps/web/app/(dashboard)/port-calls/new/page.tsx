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
  id: string
  name: string
  imo_number: string
  flag_state: string
  vessel_type: string
  source?: 'registered' | 'register'
  dwt?: number | null
  gt?: number | null
}

type RegisterResult = {
  id: string          // imo used as id from API
  name: string
  imo_number: string
  flag_state: string
  vessel_type: string
  dwt?: number | null
  gt?: number | null
  source: 'register'
}

type Org = { id: string; name: string; type: string }
type Port = { id: string; name: string; un_locode: string; country: string }
type Terminal = { id: string; port_id: string; name: string; type: string }
type ForeignPort = {
  schedule_k_code: string
  port_name: string
  country_name: string
  latitude: number | null
  longitude: number | null
  is_official: boolean
}
type UsPort = {
  cbp_code: string
  port_name: string
  region: string
  state: string
}
type Office = { id: string; name: string; code: string }

// ─── Static options ───────────────────────────────────────────────────────────

const PORT_CALL_TYPE_OPTIONS = [
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

const SERVICE_SCOPE_OPTIONS = [
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
  { value: 'STEVEDORING_COORDINATION', label: 'Stevedoring Coordination' },
  { value: 'LAUNCH_WATER_TAXI', label: 'Launch / Water Taxi' },
  { value: 'WASTE_REMOVAL', label: 'Waste Removal' },
  { value: 'IMMIGRATION_SHORE_LEAVE', label: 'Immigration / Shore Leave' },
]

// ─── Vessel combobox ──────────────────────────────────────────────────────────
// Searches tenant vessels + global ships_register. Selecting from the register
// auto-registers the vessel into the tenant's vessels table.

function VesselCombobox({
  selected,
  onSelect,
}: {
  selected: Vessel | null
  onSelect: (v: Vessel) => void
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
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [])

  useEffect(() => { search('') }, [search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function selectFromRegister(reg: RegisterResult) {
    setRegistering(true)
    setOpen(false)
    try {
      const res = await fetch('/api/vessels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imo: reg.imo_number }),
      })
      const data = await res.json() as { id: string; name: string; imo_number: string }
      onSelect({
        id: data.id,
        name: data.name,
        imo_number: data.imo_number,
        flag_state: reg.flag_state,
        vessel_type: reg.vessel_type,
        source: 'registered',
      })
    } finally {
      setRegistering(false)
      setQuery('')
    }
  }

  const showEmpty = !loading && tenantVessels.length === 0 && registerResults.length === 0

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={open ? query : (selected ? selected.name : '')}
          placeholder="Search by vessel name or IMO number…"
          disabled={registering}
          onFocus={() => { setQuery(''); setOpen(true); search('') }}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value) }}
        />
        {selected && !open && (
          <button
            type="button"
            onClick={() => { onSelect(null as unknown as Vessel); setQuery('') }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
          >
            ✕
          </button>
        )}
        {registering && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            Registering…
          </span>
        )}
      </div>

      {/* Selected vessel detail strip */}
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
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
          )}
          {showEmpty && (
            <div className="px-3 py-3 text-sm text-muted-foreground">No vessels found</div>
          )}

          {/* Tenant-registered vessels */}
          {tenantVessels.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b">
                Registered vessels
              </div>
              {tenantVessels.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                    selected?.id === v.id && 'bg-accent font-medium'
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onSelect(v)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <span className="font-medium">{v.name}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    IMO {v.imo_number}
                    {v.flag_state && ` · ${v.flag_state}`}
                    {v.vessel_type && ` · ${v.vessel_type}`}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Ships register results */}
          {registerResults.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-t">
                Ships register — select to add
              </div>
              {registerResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    void selectFromRegister(r)
                  }}
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    IMO {r.imo_number}
                    {r.vessel_type && ` · ${r.vessel_type}`}
                    {r.dwt ? ` · ${Math.round(r.dwt / 1000)}K DWT` : ''}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Generic combobox (principals) ───────────────────────────────────────────

function SearchCombobox<T extends { id: string; name: string }>({
  placeholder,
  fetchUrl,
  selected,
  onSelect,
  renderItem,
}: {
  placeholder: string
  fetchUrl: (q: string) => string
  selected: T | null
  onSelect: (item: T) => void
  renderItem: (item: T) => React.ReactNode
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(
    (q: string) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        setLoading(true)
        try {
          const res = await fetch(fetchUrl(q))
          setResults(await res.json() as T[])
          setOpen(true)
        } finally {
          setLoading(false)
        }
      }, 250)
    },
    [fetchUrl]
  )

  useEffect(() => { search('') }, [search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
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
        <button
          type="button"
          onClick={() => { onSelect(null as unknown as T); setQuery('') }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
        >
          ✕
        </button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
          {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>}
          {!loading && results.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>}
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                selected?.id === item.id && 'bg-accent font-medium'
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(item)
                setOpen(false)
                setQuery('')
              }}
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function NewPortCallPage() {
  const router = useRouter()

  const [portCallType, setPortCallType] = useState('')
  const [serviceScope, setServiceScope] = useState<string[]>([])
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null)
  const [selectedPrincipal, setSelectedPrincipal] = useState<Org | null>(null)
  const [selectedPort, setSelectedPort] = useState('')
  const [selectedTerminal, setSelectedTerminal] = useState('')
  const [selectedOffice, setSelectedOffice] = useState('')
  const [offices, setOffices] = useState<Office[]>([])
  const [eta, setEta] = useState('')
  const [notes, setNotes] = useState('')

  const [ports, setPorts] = useState<Port[]>([])
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [foreignQuery, setForeignQuery] = useState('')
  const [foreignResults, setForeignResults] = useState<ForeignPort[]>([])
  const [foreignOpen, setForeignOpen] = useState(false)
  const [foreignLoading, setForeignLoading] = useState(false)
  const [usQuery, setUsQuery] = useState('')
  const [usResults, setUsResults] = useState<UsPort[]>([])
  const [usOpen, setUsOpen] = useState(false)
  const [usLoading, setUsLoading] = useState(false)
  const [registeringPort, setRegisteringPort] = useState(false)
  const foreignTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const foreignRef = useRef<HTMLDivElement>(null)
  const usRef = useRef<HTMLDivElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/ports')
      .then((r) => r.json())
      .then((data: { ports: Port[]; terminals: Terminal[] }) => {
        setPorts(data.ports)
        setTerminals(data.terminals)
      })
      .catch(() => {})
    fetch('/api/offices')
      .then((r) => r.json())
      .then((data: Office[]) => setOffices(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (foreignRef.current && !foreignRef.current.contains(e.target as Node)) setForeignOpen(false)
      if (usRef.current && !usRef.current.contains(e.target as Node)) setUsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function searchForeignPorts(q: string) {
    if (foreignTimer.current) clearTimeout(foreignTimer.current)
    if (!q.trim()) { setForeignResults([]); return }
    foreignTimer.current = setTimeout(async () => {
      setForeignLoading(true)
      try {
        const res = await fetch(`/api/ports?foreign=1&q=${encodeURIComponent(q)}`)
        const data = await res.json() as { foreignPorts: ForeignPort[] }
        setForeignResults(data.foreignPorts ?? [])
        setForeignOpen(true)
      } finally {
        setForeignLoading(false)
      }
    }, 250)
  }

  function searchUsPorts(q: string) {
    if (usTimer.current) clearTimeout(usTimer.current)
    if (!q.trim()) { setUsResults([]); return }
    usTimer.current = setTimeout(async () => {
      setUsLoading(true)
      try {
        const res = await fetch(`/api/ports?us=1&q=${encodeURIComponent(q)}`)
        const data = await res.json() as { usPorts: UsPort[] }
        setUsResults(data.usPorts ?? [])
        setUsOpen(true)
      } finally {
        setUsLoading(false)
      }
    }, 250)
  }

  async function selectUsPort(up: UsPort) {
    setUsOpen(false)
    setUsQuery('')
    setRegisteringPort(true)
    try {
      const res = await fetch('/api/ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cbpCode: up.cbp_code }),
      })
      const data = await res.json() as { id: string; name: string; un_locode: string }
      setPorts((prev) => {
        if (prev.find((p) => p.id === data.id)) return prev
        return [...prev, { id: data.id, name: data.name, un_locode: data.un_locode, country: 'US' }]
      })
      setSelectedPort(data.id)
      setSelectedTerminal('')
    } finally {
      setRegisteringPort(false)
    }
  }

  async function selectForeignPort(fp: ForeignPort) {
    setForeignOpen(false)
    setForeignQuery('')
    setRegisteringPort(true)
    try {
      const res = await fetch('/api/ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleKCode: fp.schedule_k_code }),
      })
      const data = await res.json() as { id: string; name: string; un_locode: string }
      // Add to local ports list and select it
      setPorts((prev) => {
        if (prev.find((p) => p.id === data.id)) return prev
        return [...prev, { id: data.id, name: data.name, un_locode: data.un_locode, country: fp.country_name }]
      })
      setSelectedPort(data.id)
      setSelectedTerminal('')
    } finally {
      setRegisteringPort(false)
    }
  }

  const portTerminals = terminals.filter((t) => t.port_id === selectedPort)

  function toggleScope(value: string) {
    setServiceScope((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!portCallType || !selectedOffice || !selectedVessel || !selectedPrincipal || !selectedPort) {
      setError('Port call type, office, vessel, principal, and port are required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/port-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portCallType,
          serviceScope,
          vesselId: selectedVessel.id,
          principalId: selectedPrincipal.id,
          portId: selectedPort,
          terminalId: selectedTerminal || undefined,
          officeId: selectedOffice || undefined,
          eta: eta || undefined,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Failed to create port call')
      }

      const data = await res.json() as { id: string }
      router.push(`/port-calls/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Open Port Call</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Capture the appointment details to open the file.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Type & Scope ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Appointment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Port Call Type <span className="text-destructive">*</span></Label>
                <Select value={portCallType} onValueChange={setPortCallType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PORT_CALL_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Office <span className="text-destructive">*</span></Label>
                <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select office…" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                        <span className="ml-1 text-muted-foreground text-xs">({o.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Service Scope</Label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICE_SCOPE_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors',
                      serviceScope.includes(o.value)
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-input hover:bg-muted/50'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={serviceScope.includes(o.value)}
                      onChange={() => toggleScope(o.value)}
                    />
                    <span
                      className={cn(
                        'h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center',
                        serviceScope.includes(o.value)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input'
                      )}
                    >
                      {serviceScope.includes(o.value) && (
                        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="currentColor">
                          <path d="M1.5 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Vessel & Principal ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vessel & Principal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Vessel <span className="text-destructive">*</span></Label>
              <VesselCombobox
                selected={selectedVessel}
                onSelect={setSelectedVessel}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Principal <span className="text-destructive">*</span></Label>
              <SearchCombobox<Org>
                placeholder="Search principals…"
                fetchUrl={(q) => `/api/organizations?q=${encodeURIComponent(q)}&principals=true`}
                selected={selectedPrincipal}
                onSelect={setSelectedPrincipal}
                renderItem={(o) => (
                  <div>
                    <span className="font-medium">{o.name}</span>
                    <span className="ml-2 text-muted-foreground text-xs">
                      {o.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Port & ETA ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Port & ETA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Port <span className="text-destructive">*</span></Label>
                <Select
                  value={selectedPort}
                  onValueChange={(v) => { setSelectedPort(v); setSelectedTerminal('') }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select port…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ports.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        <span className="ml-1 text-muted-foreground text-xs">({p.un_locode})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* US port search — CBP Schedule D */}
                <div ref={usRef} className="relative">
                  <Input
                    value={usQuery}
                    placeholder="Search US ports (CBP Schedule D)…"
                    disabled={registeringPort}
                    onChange={(e) => { setUsQuery(e.target.value); searchUsPorts(e.target.value) }}
                    onFocus={() => { if (usResults.length > 0) setUsOpen(true) }}
                    className="text-xs"
                  />
                  {usOpen && usResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
                      {usLoading && <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>}
                      {usResults.map((up) => (
                        <button
                          key={up.cbp_code}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                          onMouseDown={(e) => { e.preventDefault(); void selectUsPort(up) }}
                        >
                          <span className="font-medium">{up.port_name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            CBP {up.cbp_code}{up.state ? ` · ${up.state}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Foreign port search — Schedule K */}
                <div ref={foreignRef} className="relative">
                  <Input
                    value={foreignQuery}
                    placeholder="Search foreign ports (Schedule K)…"
                    disabled={registeringPort}
                    onChange={(e) => { setForeignQuery(e.target.value); searchForeignPorts(e.target.value) }}
                    onFocus={() => { if (foreignResults.length > 0) setForeignOpen(true) }}
                    className="text-xs"
                  />
                  {registeringPort && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Adding…</span>
                  )}
                  {foreignOpen && foreignResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
                      {foreignLoading && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                      )}
                      {foreignResults.map((fp) => (
                        <button
                          key={`${fp.schedule_k_code}-${fp.port_name}`}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                          onMouseDown={(e) => { e.preventDefault(); void selectForeignPort(fp) }}
                        >
                          <span className={cn('font-medium', !fp.is_official && 'text-muted-foreground italic')}>
                            {fp.port_name}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {fp.country_name} · K{fp.schedule_k_code}
                            {!fp.is_official && ' · alias'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Terminal</Label>
                <Select
                  value={selectedTerminal}
                  onValueChange={setSelectedTerminal}
                  disabled={!selectedPort || portTerminals.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !selectedPort ? 'Select port first'
                          : portTerminals.length === 0 ? 'No terminals'
                          : 'Select terminal…'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {portTerminals.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        <span className="ml-1 text-muted-foreground text-xs">({t.type})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eta">ETA</Label>
              <Input
                id="eta"
                type="datetime-local"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="w-60"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Notes ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any initial remarks or instructions from the principal…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Opening…' : 'Open Port Call'}
          </Button>
        </div>
      </form>
    </div>
  )
}
