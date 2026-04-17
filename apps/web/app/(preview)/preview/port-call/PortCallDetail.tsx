'use client'

import { useState } from 'react'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:        '#0F1117',
  surface:   '#13151C',
  panel:     '#1A1D27',
  panelAlt:  '#161B26',
  input:     '#0D1017',
  border:    '#1F2328',
  borderMd:  '#2D3140',
  text:      '#FFFFFF',
  textSub:   '#F1F5F9',
  textMuted: '#CBD5E1',
  textDim:   '#8899A6',
  textFaint: '#4B5563',
  primary:   '#3B82F6',
  matrix:    '#00E676',
  green:     '#10B981',
  yellow:    '#F59E0B',
  orange:    '#D97706',
  red:       '#EF4444',
  purple:    '#7C3AED',
  teal:      '#0EA5E9',
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
  .pc-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', system-ui, sans-serif; }
  .pc-root ::-webkit-scrollbar { width: 5px; height: 5px; }
  .pc-root ::-webkit-scrollbar-track { background: transparent; }
  .pc-root ::-webkit-scrollbar-thumb { background: #2D3140; border-radius: 3px; }
  @keyframes pc-fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pc-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  .pc-tab-btn { background:none; border:none; cursor:pointer; font-family:inherit; font-size:13px; font-weight:500; padding:10px 16px; color:#8899A6; border-bottom:2px solid transparent; transition:all .15s; white-space:nowrap; }
  .pc-tab-btn:hover { color:#F1F5F9; }
  .pc-tab-btn.active { color:#60A5FA; border-bottom-color:#3B82F6; }
  .pc-tab-btn.active-green { color:#34D399; border-bottom-color:#10B981; }
  .pc-tab-btn.active-yellow { color:#FCD34D; border-bottom-color:#F59E0B; }
  .pc-sub-tab { background:none; border:none; cursor:pointer; font-family:inherit; font-size:12px; font-weight:500; padding:6px 12px; border-radius:20px; color:#8899A6; transition:all .15s; }
  .pc-sub-tab:hover { color:#F1F5F9; background:rgba(255,255,255,0.04); }
  .pc-sub-tab.active { color:#FFFFFF; background:rgba(59,130,246,0.15); }
  .pc-btn { border:none; cursor:pointer; font-family:inherit; font-size:12px; font-weight:500; padding:0 14px; height:30px; border-radius:5px; transition:all .15s; display:inline-flex; align-items:center; gap:6px; }
  .pc-btn-primary { background:#3B82F6; color:#fff; }
  .pc-btn-primary:hover { background:#2563EB; }
  .pc-btn-ghost { background:transparent; border:1px solid #2D3140; color:#CBD5E1; }
  .pc-btn-ghost:hover { background:#1F2937; color:#fff; border-color:#374151; }
  .pc-btn-matrix { background:rgba(0,230,118,0.1); border:1px solid rgba(0,230,118,0.3); color:#00E676; }
  .pc-btn-matrix:hover { background:rgba(0,230,118,0.18); }
  .pc-btn-yellow { background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); color:#F59E0B; }
  .pc-btn-yellow:hover { background:rgba(245,158,11,0.18); }
  .pc-row:hover { background:rgba(255,255,255,0.03) !important; }
  .pc-kpi-card { background:#13151C; border:1px solid #1F2328; border-radius:8px; padding:14px 18px; }
  .pc-card { background:#13151C; border:1px solid #1F2328; border-radius:8px; padding:20px; }
  .pc-expense-row { display:grid; grid-template-columns:2fr 1.5fr 3fr 1fr 1fr 1fr; align-items:center; padding:10px 16px; border-bottom:1px solid #1F2328; font-size:12px; }
  .pc-expense-row:hover { background:rgba(255,255,255,0.02); }
  .pc-timeline-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; margin-top:4px; }
  .pc-doc-card { background:#161B26; border:1px solid #2D3140; border-radius:7px; padding:14px; cursor:pointer; transition:all .15s; }
  .pc-doc-card:hover { border-color:#4B5563; background:#1A1F2E; }
  .pc-drop-zone { border:2px dashed #2D3140; border-radius:8px; padding:32px; text-align:center; cursor:pointer; transition:all .15s; }
  .pc-drop-zone:hover { border-color:#3B82F6; background:rgba(59,130,246,0.04); }
  .pc-task-row { display:flex; align-items:center; gap:12px; padding:10px 16px; border-bottom:1px solid #1F2328; font-size:13px; }
  .pc-task-row:hover { background:rgba(255,255,255,0.02); }
`

// ─── Placeholder data ──────────────────────────────────────────────────────────

const PC = {
  fileNo:     'NOL-2026-00847',
  phase:      'ACTIVE',
  subStatus:  'WORKING_CARGO',
  fileStatus: 'ACTIVE',
  vessel:     'MV STELLAR HORIZON',
  imo:        '9876543',
  flag:       'MH',
  type:       'Bulk Carrier',
  dwt:        '82,400',
  loa:        '229m',
  gt:         '44,200',
  principal:  'Pacific Basin Shipping',
  charterer:  'Cargill Ocean Transport',
  nominator:  'Pacific Basin Shipping',
  owner:      'Stellar Maritime Ltd.',
  shipMgr:    'Pacific Basin Ship Management',
  agent:      'W. Davis',
  office:     'New Orleans (NOL)',
  port:       'Port of New Orleans',
  terminal:   'Nashville Ave Wharf — Berths 5–9',
  cargo:      'Pet Coke',
  cargoGrp:   'Dry Bulk',
  qty:        '54,200 MT',
  eta:        '2026-03-08 06:00',
  norTime:    '2026-03-08 14:00',
  allFast:    '2026-03-09 02:00',
  commenced:  '2026-03-09 08:00',
  completed:  null as string | null,
  sailed:     null as string | null,
  voyageNo:   '2026-014N',
  extRef:     'PB-NOL-2026-089',
  proforma:   87500,
  funded:     62000,
  actual:     52400,
  agencyFee:  8400,
}

const PHASES = [
  { key: 'PROFORMA_ESTIMATED',  label: 'Proforma',     short: '1' },
  { key: 'AWAITING_APPOINTMENT',label: 'Awaiting Appt',short: '2' },
  { key: 'APPOINTED',           label: 'Appointed',    short: '3' },
  { key: 'ACTIVE',              label: 'In Port',      short: '4' },
  { key: 'SAILED',              label: 'Sailed',       short: '5' },
  { key: 'COMPLETED',           label: 'Completed',    short: '6' },
  { key: 'PROCESSING_FDA',      label: 'FDA',          short: '7' },
  { key: 'AWAITING_PAYMENT',    label: 'Awaiting Pmt', short: '8' },
  { key: 'SETTLED',             label: 'Settled',      short: '9' },
]

// Voyage DA expenses (Principal/Charterer pays)
const VOYAGE_EXPENSES = [
  { id:1, vendor:'NOBRA Pilots',         cat:'Pilotage',    desc:'Bar pilot inbound + NOBRA',            proforma:18400, actual:18400, status:'PAID'     },
  { id:2, vendor:'Crescent Towing',      cat:'Towage',      desc:'Inbound assist — 2 tugs',              proforma:12400, actual:12400, status:'INVOICED'  },
  { id:3, vendor:'Port of New Orleans',  cat:'Wharfage',    desc:'Nashville Ave 5–9 · 6 days est.',      proforma:9800,  actual:null,  status:'ACCRUED'   },
  { id:4, vendor:'Associated Terminals', cat:'Stevedoring', desc:'Discharge pet coke @ $4.25/MT',        proforma:23000, actual:null,  status:'ESTIMATED' },
  { id:5, vendor:'CBP',                  cat:'Tonnage Tax', desc:'Formal entry $0.27/NT',                proforma:6480,  actual:6480,  status:'PAID'      },
  { id:6, vendor:'Higgins Marine Svcs',  cat:'Surveyors',   desc:'Draft survey arrival & departure',     proforma:2200,  actual:null,  status:'ESTIMATED' },
  { id:7, vendor:'Agency',               cat:'Agency Fee',  desc:'Port agency fee — per agreement',      proforma:8400,  actual:8400,  status:'ACCRUED'   },
]

// Husbandry DA expenses (Shipowner/Manager pays)
const HUSB_EXPENSES = [
  { id:1, vendor:'LaFleur Launch Svc',   cat:'Launch',       desc:'Crew change transport × 2',           proforma:1800, actual:1800, status:'INVOICED'  },
  { id:2, vendor:'Gulf South Maritime',  cat:'Provisions',   desc:'Stores delivery — deck & engine',     proforma:3400, actual:3400, status:'PAID'      },
  { id:3, vendor:'NOLA Medical Svc',     cat:'Medical',      desc:'Crew medical — 1 seafarer',           proforma:650,  actual:null, status:'ESTIMATED' },
  { id:4, vendor:'Crescent Towing',      cat:'Shifting',     desc:'Vessel shift berth — 1 tug',          proforma:4200, actual:null, status:'ESTIMATED' },
  { id:5, vendor:'Agency',               cat:'Husbandry Fee',desc:'Husbandry agency fee',                proforma:1200, actual:1200, status:'ACCRUED'   },
]

const VOYAGE_FUNDING = [
  { id:1, desc:'Proforma DA sent to principal',       amount:87500, date:'2026-03-06', status:'REQUESTED' },
  { id:2, desc:'Pacific Basin — Wire #1',             amount:45000, date:'2026-03-07', status:'RECEIVED',  ref:'PB-WIRE-2026-0312' },
  { id:3, desc:'Pacific Basin — Wire #2',             amount:17000, date:'2026-03-10', status:'RECEIVED',  ref:'PB-WIRE-2026-0341' },
  { id:4, desc:'Supplemental request (overage)',      amount:5500,  date:'2026-03-11', status:'REQUESTED' },
]

const HUSB_FUNDING = [
  { id:1, desc:'Husbandry proforma sent to ship mgmt',amount:11250, date:'2026-03-07', status:'REQUESTED' },
  { id:2, desc:'Pacific Basin Ship Mgmt — Wire #1',   amount:6000,  date:'2026-03-09', status:'RECEIVED',  ref:'PBSM-WIRE-2026-0088' },
]

const TIMELINE = [
  { id:1, event:'ETA Received',                time:'2026-03-06 10:00', source:'Principal',  confirmed:true  },
  { id:2, event:'Vessel Arrived Pilot Station',time:'2026-03-08 05:45', source:'AIS / Pilot',confirmed:true  },
  { id:3, event:'NOR Tendered',                time:'2026-03-08 14:00', source:'Master',     confirmed:true  },
  { id:4, event:'NOR Accepted',                time:'2026-03-08 14:00', source:'Receiver',   confirmed:true  },
  { id:5, event:'Free Pratique Granted',       time:'2026-03-08 14:30', source:'CBP / USPH', confirmed:true  },
  { id:6, event:'All Fast',                    time:'2026-03-09 02:00', source:'Terminal',   confirmed:true  },
  { id:7, event:'Hatch Survey Completed',      time:'2026-03-09 06:30', source:'Surveyor',   confirmed:true  },
  { id:8, event:'Commenced Discharge',         time:'2026-03-09 08:00', source:'Terminal',   confirmed:true  },
  { id:9, event:'Rain Delay Start',            time:'2026-03-10 14:00', source:'Terminal',   confirmed:true  },
  { id:10,event:'Rain Delay End',              time:'2026-03-10 20:00', source:'Terminal',   confirmed:true  },
  { id:11,event:'Completed Discharge (Est)',   time:'2026-03-13 12:00', source:'Estimate',   confirmed:false },
  { id:12,event:'Sailed (Est)',                time:'2026-03-13 18:00', source:'Estimate',   confirmed:false },
]

const DOCUMENTS = [
  { id:1, name:'Notice of Readiness',          type:'NOR',     date:'2026-03-08', source:'email',  size:'142 KB' },
  { id:2, name:'CBP Formal Entry 3461',         type:'Customs', date:'2026-03-08', source:'email',  size:'88 KB'  },
  { id:3, name:'Statement of Facts (Draft)',    type:'SOF',     date:'2026-03-10', source:'system', size:'64 KB'  },
  { id:4, name:'Draft Survey — Arrival',        type:'Survey',  date:'2026-03-09', source:'email',  size:'312 KB' },
  { id:5, name:'Proforma DA',                   type:'PDA',     date:'2026-03-07', source:'system', size:'98 KB'  },
  { id:6, name:'Crew List',                     type:'Crew',    date:'2026-03-08', source:'email',  size:'54 KB'  },
  { id:7, name:'Stores Receipt — Gulf South',   type:'Receipt', date:'2026-03-09', source:'scan',   size:'201 KB' },
  { id:8, name:'NOBRA Pilot Invoice',           type:'Invoice', date:'2026-03-08', source:'email',  size:'76 KB'  },
  { id:9, name:'CBP Tonnage Tax Receipt',       type:'Receipt', date:'2026-03-08', source:'email',  size:'43 KB'  },
]

const TASKS = [
  { id:1,  desc:'Confirm NOR tendered and accepted',       due:'2026-03-08', status:'DONE',        auto:true,  assignee:'W. Davis' },
  { id:2,  desc:'File CBP Formal Entry (3461)',             due:'2026-03-08', status:'DONE',        auto:true,  assignee:'W. Davis' },
  { id:3,  desc:'Arrange draft survey — arrival',          due:'2026-03-09', status:'DONE',        auto:true,  assignee:'W. Davis' },
  { id:4,  desc:'Submit proforma DA to principal',         due:'2026-03-07', status:'DONE',        auto:true,  assignee:'W. Davis' },
  { id:5,  desc:'Open husbandry file — ship mgmt contacted',due:'2026-03-08',status:'DONE',        auto:false, assignee:'W. Davis' },
  { id:6,  desc:'Collect stevedoring invoice on completion',due:'2026-03-14',status:'IN_PROGRESS', auto:true,  assignee:'W. Davis' },
  { id:7,  desc:'Arrange draft survey — departure',        due:'2026-03-13', status:'PENDING',     auto:true,  assignee:'W. Davis' },
  { id:8,  desc:'Prepare Statement of Facts',              due:'2026-03-14', status:'IN_PROGRESS', auto:true,  assignee:'W. Davis' },
  { id:9,  desc:'Request supplemental voyage funding',     due:'2026-03-11', status:'DONE',        auto:false, assignee:'W. Davis' },
  { id:10, desc:'Confirm crew change arrangements',        due:'2026-03-11', status:'DONE',        auto:false, assignee:'W. Davis' },
  { id:11, desc:'Issue sailing notice to principal',       due:'2026-03-13', status:'PENDING',     auto:true,  assignee:'W. Davis' },
  { id:12, desc:'Collect husbandry outstanding invoices',  due:'2026-03-14', status:'PENDING',     auto:true,  assignee:'W. Davis' },
]

type MilestoneStatus   = 'DONE' | 'WARNING' | 'OVERDUE' | 'PENDING'
type MilestoneCategory = 'regulatory' | 'financial' | 'operational' | 'husbandry'

const MILESTONES: Array<{
  id: number; key: string; label: string; date: string | null
  category: MilestoneCategory; status: MilestoneStatus; note?: string; dueLabel?: string
}> = [
  { id:1,  key:'FILE_OPENED',  label:'File Opened',         date:'2026-03-01', category:'operational', status:'DONE' },
  { id:2,  key:'PDA_SENT',     label:'Proforma DA Sent',    date:'2026-03-07', category:'financial',   status:'DONE' },
  { id:3,  key:'HUSB_OPEN',    label:'Husbandry Opened',    date:'2026-03-08', category:'husbandry',   status:'DONE' },
  { id:4,  key:'USCG_96HR',    label:'USCG 96hr Notice',    date:'2026-03-04', category:'regulatory',  status:'OVERDUE', note:'Not filed — vessel arrived Mar 08', dueLabel:'Due Mar 04' },
  { id:5,  key:'FUNDING_REC',  label:'Full Funding Recv\'d',date:'2026-03-07', category:'financial',   status:'WARNING', note:'Partial — $25,500 outstanding',      dueLabel:'Due Mar 03' },
  { id:6,  key:'ARRIVAL',      label:'Vessel Arrived',      date:'2026-03-08', category:'operational', status:'DONE' },
  { id:7,  key:'NOR',          label:'NOR Tendered',        date:'2026-03-08', category:'operational', status:'DONE' },
  { id:8,  key:'ALL_FAST',     label:'All Fast',            date:'2026-03-09', category:'operational', status:'DONE' },
  { id:9,  key:'CARGO_START',  label:'Cargo Commenced',     date:'2026-03-09', category:'operational', status:'DONE' },
  { id:10, key:'CARGO_COMP',   label:'Cargo Complete',      date:null,         category:'operational', status:'WARNING', note:'In progress — est. Mar 13', dueLabel:'Est Mar 13' },
  { id:11, key:'SOF_PREP',     label:'SOF Prepared',        date:null,         category:'operational', status:'PENDING', dueLabel:'After sailed' },
  { id:12, key:'SAILED',       label:'Vessel Sailed',       date:null,         category:'operational', status:'PENDING', dueLabel:'Est Mar 13' },
  { id:13, key:'FDA_SUBMIT',   label:'FDA Submitted',       date:null,         category:'financial',   status:'PENDING', dueLabel:'Post-sailed' },
  { id:14, key:'HUSB_FDA',     label:'Husbandry FDA',       date:null,         category:'husbandry',   status:'PENDING', dueLabel:'Post-sailed' },
  { id:15, key:'SETTLED',      label:'Settled',             date:null,         category:'financial',   status:'PENDING', dueLabel:'TBD' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt$  = (n: number | null | undefined) => n != null ? `$${n.toLocaleString()}` : '—'
const fmtDt = (s: string | null) => {
  if (!s) return '—'
  const d = new Date(s.replace(' ', 'T'))
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + ' ' +
         d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false })
}

// ─── Icon helpers ──────────────────────────────────────────────────────────────

const IC = (d: string | React.ReactNode, size=16, color='currentColor') => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)
const IBack   = () => IC('M19 12H5M12 5l-7 7 7 7', 14)
const IPlus   = () => IC('M12 5v14M5 12h14', 13)
const IUpload = () => IC(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>, 13)
const IFile   = () => IC(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></>, 13)
const ICheck  = (s=13) => IC('M20 6L9 17l-5-5', s)
const IChevR  = () => IC('M9 18l6-6-6-6', 13)
const IClock  = () => IC(<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>, 13)
const IShip   = () => IC(<><path d="M2 20a2.4 2.4 0 002 1 2.4 2.4 0 002-1 2.4 2.4 0 012-1 2.4 2.4 0 012 1 2.4 2.4 0 002 1 2.4 2.4 0 002-1 2.4 2.4 0 012-1 2.4 2.4 0 012 1"/><path d="M4 18l-1-5h18l-1 5"/><path d="M12 2v7"/><path d="M7 9h10"/></>, 13)
const IAnchor = () => IC(<><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0020 0h-3"/></>, 16)
const IPrint  = () => IC(<><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>, 13)
const IAlert  = () => IC(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>, 13)
const ICargo  = () => IC(<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></>, 13)
const IWrench = () => IC(<><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></>, 13)

// ─── Status badge maps ─────────────────────────────────────────────────────────

const ESTATUS: Record<string,{label:string;color:string;bg:string}> = {
  ESTIMATED: { label:'Estimated', color:'#6B7280', bg:'rgba(107,114,128,0.12)' },
  ACCRUED:   { label:'Accrued',   color:'#D97706', bg:'rgba(217,119,6,0.12)'   },
  INVOICED:  { label:'Invoiced',  color:'#3B82F6', bg:'rgba(59,130,246,0.12)'  },
  VERIFIED:  { label:'Verified',  color:'#8B5CF6', bg:'rgba(139,92,246,0.12)'  },
  APPROVED:  { label:'Approved',  color:'#0EA5E9', bg:'rgba(14,165,233,0.12)'  },
  PAID:      { label:'Paid',      color:'#10B981', bg:'rgba(16,185,129,0.12)'  },
}

const TSTATUS: Record<string,{label:string;color:string}> = {
  DONE:        { label:'Done',        color:'#10B981' },
  IN_PROGRESS: { label:'In Progress', color:'#3B82F6' },
  PENDING:     { label:'Pending',     color:'#6B7280' },
  BLOCKED:     { label:'Blocked',     color:'#EF4444' },
}

type MStatus = MilestoneStatus
const MS_COLOR: Record<MStatus, string> = {
  DONE: '#00E676', WARNING: '#F59E0B', OVERDUE: '#EF4444', PENDING: '#2D3140',
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
      <h3 style={{ fontSize:13, fontWeight:700, color:T.text, textTransform:'uppercase', letterSpacing:'0.06em' }}>{title}</h3>
      {action}
    </div>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'7px 0', borderBottom:`1px solid ${T.border}` }}>
      <span style={{ fontSize:12, color:T.textDim, flexShrink:0, width:140 }}>{label}</span>
      <span style={{ fontSize:12, color:T.textSub, fontWeight:500, textAlign:'right', fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit' }}>{value}</span>
    </div>
  )
}

function StatusBadge({ s }: { s: keyof typeof ESTATUS }) {
  const es = ESTATUS[s] ?? ESTATUS.ESTIMATED
  return <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:600, background:es.bg, color:es.color }}>{es.label}</span>
}

// Shared expense table used by both Voyage DA and Husbandry tabs
function ExpenseTable({ expenses, title, accentColor }: {
  expenses: typeof VOYAGE_EXPENSES
  title: string
  accentColor: string
}) {
  const totalProforma = expenses.reduce((s, e) => s + e.proforma, 0)
  const totalActual   = expenses.reduce((s, e) => s + (e.actual ?? 0), 0)
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, overflow:'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:`1px solid ${T.border}` }}>
        <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{title}</span>
        <div style={{ display:'flex', gap:8 }}>
          <button className="pc-btn pc-btn-ghost">{IPlus()} Add Line</button>
          <button className="pc-btn pc-btn-ghost">{IPrint()} Export DA</button>
        </div>
      </div>
      <div className="pc-expense-row" style={{ background:T.panel, fontSize:10, fontWeight:700, color:T.textFaint, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:`2px solid ${T.border}` }}>
        <span>Vendor</span><span>Category</span><span>Description</span><span>Proforma</span><span>Actual</span><span>Status</span>
      </div>
      {expenses.map(e => (
        <div key={e.id} className="pc-expense-row pc-row">
          <span style={{ fontWeight:500, color:T.text, fontSize:13 }}>{e.vendor}</span>
          <span style={{ color:T.textDim, fontSize:12 }}>{e.cat}</span>
          <span style={{ color:T.textDim, fontSize:12 }}>{e.desc}</span>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", color:T.textSub }}>{fmt$(e.proforma)}</span>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", color:e.actual ? accentColor : T.textFaint }}>{fmt$(e.actual)}</span>
          <StatusBadge s={e.status} />
        </div>
      ))}
      <div className="pc-expense-row" style={{ background:T.panel, fontWeight:700, borderTop:`2px solid ${T.border}` }}>
        <span style={{ color:T.text }}>TOTAL</span><span/><span/>
        <span style={{ fontFamily:"'JetBrains Mono', monospace", color:T.textSub, fontSize:14 }}>{fmt$(totalProforma)}</span>
        <span style={{ fontFamily:"'JetBrains Mono', monospace", color:accentColor, fontSize:14 }}>{fmt$(totalActual)}</span>
        <span/>
      </div>
    </div>
  )
}

// Shared funding ledger used by both Voyage and Husbandry
function FundingLedger({ funding, requested, accentColor, shortfallNote }: {
  funding: typeof VOYAGE_FUNDING
  requested: number
  accentColor: string
  shortfallNote?: string
}) {
  const received   = funding.filter(f => f.status === 'RECEIVED').reduce((s,f) => s + f.amount, 0)
  const outstanding = requested - received

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
        {[
          { label:'Proforma Requested', value:fmt$(requested), color:T.textSub   },
          { label:'Total Received',     value:fmt$(received),  color:accentColor  },
          { label:'Outstanding',        value:fmt$(outstanding),color:outstanding > 0 ? T.yellow : T.matrix },
        ].map(k => (
          <div key={k.label} className="pc-kpi-card">
            <div style={{ fontSize:10, fontWeight:600, color:T.textDim, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:k.color, fontFamily:"'JetBrains Mono', monospace" }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:`1px solid ${T.border}` }}>
          <span style={{ fontSize:13, fontWeight:600, color:T.text }}>Funding Ledger</span>
          <button className="pc-btn pc-btn-ghost">{IPlus()} Record Receipt</button>
        </div>
        {funding.map(f => (
          <div key={f.id} className="pc-row" style={{ display:'grid', gridTemplateColumns:'3fr 1.5fr 1fr 1fr', alignItems:'center', padding:'11px 16px', borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
            <div>
              <div style={{ fontSize:13, color:T.textSub, fontWeight:500 }}>{f.desc}</div>
              {'ref' in f && f.ref && <div style={{ fontSize:11, color:T.textFaint, fontFamily:"'JetBrains Mono', monospace", marginTop:2 }}>{f.ref as string}</div>}
            </div>
            <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, color:f.status==='RECEIVED' ? accentColor : T.textDim, fontSize:13 }}>{fmt$(f.amount)}</span>
            <span style={{ color:T.textFaint }}>{f.date}</span>
            <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:600, display:'inline-block', background:f.status==='RECEIVED'?`${accentColor}18`:'rgba(245,158,11,0.1)', color:f.status==='RECEIVED'?accentColor:T.yellow, border:`1px solid ${f.status==='RECEIVED'?accentColor+'30':'rgba(245,158,11,0.2)'}` }}>
              {f.status === 'RECEIVED' ? 'Received' : 'Requested'}
            </span>
          </div>
        ))}
      </div>
      {shortfallNote && outstanding > 0 && (
        <div style={{ padding:'12px 16px', background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, display:'flex', gap:10, alignItems:'center' }}>
          {IAlert()}
          <span style={{ fontSize:12, color:'#FCD34D' }}>{shortfallNote}</span>
        </div>
      )}
    </div>
  )
}

// ─── Alerts Panel ─────────────────────────────────────────────────────────────

function AlertsPanel() {
  const active = MILESTONES.filter(m => m.status === 'OVERDUE' || m.status === 'WARNING')
  if (active.length === 0) return null
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {active.map(a => {
        const isOverdue = a.status === 'OVERDUE'
        const accent = isOverdue ? T.red : T.yellow
        const textClr = isOverdue ? '#FCA5A5' : '#FCD34D'
        const catLabel = a.category === 'regulatory' ? 'REGULATORY' : a.category === 'financial' ? 'FINANCIAL' : a.category === 'husbandry' ? 'HUSBANDRY' : 'OPERATIONAL'
        return (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:isOverdue?'rgba(239,68,68,0.06)':'rgba(245,158,11,0.06)', border:`1px solid ${isOverdue?'rgba(239,68,68,0.2)':'rgba(245,158,11,0.2)'}`, borderRadius:7, borderLeft:`3px solid ${accent}` }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:accent, flexShrink:0, boxShadow:`0 0 6px ${accent}` }} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:'0.05em' }}>{isOverdue ? '⚠ Overdue' : '⚡ Warning'}</span>
                <span style={{ fontSize:11, color:T.textFaint, background:'rgba(255,255,255,0.05)', padding:'1px 6px', borderRadius:3, fontWeight:600 }}>{catLabel}</span>
                <span style={{ fontSize:12, fontWeight:600, color:textClr }}>{a.label}</span>
                {a.dueLabel && <span style={{ fontSize:11, color:T.textDim }}>· {a.dueLabel}</span>}
              </div>
              {a.note && <div style={{ fontSize:11, color:T.textFaint, marginTop:2 }}>{a.note}</div>}
            </div>
            <button className="pc-btn pc-btn-ghost" style={{ fontSize:11, flexShrink:0, borderColor:accent, color:accent }}>Resolve →</button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Milestone Timeline ───────────────────────────────────────────────────────

function MilestoneTimeline() {
  const [hovered, setHovered] = useState<number | null>(null)
  const catClrMap: Record<MilestoneCategory, string> = {
    regulatory: '#F87171', financial: '#60A5FA', husbandry: '#F59E0B', operational: 'transparent'
  }
  const catLabelMap: Record<MilestoneCategory, string> = {
    regulatory: 'REG', financial: 'FIN', husbandry: 'HUSB', operational: ''
  }

  return (
    <div className="pc-card" style={{ padding:'18px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:11, fontWeight:700, color:T.textDim, textTransform:'uppercase', letterSpacing:'0.08em' }}>Port Call Timeline</span>
        <div style={{ display:'flex', gap:16 }}>
          {([['DONE','On Track'],['WARNING','Attention'],['OVERDUE','Overdue'],['PENDING','Upcoming']] as const).map(([s,l]) => (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:MS_COLOR[s] }} />
              <span style={{ fontSize:10, color:T.textFaint }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ overflowX:'auto', paddingBottom:4 }}>
        <div style={{ display:'flex', alignItems:'center', paddingTop:28, paddingBottom:4, minWidth:'max-content' }}>
          {MILESTONES.map((m, i) => {
            const color  = MS_COLOR[m.status]
            const isLast = i === MILESTONES.length - 1
            const isHov  = hovered === m.id
            const catC   = catClrMap[m.category]
            const catL   = catLabelMap[m.category]
            const lblClr = m.status === 'PENDING' ? T.textFaint : m.status === 'DONE' ? T.textDim : color
            const dateStr= m.date ? m.date.slice(5) : (m.dueLabel ?? '—')
            return (
              <div key={m.id} style={{ display:'flex', alignItems:'center' }}>
                <div
                  style={{ position:'relative', width:76, height:96, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'default', flexShrink:0 }}
                  onMouseEnter={() => setHovered(m.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div style={{ position:'absolute', top:0, fontSize:9, fontFamily:"'JetBrains Mono', monospace", fontWeight:600, color: m.status==='PENDING' ? T.textFaint : color, whiteSpace:'nowrap', textAlign:'center' }}>{dateStr}</div>
                  <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background: m.status==='PENDING' ? T.input : `${color}1A`, border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'transform .15s, box-shadow .15s', transform: isHov ? 'scale(1.18)' : 'scale(1)', boxShadow: isHov ? `0 0 10px ${color}70` : m.status==='OVERDUE' ? `0 0 7px ${color}50` : 'none' }}>
                    {m.status === 'DONE'    && <span style={{ color }}>{ICheck(10)}</span>}
                    {m.status === 'OVERDUE' && <span style={{ color, fontSize:14, fontWeight:700, lineHeight:1 }}>!</span>}
                    {m.status === 'WARNING' && <span style={{ color, fontSize:12, fontWeight:700, lineHeight:1 }}>~</span>}
                    {m.status === 'PENDING' && <span style={{ color:T.textFaint, fontSize:9 }}>{i+1}</span>}
                  </div>
                  <div style={{ height:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {catL && <span style={{ fontSize:8, color:catC, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>{catL}</span>}
                  </div>
                  <div style={{ position:'absolute', bottom:0, fontSize:9.5, color:lblClr, textAlign:'center', maxWidth:70, lineHeight:1.35 }}>{m.label}</div>
                  {isHov && m.note && (
                    <div style={{ position:'absolute', top:-40, left:'50%', transform:'translateX(-50%)', background:T.panel, border:`1px solid ${color}40`, borderRadius:5, padding:'5px 9px', fontSize:10, color, whiteSpace:'nowrap', zIndex:20, pointerEvents:'none', boxShadow:'0 4px 16px rgba(0,0,0,0.6)' }}>
                      {m.note}
                    </div>
                  )}
                </div>
                {!isLast && (
                  <div style={{ width:28, height:2, flexShrink:0, background: m.status==='DONE' ? `${T.matrix}55` : m.status==='OVERDUE' ? `${T.red}45` : m.status==='WARNING' ? `${T.yellow}45` : T.border }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Summary ─────────────────────────────────────────────────────────────

function TabSummary() {
  const currentIdx = PHASES.findIndex(p => p.key === PC.phase)
  const balance    = PC.funded - PC.actual
  const husbBalance = HUSB_FUNDING.filter(f => f.status==='RECEIVED').reduce((s,f) => s+f.amount, 0) - HUSB_EXPENSES.reduce((s,e) => s+(e.actual??0), 0)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18, animation:'pc-fadeIn 0.2s ease' }}>
      <AlertsPanel />
      <MilestoneTimeline />

      {/* Next action */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:8 }}>
        {IAlert()}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#93C5FD' }}>Next: Record departure events when vessel sails</div>
          <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Collect outstanding invoices · Prepare SOF · Issue sailing notice to principal · Close husbandry proforma</div>
        </div>
        <button className="pc-btn pc-btn-primary">Advance Phase →</button>
      </div>

      {/* Phase progress */}
      <div className="pc-card" style={{ padding:'18px 20px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.textDim, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Phase Progress</div>
        <div style={{ display:'flex', alignItems:'center' }}>
          {PHASES.map((ph, i) => {
            const done = i < currentIdx; const cur = i === currentIdx
            return (
              <div key={ph.key} style={{ display:'flex', alignItems:'center', flex: i < PHASES.length-1 ? 1 : 'none' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', border:`2px solid ${done?T.matrix:cur?T.primary:T.borderMd}`, background:done?'rgba(0,230,118,0.15)':cur?'rgba(59,130,246,0.2)':T.input, display:'flex', alignItems:'center', justifyContent:'center', color:done?T.matrix:cur?T.primary:T.textFaint, fontSize:11, fontWeight:700 }}>
                    {done ? <span style={{ color:T.matrix }}>{ICheck(11)}</span> : ph.short}
                  </div>
                  <span style={{ fontSize:9, color:done?T.textDim:cur?T.primary:T.textFaint, fontWeight:cur?700:400, whiteSpace:'nowrap', textAlign:'center', maxWidth:60 }}>{ph.label}</span>
                </div>
                {i < PHASES.length-1 && <div style={{ flex:1, height:2, background:done?T.matrix:T.borderMd, margin:'0 2px', marginBottom:14 }} />}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div className="pc-card">
          <SectionHead title="Port Call" />
          <KV label="Office"          value={PC.office} />
          <KV label="Type"            value="Discharge" />
          <KV label="Terminal"        value={PC.terminal} />
          <KV label="Voyage No."      value={PC.voyageNo} mono />
          <KV label="Principal Ref"   value={PC.extRef}   mono />
          <KV label="Assigned Agent"  value={PC.agent} />
        </div>
        <div className="pc-card">
          <SectionHead title="Parties" />
          <KV label="Appointing Party" value={PC.principal} />
          <KV label="Charterer"        value={PC.charterer} />
          <KV label="Owner"            value={PC.owner} />
          <KV label="Ship Manager"     value={PC.shipMgr} />
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.textDim, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Key Dates</div>
            <KV label="ETA"            value={fmtDt(PC.eta)}       mono />
            <KV label="NOR Tendered"   value={fmtDt(PC.norTime)}   mono />
            <KV label="All Fast"       value={fmtDt(PC.allFast)}   mono />
            <KV label="Commenced"      value={fmtDt(PC.commenced)} mono />
            <KV label="Sailed"         value={fmtDt(PC.sailed)}    mono />
          </div>
        </div>
        <div className="pc-card">
          <SectionHead title="Vessel Particulars" />
          <KV label="Vessel"        value={PC.vessel} />
          <KV label="IMO"           value={PC.imo}  mono />
          <KV label="Flag State"    value={PC.flag} />
          <KV label="Type"          value={PC.type} />
          <KV label="DWT"           value={`${PC.dwt} MT`} />
          <KV label="LOA"           value={PC.loa} />
          <KV label="Gross Tonnage" value={PC.gt} />
        </div>
        <div className="pc-card">
          <SectionHead title="Financial Summary" />
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:T.textDim, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Voyage DA — {PC.principal}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'Proforma', value:fmt$(PC.proforma), color:T.textSub  },
                { label:'Funded',   value:fmt$(PC.funded),   color:PC.funded>=PC.proforma?T.matrix:T.yellow },
                { label:'Actual',   value:fmt$(PC.actual),   color:'#60A5FA'  },
                { label:'Balance',  value:fmt$(PC.funded-PC.actual), color:(PC.funded-PC.actual)>=0?T.matrix:T.red },
              ].map(k => (
                <div key={k.label} style={{ background:T.input, borderRadius:6, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:T.textDim, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{k.label}</div>
                  <div style={{ fontSize:17, fontWeight:700, color:k.color, fontFamily:"'JetBrains Mono', monospace" }}>{k.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:T.yellow, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Husbandry DA — {PC.shipMgr}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'Proforma', value:fmt$(HUSB_EXPENSES.reduce((s,e)=>s+e.proforma,0)), color:T.textSub },
                { label:'Funded',   value:fmt$(HUSB_FUNDING.filter(f=>f.status==='RECEIVED').reduce((s,f)=>s+f.amount,0)), color:T.yellow },
                { label:'Actual',   value:fmt$(HUSB_EXPENSES.reduce((s,e)=>s+(e.actual??0),0)), color:'#60A5FA' },
                { label:'Balance',  value:fmt$(husbBalance), color:husbBalance>=0?T.matrix:T.red },
              ].map(k => (
                <div key={k.label} style={{ background:T.input, borderRadius:6, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:T.textDim, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{k.label}</div>
                  <div style={{ fontSize:17, fontWeight:700, color:k.color, fontFamily:"'JetBrains Mono', monospace" }}>{k.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Operations ──────────────────────────────────────────────────────────

function TabOperations() {
  const [sub, setSub] = useState('timeline')
  return (
    <div style={{ animation:'pc-fadeIn 0.2s ease' }}>
      <div style={{ display:'flex', gap:4, marginBottom:20 }}>
        {[['timeline','Timeline / SOF'],['berth','Berth & Port']].map(([k,l]) => (
          <button key={k} className={`pc-sub-tab ${sub===k?'active':''}`} onClick={() => setSub(k)}>{l}</button>
        ))}
      </div>

      {sub === 'timeline' && (
        <div style={{ maxWidth:680 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text }}>Statement of Facts</div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="pc-btn pc-btn-ghost">{IPlus()} Add Event</button>
              <button className="pc-btn pc-btn-ghost">{IPrint()} Export SOF</button>
            </div>
          </div>
          {TIMELINE.map((ev, i) => (
            <div key={ev.id} style={{ display:'flex', gap:14, padding:'6px 0' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                <div className="pc-timeline-dot" style={{ background:ev.confirmed?T.primary:T.borderMd, border:ev.confirmed?'none':`2px dashed ${T.textFaint}` }} />
                {i < TIMELINE.length-1 && <div style={{ width:2, flex:1, background:T.border, margin:'3px 0', minHeight:16 }} />}
              </div>
              <div style={{ flex:1, paddingBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:ev.confirmed?T.textSub:T.textFaint }}>{ev.event}</span>
                  {!ev.confirmed && <span style={{ fontSize:10, color:T.yellow, background:'rgba(245,158,11,0.12)', padding:'1px 6px', borderRadius:4, fontWeight:600 }}>EST</span>}
                </div>
                <div style={{ display:'flex', gap:14, marginTop:2 }}>
                  <span style={{ fontSize:11, color:T.textDim, fontFamily:"'JetBrains Mono', monospace" }}>{fmtDt(ev.time)}</span>
                  <span style={{ fontSize:11, color:T.textFaint }}>Source: {ev.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === 'berth' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="pc-card">
            <SectionHead title="Berth & Port Details" />
            <KV label="Port"            value={PC.port} />
            <KV label="Terminal"        value={PC.terminal} />
            <KV label="Anchorage Area"  value="Southwest Pass Anchorage" />
            <KV label="Berth No."       value="Berths 5–9" />
            <KV label="Max Draft (m)"   value="11.6m" />
            <KV label="Max LOA"         value="250m" />
            <KV label="Vessel Draft Arr"value="10.8m fwd / 11.1m aft" />
          </div>
          <div className="pc-card">
            <SectionHead title="Port Contacts" />
            {[
              ['Pilot Station',    'NOBRA — (504) 522-8060'],
              ['Port Authority',   'PONOLA — (504) 528-3400'],
              ['Terminal Ops',     'Associated Terminals — (504) 364-5900'],
              ['CBP NOL',          'Port Director — (504) 670-2391'],
              ['USPH',             'New Orleans Station — (504) 589-6374'],
            ].map(([l,v]) => <KV key={l} label={l} value={v} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Cargo ───────────────────────────────────────────────────────────────

function TabCargo() {
  const [sub, setSub] = useState('lines')
  return (
    <div style={{ animation:'pc-fadeIn 0.2s ease' }}>
      <div style={{ display:'flex', gap:4, marginBottom:20 }}>
        {[['lines','Cargo Lines'],['voyage','Voyage References'],['surveys','Surveys & Draft']].map(([k,l]) => (
          <button key={k} className={`pc-sub-tab ${sub===k?'active':''}`} onClick={() => setSub(k)}>{l}</button>
        ))}
      </div>

      {sub === 'lines' && (
        <div className="pc-card">
          <SectionHead title="Cargo Lines" action={<button className="pc-btn pc-btn-ghost">{IPlus()} Add Cargo Line</button>} />
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {['Commodity','Group','B/L Qty (MT)','Outturn Qty','Shipper','Consignee','B/L No.','Status'].map(h => (
                  <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.textFaint, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="pc-row" style={{ borderBottom:`1px solid ${T.border}` }}>
                <td style={{ padding:'10px 12px', fontSize:13, color:T.text, fontWeight:500 }}>Pet Coke (Calcined)</td>
                <td style={{ padding:'10px 12px', fontSize:12, color:T.textDim }}>Dry Bulk</td>
                <td style={{ padding:'10px 12px', fontSize:13, color:T.textSub, fontFamily:"'JetBrains Mono', monospace" }}>54,200</td>
                <td style={{ padding:'10px 12px', fontSize:12, color:T.textFaint, fontFamily:"'JetBrains Mono', monospace" }}>—</td>
                <td style={{ padding:'10px 12px', fontSize:12, color:T.textDim }}>Phillips 66 (Sweeny)</td>
                <td style={{ padding:'10px 12px', fontSize:12, color:T.textDim }}>Oxbow Carbon LLC</td>
                <td style={{ padding:'10px 12px', fontSize:12, color:T.textDim, fontFamily:"'JetBrains Mono', monospace" }}>—</td>
                <td style={{ padding:'10px 12px' }}><span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'rgba(59,130,246,0.12)', color:'#60A5FA' }}>Discharging</span></td>
              </tr>
            </tbody>
          </table>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginTop:16 }}>
            {[
              { label:'B/L Quantity',  value:'54,200 MT' },
              { label:'Outturn Qty',   value:'— (in progress)' },
              { label:'Cargo Group',   value:'Dry Bulk' },
              { label:'Stow Factor',   value:'~0.91 m³/MT' },
            ].map(k => (
              <div key={k.label} style={{ padding:'10px 12px', background:T.input, borderRadius:6 }}>
                <div style={{ fontSize:10, color:T.textFaint, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{k.label}</div>
                <div style={{ fontSize:13, color:T.textSub, fontWeight:500 }}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === 'voyage' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="pc-card">
            <SectionHead title="Voyage References" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              {[
                ['Voyage Number',      '2026-014N'],
                ['Charter Party Date', 'Feb 28 2026'],
                ['Charter Party Type', 'Time Charter'],
                ['Loading Port',       'Baytown, TX'],
                ['Discharge Port',     'New Orleans, LA'],
                ['Laycan',             'Mar 07–09 2026'],
                ['B/L Date',           '—'],
                ['B/L Place of Issue', '—'],
                ['External Ref',       'PB-NOL-2026-089'],
              ].map(([l,v]) => (
                <div key={l} style={{ padding:'10px 12px', background:T.input, borderRadius:6 }}>
                  <div style={{ fontSize:10, color:T.textFaint, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:13, color:T.textSub, fontWeight:500, fontFamily:"'JetBrains Mono', monospace" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="pc-card">
            <SectionHead title="Laytime / Demurrage" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <KV label="Allowed Laytime"    value="72 hrs SHINC" />
                <KV label="Commenced Counting" value="Mar 08 14:00" mono />
                <KV label="Time Used"          value="~84 hrs (incl. rain excl.)" />
                <KV label="Status"             value="Preliminary — in progress" />
              </div>
              <div>
                <KV label="Demurrage Rate"     value="$12,000 / day" mono />
                <KV label="Despatch Rate"      value="$6,000 / day" mono />
                <KV label="Est. Demurrage"     value="$6,000 (½ day est.)" />
                <KV label="Claim Status"       value="Pending completion" />
              </div>
            </div>
          </div>
        </div>
      )}

      {sub === 'surveys' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="pc-card">
            <SectionHead title="Draft Surveys" action={<button className="pc-btn pc-btn-ghost">{IPlus()} Add Survey</button>} />
            {[
              { type:'Arrival Draft Survey',   date:'2026-03-09 06:30', surveyor:'Higgins Marine Services', fwd:'10.82m', aft:'11.14m', qty:'54,318 MT', status:'COMPLETE' },
              { type:'Departure Draft Survey', date:'2026-03-13 10:00', surveyor:'Higgins Marine Services', fwd:'—',      aft:'—',      qty:'—',         status:'PENDING'  },
            ].map((s, i) => (
              <div key={i} style={{ padding:'14px 0', borderBottom: i===0 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:T.textSub }}>{s.type}</span>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:s.status==='COMPLETE'?'rgba(16,185,129,0.12)':'rgba(107,114,128,0.12)', color:s.status==='COMPLETE'?T.matrix:T.textDim }}>{s.status}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
                  {[['Date/Time',s.date],['Surveyor',s.surveyor],['Fwd Draft',s.fwd],['Aft Draft',s.aft],['Cargo Qty',s.qty]].map(([l,v]) => (
                    <div key={l}>
                      <div style={{ fontSize:10, color:T.textFaint, marginBottom:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>{l}</div>
                      <div style={{ fontSize:12, color:T.textSub, fontWeight:500 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pc-card">
            <SectionHead title="Hold Inspections & P&I" action={<button className="pc-btn pc-btn-ghost">{IPlus()} Add Inspection</button>} />
            <div style={{ padding:'20px 0', textAlign:'center', color:T.textFaint, fontSize:13 }}>
              No hold inspections recorded · <button style={{ background:'none', border:'none', color:T.primary, cursor:'pointer', fontSize:13 }}>Add inspection or P&I note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Voyage DA ───────────────────────────────────────────────────────────

function TabVoyageDA() {
  const [sub, setSub] = useState('proforma')
  const totalProforma  = VOYAGE_EXPENSES.reduce((s,e) => s + e.proforma, 0)
  const totalActual    = VOYAGE_EXPENSES.reduce((s,e) => s + (e.actual ?? 0), 0)
  const funded         = VOYAGE_FUNDING.filter(f => f.status==='RECEIVED').reduce((s,f) => s + f.amount, 0)
  const balance        = funded - totalActual

  return (
    <div style={{ animation:'pc-fadeIn 0.2s ease' }}>
      {/* Paying party banner */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:7, marginBottom:18 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:T.primary }} />
        <span style={{ fontSize:12, color:T.textDim }}>Paying Party</span>
        <span style={{ fontSize:13, fontWeight:600, color:T.textSub }}>{PC.principal} · {PC.charterer}</span>
        <span style={{ marginLeft:'auto', fontSize:11, color:T.textFaint }}>Voyage DA · {PC.fileNo}</span>
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:20 }}>
        {[['proforma','Proforma DA'],['services','Services & Vendors'],['funding','Funding'],['fda','FDA (post-sail)']].map(([k,l]) => (
          <button key={k} className={`pc-sub-tab ${sub===k?'active':''}`} onClick={() => setSub(k)}
            style={{ opacity: k==='fda' ? 0.45 : 1 }}>
            {l}
          </button>
        ))}
      </div>

      {sub === 'proforma' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
            {[
              { label:'Proforma Total',  value:fmt$(totalProforma), color:T.textSub },
              { label:'Actual to Date',  value:fmt$(totalActual),   color:'#60A5FA' },
              { label:'Total Funded',    value:fmt$(funded),        color:T.matrix  },
              { label:'Balance',         value:fmt$(balance),       color:balance>=0?T.matrix:T.red },
            ].map(k => (
              <div key={k.label} className="pc-kpi-card">
                <div style={{ fontSize:10, fontWeight:600, color:T.textDim, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>{k.label}</div>
                <div style={{ fontSize:22, fontWeight:700, color:k.color, fontFamily:"'JetBrains Mono', monospace" }}>{k.value}</div>
              </div>
            ))}
          </div>
          <ExpenseTable expenses={VOYAGE_EXPENSES} title="Voyage Disbursement Account" accentColor={T.matrix} />
        </div>
      )}

      {sub === 'services' && (
        <div className="pc-card">
          <SectionHead title="Service Scope & Vendors — Voyage" action={<button className="pc-btn pc-btn-ghost">{IPlus()} Add Service</button>} />
          <div style={{ fontSize:11, color:T.textDim, marginBottom:14 }}>Services selected here drive expense line items in the Proforma DA. Vendor assignment auto-populates rate from fee agreements.</div>
          {[
            { scope:'Pilotage',          vendor:'NOBRA Pilots',           status:'done',   linked:true  },
            { scope:'Towage (Inbound)',   vendor:'Crescent Towing',        status:'done',   linked:true  },
            { scope:'Towage (Outbound)', vendor:'Crescent Towing',        status:'pending',linked:true  },
            { scope:'Wharfage',          vendor:'Port of New Orleans',     status:'active', linked:true  },
            { scope:'Stevedoring',       vendor:'Associated Terminals',    status:'active', linked:true  },
            { scope:'Tonnage Tax / CBP', vendor:'U.S. Customs & Border P.',status:'done',   linked:true  },
            { scope:'Draft Survey',      vendor:'Higgins Marine Services', status:'active', linked:true  },
            { scope:'Port Agency',       vendor:'Gulf Coast Agency (NOL)', status:'active', linked:true  },
          ].map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:s.status==='done'?T.matrix:s.status==='active'?T.primary:T.borderMd, flexShrink:0 }} />
                <span style={{ fontSize:13, color:T.textSub, fontWeight:500 }}>{s.scope}</span>
                {s.linked && <span style={{ fontSize:9, color:T.textFaint, background:'rgba(255,255,255,0.05)', padding:'1px 5px', borderRadius:3, fontWeight:600 }}>DA LINKED</span>}
              </div>
              <span style={{ fontSize:12, color:T.textDim }}>{s.vendor}</span>
            </div>
          ))}
        </div>
      )}

      {sub === 'funding' && (
        <FundingLedger
          funding={VOYAGE_FUNDING}
          requested={PC.proforma}
          accentColor={T.matrix}
          shortfallNote={`Funding shortfall of ${fmt$(PC.proforma - funded)} outstanding · Supplemental request sent 2026-03-11`}
        />
      )}

      {sub === 'fda' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:60, gap:12 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:T.panel, border:`1px solid ${T.borderMd}`, display:'flex', alignItems:'center', justifyContent:'center', color:T.textFaint }}>
            {IClock()}
          </div>
          <div style={{ fontSize:14, fontWeight:600, color:T.textDim }}>FDA Available After Vessel Sails</div>
          <div style={{ fontSize:12, color:T.textFaint, textAlign:'center', maxWidth:360, lineHeight:1.6 }}>
            The Final Disbursement Account will be prepared once all cargo operations are complete and the vessel has sailed. Est. Mar 13, 2026.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Husbandry ───────────────────────────────────────────────────────────

function TabHusbandry() {
  const [sub, setSub] = useState('proforma')
  const [fileOpen, setFileOpen] = useState(true) // true = sub-file already created (demo)

  const husbProformaTotal = HUSB_EXPENSES.reduce((s,e) => s + e.proforma, 0)
  const husbActualTotal   = HUSB_EXPENSES.reduce((s,e) => s + (e.actual ?? 0), 0)
  const husbFunded        = HUSB_FUNDING.filter(f => f.status==='RECEIVED').reduce((s,f) => s + f.amount, 0)
  const husbBalance       = husbFunded - husbActualTotal

  if (!fileOpen) {
    return (
      <div style={{ animation:'pc-fadeIn 0.2s ease' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:60, gap:16, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:T.yellow }}>
            {IWrench()}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:16, fontWeight:700, color:T.textSub, marginBottom:6 }}>No Husbandry File Open</div>
            <div style={{ fontSize:13, color:T.textDim, lineHeight:1.7, maxWidth:420 }}>
              Open a husbandry sub-file to track owner/manager expenses separately from the voyage DA. Vessel particulars and port details are inherited automatically.
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button className="pc-btn pc-btn-yellow" onClick={() => setFileOpen(true)} style={{ height:36, fontSize:13, padding:'0 20px' }}>
              {IPlus()} Open Husbandry File
            </button>
            <button className="pc-btn pc-btn-ghost" style={{ height:36, fontSize:13, padding:'0 16px' }}>
              Skip — No Husbandry Services
            </button>
          </div>
          <div style={{ fontSize:11, color:T.textFaint, textAlign:'center', maxWidth:380 }}>
            Even if no services are anticipated, opening a file creates the framework to capture ad-hoc owner requests during the port call.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation:'pc-fadeIn 0.2s ease' }}>
      {/* Paying party banner — distinct from voyage */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.18)', borderRadius:7, marginBottom:18 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:T.yellow }} />
        <span style={{ fontSize:12, color:T.textDim }}>Paying Party</span>
        <span style={{ fontSize:13, fontWeight:600, color:T.textSub }}>{PC.shipMgr}</span>
        <span style={{ fontSize:12, color:T.textFaint }}>· Owner: {PC.owner}</span>
        <span style={{ marginLeft:'auto', fontSize:11, color:T.textFaint }}>Husbandry Sub-File · {PC.fileNo}-H</span>
        <button className="pc-btn pc-btn-ghost" style={{ fontSize:11, marginLeft:8 }}>Edit Payer</button>
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:20 }}>
        {[['proforma','Proforma DA'],['services','Services'],['funding','Funding'],['fda','FDA (post-sail)']].map(([k,l]) => (
          <button key={k} className={`pc-sub-tab ${sub===k?'active':''}`} onClick={() => setSub(k)}
            style={{ opacity: k==='fda' ? 0.45 : 1 }}>
            {l}
          </button>
        ))}
      </div>

      {sub === 'proforma' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
            {[
              { label:'Proforma Total', value:fmt$(husbProformaTotal), color:T.textSub },
              { label:'Actual to Date', value:fmt$(husbActualTotal),   color:'#60A5FA' },
              { label:'Total Funded',   value:fmt$(husbFunded),        color:T.yellow  },
              { label:'Balance',        value:fmt$(husbBalance),       color:husbBalance>=0?T.matrix:T.red },
            ].map(k => (
              <div key={k.label} className="pc-kpi-card">
                <div style={{ fontSize:10, fontWeight:600, color:T.textDim, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>{k.label}</div>
                <div style={{ fontSize:22, fontWeight:700, color:k.color, fontFamily:"'JetBrains Mono', monospace" }}>{k.value}</div>
              </div>
            ))}
          </div>
          <ExpenseTable expenses={HUSB_EXPENSES} title="Husbandry Disbursement Account" accentColor={T.yellow} />
        </div>
      )}

      {sub === 'services' && (
        <div className="pc-card">
          <SectionHead title="Husbandry Services & Vendors" action={<button className="pc-btn pc-btn-ghost">{IPlus()} Add Service</button>} />
          <div style={{ fontSize:11, color:T.textDim, marginBottom:14 }}>Owner / manager services — same port vendor pool, separate billing from voyage DA.</div>
          {[
            { scope:'Crew Launch / Water Taxi',  vendor:'LaFleur Launch Service',   status:'done',   linked:true  },
            { scope:'Provisions & Stores',       vendor:'Gulf South Maritime',       status:'done',   linked:true  },
            { scope:'Crew Medical',              vendor:'NOLA Medical Service',      status:'active', linked:true  },
            { scope:'Vessel Shifting',           vendor:'Crescent Towing',           status:'pending',linked:true  },
            { scope:'Husbandry Agency Fee',      vendor:'Gulf Coast Agency (NOL)',   status:'active', linked:true  },
          ].map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:s.status==='done'?T.matrix:s.status==='active'?T.yellow:T.borderMd, flexShrink:0 }} />
                <span style={{ fontSize:13, color:T.textSub, fontWeight:500 }}>{s.scope}</span>
                {s.linked && <span style={{ fontSize:9, color:T.textFaint, background:'rgba(255,255,255,0.05)', padding:'1px 5px', borderRadius:3, fontWeight:600 }}>DA LINKED</span>}
              </div>
              <span style={{ fontSize:12, color:T.textDim }}>{s.vendor}</span>
            </div>
          ))}
        </div>
      )}

      {sub === 'funding' && (
        <FundingLedger
          funding={HUSB_FUNDING}
          requested={husbProformaTotal}
          accentColor={T.yellow}
          shortfallNote={`Husbandry shortfall of ${fmt$(husbProformaTotal - husbFunded)} · Follow up with ${PC.shipMgr}`}
        />
      )}

      {sub === 'fda' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:60, gap:12 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:T.panel, border:`1px solid ${T.borderMd}`, display:'flex', alignItems:'center', justifyContent:'center', color:T.textFaint }}>
            {IClock()}
          </div>
          <div style={{ fontSize:14, fontWeight:600, color:T.textDim }}>Husbandry FDA Available After Vessel Sails</div>
          <div style={{ fontSize:12, color:T.textFaint, textAlign:'center', maxWidth:380, lineHeight:1.6 }}>
            Separate husbandry FDA will be issued to {PC.shipMgr} once all owner services are complete and the vessel has sailed.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

function TabDocuments() {
  const DOC_TYPES = ['All','NOR','SOF','Survey','Invoice','Customs','PDA','Crew','Receipt']
  const [filter, setFilter] = useState('All')
  const shown = filter === 'All' ? DOCUMENTS : DOCUMENTS.filter(d => d.type === filter)
  const SOURCE_COLOR: Record<string,string> = { email:'#3B82F6', scan:'#8B5CF6', system:'#10B981', upload:'#D97706' }

  return (
    <div style={{ animation:'pc-fadeIn 0.2s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {DOC_TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:500, border:`1px solid ${filter===t?T.primary:T.borderMd}`, background:filter===t?'rgba(59,130,246,0.12)':'transparent', color:filter===t?'#93C5FD':T.textDim, cursor:'pointer', transition:'all .15s' }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="pc-btn pc-btn-ghost">{IUpload()} Upload</button>
          <button className="pc-btn pc-btn-ghost">Scan</button>
        </div>
      </div>
      <div className="pc-drop-zone" style={{ marginBottom:18 }}>
        <div style={{ color:T.textFaint, fontSize:13 }}>
          {IUpload()} <span style={{ marginLeft:8 }}>Drag & drop files here</span>
          <span style={{ display:'block', fontSize:11, marginTop:6, color:T.textFaint }}>or paste from email · PDF, PNG, JPG, DOCX · Files linked to this port call</span>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
        {shown.map(doc => (
          <div key={doc.id} className="pc-doc-card">
            <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 }}>
              <div style={{ width:34, height:34, borderRadius:7, background:`${SOURCE_COLOR[doc.source]}18`, border:`1px solid ${SOURCE_COLOR[doc.source]}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:SOURCE_COLOR[doc.source] }}>{IFile()}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name}</div>
                <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>{doc.type} · {doc.date}</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:`${SOURCE_COLOR[doc.source]}14`, color:SOURCE_COLOR[doc.source], fontWeight:600, textTransform:'uppercase' }}>{doc.source}</span>
              <span style={{ fontSize:10, color:T.textFaint }}>{doc.size}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Tasks ───────────────────────────────────────────────────────────────

function TabTasks() {
  const done = TASKS.filter(t => t.status === 'DONE').length
  return (
    <div style={{ animation:'pc-fadeIn 0.2s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, fontWeight:600, color:T.text }}>Workflow Tasks</span>
          <span style={{ fontSize:12, color:T.textDim }}>{done}/{TASKS.length} complete</span>
          <div style={{ width:80, height:4, background:T.border, borderRadius:2 }}>
            <div style={{ width:`${(done/TASKS.length)*100}%`, height:'100%', background:T.matrix, borderRadius:2 }} />
          </div>
        </div>
        <button className="pc-btn pc-btn-ghost">{IPlus()} Add Task</button>
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'20px 1fr 90px 100px 100px', gap:0, padding:'8px 16px', borderBottom:`1px solid ${T.border}`, fontSize:10, fontWeight:700, color:T.textFaint, textTransform:'uppercase', letterSpacing:'0.06em' }}>
          <span></span><span>Task</span><span style={{ textAlign:'right' }}>Due</span><span style={{ textAlign:'center' }}>Assignee</span><span style={{ textAlign:'center' }}>Status</span>
        </div>
        {TASKS.map(t => {
          const ts = TSTATUS[t.status] ?? TSTATUS.PENDING
          return (
            <div key={t.id} className="pc-task-row" style={{ display:'grid', gridTemplateColumns:'20px 1fr 90px 100px 100px' }}>
              <div style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${t.status==='DONE'?T.matrix:T.borderMd}`, background:t.status==='DONE'?'rgba(0,230,118,0.12)':'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {t.status === 'DONE' && <span style={{ color:T.matrix }}>{ICheck(10)}</span>}
              </div>
              <div>
                <span style={{ color:t.status==='DONE'?T.textDim:T.textSub, textDecoration:t.status==='DONE'?'line-through':undefined, fontSize:13 }}>{t.desc}</span>
                {t.auto && <span style={{ marginLeft:8, fontSize:9, color:T.textFaint, background:'rgba(255,255,255,0.05)', padding:'1px 5px', borderRadius:3, fontWeight:600, textTransform:'uppercase' }}>Auto</span>}
              </div>
              <span style={{ fontSize:11, color:T.textFaint, textAlign:'right' }}>{t.due.slice(5)}</span>
              <span style={{ fontSize:11, color:T.textDim, textAlign:'center' }}>{t.assignee}</span>
              <div style={{ textAlign:'center' }}>
                <span style={{ fontSize:10, fontWeight:600, color:ts.color, background:`${ts.color}18`, padding:'2px 8px', borderRadius:4 }}>{ts.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PortCallDetail() {
  const [tab, setTab] = useState('summary')
  const balance = PC.funded - PC.actual
  const husbFunded  = HUSB_FUNDING.filter(f => f.status==='RECEIVED').reduce((s,f) => s+f.amount, 0)
  const husbActual  = HUSB_EXPENSES.reduce((s,e) => s+(e.actual??0), 0)
  const openTasks   = TASKS.filter(t => t.status !== 'DONE').length

  const TABS = [
    { key:'summary',    label:'Summary' },
    { key:'operations', label:'Operations' },
    { key:'cargo',      label:'Cargo' },
    { key:'voyage',     label:'Voyage DA',   activeClass:'active' },
    { key:'husbandry',  label:'Husbandry',   activeClass:'active-yellow' },
    { key:'documents',  label:`Documents (${DOCUMENTS.length})` },
    { key:'tasks',      label:`Tasks (${openTasks} open)` },
  ]

  return (
    <div className="pc-root" style={{ minHeight:'100vh', background:T.bg, color:T.text, fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Top nav bar ── */}
      <div style={{ height:44, background:T.surface, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', padding:'0 20px', gap:14, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:24, height:24, borderRadius:5, background:'rgba(59,130,246,0.9)', display:'flex', alignItems:'center', justifyContent:'center' }}>{IAnchor()}</div>
          <span style={{ fontSize:13, fontWeight:700, color:T.text }}>ShipOps</span>
        </div>
        <span style={{ color:T.border }}>|</span>
        <button style={{ background:'none', border:'none', cursor:'pointer', color:T.textDim, fontSize:12, display:'flex', alignItems:'center', gap:5 }}>{IBack()} Port Calls</button>
        <span style={{ color:T.textFaint, fontSize:12 }}>{IChevR()}</span>
        <span style={{ fontSize:12, color:T.textMuted, fontFamily:"'JetBrains Mono', monospace", fontWeight:600 }}>{PC.fileNo}</span>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:11, color:T.textFaint }}>Gulf Coast Agency · {PC.office}</span>
      </div>

      {/* ── Port call header ── */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:'16px 24px 0' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:T.textDim, fontWeight:500 }}>{PC.fileNo}</span>
              <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20, background:'rgba(5,150,105,0.15)', color:'#34D399', border:'1px solid rgba(5,150,105,0.3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#34D399', display:'inline-block', marginRight:5, animation:'pc-pulse 1.8s infinite' }} />
                Working Cargo
              </span>
              <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'rgba(16,185,129,0.1)', color:T.green, border:'1px solid rgba(16,185,129,0.2)' }}>ACTIVE</span>
              <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'rgba(245,158,11,0.1)', color:T.yellow, border:'1px solid rgba(245,158,11,0.2)' }}>HUSB OPEN</span>
            </div>
            <h1 style={{ fontSize:24, fontWeight:700, color:T.text, letterSpacing:'-0.02em', marginBottom:4 }}>{PC.vessel}</h1>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:12, color:T.textDim }}>
              <span>{PC.type}</span><span style={{ color:T.border }}>·</span>
              <span>Flag: {PC.flag}</span><span style={{ color:T.border }}>·</span>
              <span>IMO {PC.imo}</span><span style={{ color:T.border }}>·</span>
              <span>{PC.port}</span><span style={{ color:T.border }}>·</span>
              <span style={{ color:T.textMuted }}>{PC.terminal}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button className="pc-btn pc-btn-ghost">{IPrint()} Print</button>
            <button className="pc-btn pc-btn-ghost">Edit</button>
            <button className="pc-btn pc-btn-matrix">Advance Phase →</button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap', alignItems:'flex-end' }}>
          {[
            { label:'Principal', value:PC.principal },
            { label:'Agent',     value:PC.agent     },
            { label:'Cargo',     value:`${PC.cargo} · ${PC.qty}` },
            { label:'ETA',       value:fmtDt(PC.eta),    mono:true },
            { label:'All Fast',  value:fmtDt(PC.allFast),mono:true },
          ].map(k => (
            <div key={k.label} style={{ display:'flex', gap:6, alignItems:'baseline' }}>
              <span style={{ fontSize:10, color:T.textFaint, textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</span>
              <span style={{ fontSize:12, color:T.textMuted, fontWeight:500, fontFamily:k.mono?"'JetBrains Mono', monospace":undefined }}>{k.value}</span>
            </div>
          ))}
          {/* Financial KPIs — both voyage and husbandry */}
          <div style={{ marginLeft:'auto', display:'flex', gap:20, alignItems:'flex-end' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              <div style={{ fontSize:9, fontWeight:600, color:T.primary, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>Voyage DA</div>
              <div style={{ display:'flex', gap:16 }}>
                {[
                  { label:'Proforma', value:fmt$(PC.proforma), color:T.textMuted },
                  { label:'Funded',   value:fmt$(PC.funded),   color:PC.funded>=PC.proforma?T.matrix:T.yellow },
                  { label:'Actual',   value:fmt$(PC.actual),   color:'#60A5FA' },
                  { label:'Balance',  value:fmt$(balance),     color:balance>=0?T.matrix:T.red },
                ].map(k => (
                  <div key={k.label} style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9, color:T.textFaint, textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:k.color, fontFamily:"'JetBrains Mono', monospace" }}>{k.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width:1, height:32, background:T.borderMd }} />
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              <div style={{ fontSize:9, fontWeight:600, color:T.yellow, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>Husbandry</div>
              <div style={{ display:'flex', gap:16 }}>
                {[
                  { label:'Proforma', value:fmt$(HUSB_EXPENSES.reduce((s,e)=>s+e.proforma,0)), color:T.textMuted },
                  { label:'Funded',   value:fmt$(husbFunded), color:T.yellow },
                  { label:'Actual',   value:fmt$(husbActual), color:'#60A5FA' },
                  { label:'Balance',  value:fmt$(husbFunded-husbActual), color:(husbFunded-husbActual)>=0?T.matrix:T.red },
                ].map(k => (
                  <div key={k.label} style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9, color:T.textFaint, textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:k.color, fontFamily:"'JetBrains Mono', monospace" }}>{k.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Primary tabs */}
        <div style={{ display:'flex', gap:0, borderTop:`1px solid ${T.border}`, marginTop:4 }}>
          {TABS.map(({ key, label, activeClass }) => (
            <button
              key={key}
              className={`pc-tab-btn ${tab===key ? (activeClass ?? 'active') : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding:'24px', maxWidth:1280, margin:'0 auto' }}>
        {tab === 'summary'    && <TabSummary />}
        {tab === 'operations' && <TabOperations />}
        {tab === 'cargo'      && <TabCargo />}
        {tab === 'voyage'     && <TabVoyageDA />}
        {tab === 'husbandry'  && <TabHusbandry />}
        {tab === 'documents'  && <TabDocuments />}
        {tab === 'tasks'      && <TabTasks />}
      </div>
    </div>
  )
}
