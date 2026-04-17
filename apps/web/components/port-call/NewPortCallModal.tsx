'use client'

import { useState } from 'react'
import { Plus, AlertTriangle, AlertCircle, CheckCircle2, Search, ChevronDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils/cn'

// ─── Placeholder data ─────────────────────────────────────────────────────────

const OFFICES = [
  { id: '1', code: 'NOL', name: 'New Orleans' },
  { id: '2', code: 'HOU', name: 'Houston' },
  { id: '3', code: 'MOB', name: 'Mobile' },
]

const PORT_CALL_TYPES = [
  'Discharge', 'Load', 'Load & Discharge', 'Transshipment',
  'Bunkering Only', 'Crew Change Only', 'Repairs / Drydock',
  'Lay-Up', 'Transit', 'Survey / Inspection',
]

const CARGO_GROUPS = [
  'Dry Bulk', 'Break Bulk', 'Tanker — Clean', 'Tanker — Dirty',
  'Container', 'RoRo', 'Gas Carrier', 'Project Cargo',
  'Bunkering', 'Passenger',
]

const SERVICE_SCOPE_OPTIONS = [
  { value: 'FULL_AGENCY',               label: 'Full Agency' },
  { value: 'HUSBANDRY_ONLY',            label: 'Husbandry' },
  { value: 'PROTECTING_AGENCY',         label: 'Protecting' },
  { value: 'CUSTOMS_CLEARANCE',         label: 'Customs Clearance' },
  { value: 'CREW_CHANGE',               label: 'Crew Change' },
  { value: 'STORES_PROVISIONS',         label: 'Stores / Provisions' },
  { value: 'CASH_TO_MASTER',            label: 'Cash to Master' },
  { value: 'BUNKER_COORDINATION',       label: 'Bunker Coordination' },
  { value: 'STEVEDORING_COORDINATION',  label: 'Stevedoring' },
  { value: 'IMMIGRATION_SHORE_LEAVE',   label: 'Immigration' },
  { value: 'MEDICAL',                   label: 'Medical' },
  { value: 'WASTE_REMOVAL',             label: 'Waste Removal' },
]

// Mock customer profiles with account flags
const MOCK_CUSTOMERS = [
  { id: 'c1', name: 'Pacific Basin Shipping',   type: 'Owner',      flag: null },
  { id: 'c2', name: 'Klaveness Combination',    type: 'Charterer',  flag: { level: 'warn',  message: 'Cash only · Avg funding lead: 12 days' } },
  { id: 'c3', name: 'Oldendorff Carriers',      type: 'Owner',      flag: { level: 'hold',  message: 'Account on hold — manager approval required' } },
  { id: 'c4', name: 'Cargill Ocean Transport',  type: 'Charterer',  flag: { level: 'info',  message: 'PDA payer · Avg settlement: 8 days' } },
  { id: 'c5', name: 'Norden Bulk',              type: 'Owner',      flag: null },
  { id: 'c6', name: 'Genco Shipping',           type: 'Owner',      flag: null },
  { id: 'c7', name: 'Bunge Limited',            type: 'Charterer',  flag: { level: 'warn',  message: 'Supplemental PDA required · Credit limit $25,000' } },
]

type Customer = typeof MOCK_CUSTOMERS[0]
type Flag = { level: string; message: string }

// ─── Sub-components ───────────────────────────────────────────────────────────

function NativeSelect({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-9 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          !value && 'text-muted-foreground'
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
    </div>
  )
}

function PartyFlag({ flag }: { flag: Flag }) {
  const styles: Record<string, string> = {
    hold: 'bg-red-50 border-red-200 text-red-700',
    warn: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  }
  const icons: Record<string, React.ReactNode> = {
    hold: <AlertCircle className="h-3 w-3 flex-shrink-0" />,
    warn: <AlertTriangle className="h-3 w-3 flex-shrink-0" />,
    info: <CheckCircle2 className="h-3 w-3 flex-shrink-0" />,
  }
  return (
    <div className={cn('flex items-center gap-1.5 rounded border px-2 py-1 text-xs mt-1', styles[flag.level])}>
      {icons[flag.level]}
      {flag.message}
    </div>
  )
}

function PartySearch({
  label,
  required,
  selected,
  onSelect,
  sameAsLabel,
  sameAsValue,
  onSameAs,
}: {
  label: string
  required?: boolean
  selected: Customer | null
  onSelect: (c: Customer | null) => void
  sameAsLabel?: string
  sameAsValue?: boolean
  onSameAs?: (v: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = query.length > 0
    ? MOCK_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : MOCK_CUSTOMERS

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {sameAsLabel && onSameAs && (
          <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={sameAsValue}
              onChange={(e) => onSameAs(e.target.checked)}
            />
            Same as {sameAsLabel}
          </label>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={sameAsValue ? '' : (open ? query : (selected?.name ?? ''))}
          placeholder={sameAsValue ? `Same as ${sameAsLabel}` : `Search customers…`}
          disabled={sameAsValue}
          className="pl-8 h-9 text-sm"
          onFocus={() => { if (!sameAsValue) { setQuery(''); setOpen(true) } }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && !sameAsValue && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-44 overflow-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">No customers found</div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                onMouseDown={() => { onSelect(c); setOpen(false); setQuery('') }}
              >
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{c.type}</span>
                {c.flag?.level === 'hold' && (
                  <span className="ml-2 text-[10px] text-red-600 font-medium">● On Hold</span>
                )}
                {c.flag?.level === 'warn' && (
                  <span className="ml-2 text-[10px] text-yellow-600 font-medium">⚠ Warning</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && !sameAsValue && selected.flag && <PartyFlag flag={selected.flag} />}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function NewPortCallModal() {
  const [open, setOpen] = useState(false)

  // Form state
  const [office, setOffice]               = useState('')
  const [portCallType, setPortCallType]   = useState('')
  const [cargoGroup, setCargoGroup]       = useState('')
  const [vessel, setVessel]               = useState('')
  const [port, setPort]                   = useState('')
  const [terminal, setTerminal]           = useState('')
  const [eta, setEta]                     = useState('')
  const [voyageNo, setVoyageNo]           = useState('')
  const [externalRef, setExternalRef]     = useState('')
  const [notes, setNotes]                 = useState('')
  const [serviceScope, setServiceScope]   = useState<string[]>([])

  const [appointing, setAppointing]       = useState<Customer | null>(null)
  const [charterer, setCharterer]         = useState<Customer | null>(null)
  const [nominator, setNominator]         = useState<Customer | null>(null)
  const [nominatorSameAs, setNominatorSameAs] = useState(false)

  const selectedOffice = OFFICES.find((o) => o.id === office)
  const filePreview = selectedOffice ? `${selectedOffice.code}-2026-00001` : '—'

  const hasHold = appointing?.flag?.level === 'hold' || charterer?.flag?.level === 'hold'
    || (!nominatorSameAs && nominator?.flag?.level === 'hold')

  function toggleScope(v: string) {
    setServiceScope((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])
  }

  function handleReset() {
    setOffice(''); setPortCallType(''); setCargoGroup(''); setVessel('')
    setPort(''); setTerminal(''); setEta(''); setVoyageNo(''); setExternalRef('')
    setNotes(''); setServiceScope([]); setAppointing(null); setCharterer(null)
    setNominator(null); setNominatorSameAs(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset() }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          New Port Call
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="text-base font-semibold">New Port Call</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">

          {/* ── Row 1: Office + Port Call Type ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Office<span className="text-destructive ml-0.5">*</span></Label>
              <NativeSelect placeholder="Select office…" options={OFFICES.map((o) => o.name)} value={OFFICES.find((o) => o.id === office)?.name ?? ''} onChange={(v) => setOffice(OFFICES.find((o) => o.name === v)?.id ?? '')} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Port Call Type<span className="text-destructive ml-0.5">*</span></Label>
              <NativeSelect placeholder="Select type…" options={PORT_CALL_TYPES} value={portCallType} onChange={setPortCallType} />
            </div>
          </div>

          {/* ── Row 2: Vessel (full width) ── */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Vessel<span className="text-destructive ml-0.5">*</span></Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={vessel}
                onChange={(e) => setVessel(e.target.value)}
                placeholder="Search by vessel name or IMO number…"
                className="pl-8 h-9 text-sm"
              />
            </div>
            {vessel && (
              <div className="flex gap-4 text-xs text-muted-foreground px-1 pt-0.5">
                <span>IMO 9387000</span>
                <span>Flag: HK</span>
                <span>Bulk Carrier</span>
                <span>87,000 DWT</span>
                <span>LOA 229m</span>
              </div>
            )}
          </div>

          {/* ── Row 3: Appointing Party + Charterer ── */}
          <div className="grid grid-cols-2 gap-4">
            <PartySearch label="Appointing Party" required selected={appointing} onSelect={setAppointing} />
            <PartySearch label="Charterer" selected={charterer} onSelect={setCharterer} />
          </div>

          {/* ── Row 4: Nominator + Cargo Group ── */}
          <div className="grid grid-cols-2 gap-4">
            <PartySearch
              label="Nominator"
              selected={nominator}
              onSelect={setNominator}
              sameAsLabel="Appointing Party"
              sameAsValue={nominatorSameAs}
              onSameAs={setNominatorSameAs}
            />
            <div className="space-y-1">
              <Label className="text-xs font-medium">Cargo Group</Label>
              <NativeSelect placeholder="Select cargo group…" options={CARGO_GROUPS} value={cargoGroup} onChange={setCargoGroup} />
            </div>
          </div>

          {/* ── Row 5: Port + Terminal ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Port<span className="text-destructive ml-0.5">*</span></Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="Search US or foreign ports…" className="pl-8 h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Terminal / Berth</Label>
              <Input value={terminal} onChange={(e) => setTerminal(e.target.value)} placeholder="e.g. Nashville Ave Wharf, Berth 7" className="h-9 text-sm" />
            </div>
          </div>

          {/* ── Row 6: ETA + Service Scope ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">ETA</Label>
              <Input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Service Scope</Label>
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_SCOPE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggleScope(o.value)}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                      serviceScope.includes(o.value)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Row 7: Voyage No + External Ref ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Voyage Number</Label>
              <Input value={voyageNo} onChange={(e) => setVoyageNo(e.target.value)} placeholder="e.g. 2026-014N" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">External Ref No.</Label>
              <Input value={externalRef} onChange={(e) => setExternalRef(e.target.value)} placeholder="Principal's reference number" className="h-9 text-sm" />
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Initial instructions or remarks from appointing party…" rows={2} className="text-sm resize-none" />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className={cn(
          'px-6 py-4 border-t flex items-center justify-between sticky bottom-0 bg-background',
          hasHold && 'bg-red-50'
        )}>
          <div className="text-sm">
            {hasHold ? (
              <span className="flex items-center gap-1.5 text-red-700 font-medium">
                <AlertCircle className="h-4 w-4" />
                Account on hold — manager approval required before opening file
              </span>
            ) : (
              <span className="text-muted-foreground">
                File No. <span className="font-mono font-semibold text-foreground">{filePreview}</span>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={hasHold}>
              Open File →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
