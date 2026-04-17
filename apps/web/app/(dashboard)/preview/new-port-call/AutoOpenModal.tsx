'use client'

import { useEffect, useRef, useState } from 'react'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:         '#0F1117',
  surface:    '#13151C',
  panel:      '#1A1D27',
  input:      '#0D1017',
  border:     '#1F2328',
  borderMd:   '#2D3140',
  text:       '#FFFFFF',        // pure white
  textSub:    '#F1F5F9',        // near-white
  textMuted:  '#CBD5E1',        // readable muted
  textDim:    '#8899A6',        // labels / dim
  textFaint:  '#4B5563',        // very dim / placeholders
  primary:    '#3B82F6',
  primaryHov: '#2563EB',
  matrix:     '#00E676',        // matrix green — proforma accent
  matrixDim:  'rgba(0,230,118,0.12)',
  green:      '#10B981',
  yellow:     '#F59E0B',
  orange:     '#D97706',
  red:        '#EF4444',
  purple:     '#7C3AED',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const OFFICES         = ['New Orleans (NOL)', 'Houston (HOU)', 'Mobile (MOB)']
const PORT_CALL_TYPES = ['Discharge', 'Load', 'Load & Discharge', 'Transshipment', 'Bunkering Only', 'Crew Change Only', 'Repairs / Drydock', 'Lay-Up', 'Transit', 'Survey / Inspection']
const CARGO_GROUPS    = ['Dry Bulk', 'Break Bulk', 'Tanker — Clean', 'Tanker — Dirty', 'Container', 'RoRo', 'Gas Carrier', 'Project Cargo', 'Bunkering', 'Passenger']
const SCOPE_OPTS      = ['Full Agency', 'Husbandry', 'Protecting', 'Customs Clearance', 'Crew Change', 'Stores / Provisions', 'Cash to Master', 'Bunker Coordination', 'Stevedoring', 'Immigration', 'Medical', 'Waste Removal']

// ─── Office-scoped port + terminal data ───────────────────────────────────────
// In production: fetched from DB filtered by user's officeId
// Structure: office code → ports → terminals/berths

type Terminal = { id: string; name: string }
type PortEntry = { id: string; name: string; unlocode: string; terminals: Terminal[] }

const OFFICE_PORTS: Record<string, PortEntry[]> = {
  NOL: [
    { id: 'nol-nola', name: 'Port of New Orleans', unlocode: 'US NEW', terminals: [
      { id: 't1',  name: 'Nashville Ave Wharf — Berths 1–4' },
      { id: 't2',  name: 'Nashville Ave Wharf — Berths 5–9' },
      { id: 't3',  name: 'Poland Ave Wharf' },
      { id: 't4',  name: 'Napoleon Ave Container Terminal' },
      { id: 't5',  name: 'Julia St. Cruise Terminal' },
      { id: 't6',  name: 'Jourdan Rd. Bulk Terminal' },
    ]},
    { id: 'nol-avondale', name: 'Avondale (Jefferson Parish)', unlocode: 'US NEW', terminals: [
      { id: 't7',  name: 'Avondale Marine Wharf' },
      { id: 't8',  name: 'Avondale — Berths 1–3' },
    ]},
    { id: 'nol-burnside', name: 'Burnside Terminal (Ascension)', unlocode: 'US NEW', terminals: [
      { id: 't9',  name: 'Burnside Dock 1' },
      { id: 't10', name: 'Burnside Dock 2' },
    ]},
    { id: 'nol-btr', name: 'Port of Baton Rouge', unlocode: 'US BTR', terminals: [
      { id: 't11', name: 'Port of BR — General Cargo Wharf' },
      { id: 't12', name: 'ExxonMobil Baton Rouge Marine Terminal' },
      { id: 't13', name: 'Placid Refining Marine Terminal' },
    ]},
    { id: 'nol-psl', name: 'Port of South Louisiana (LaPlace)', unlocode: 'US NEW', terminals: [
      { id: 't14', name: 'Globalplex Intermodal Terminal' },
      { id: 't15', name: 'Reserve Terminal — Berths 1–4' },
      { id: 't16', name: 'Destrehan River Terminal' },
    ]},
    { id: 'nol-gretna', name: 'Gretna / Harvey Canal', unlocode: 'US NEW', terminals: [
      { id: 't17', name: 'Harvey Canal Industrial Area' },
      { id: 't18', name: 'Gretna Industrial Wharf' },
    ]},
  ],
  HOU: [
    { id: 'hou-bct', name: 'Port of Houston — Barbours Cut', unlocode: 'US HOU', terminals: [
      { id: 't20', name: 'Barbours Cut Terminal — Berths 1–2' },
      { id: 't21', name: 'Barbours Cut Terminal — Berths 3–4' },
    ]},
    { id: 'hou-bayport', name: 'Port of Houston — Bayport', unlocode: 'US HOU', terminals: [
      { id: 't22', name: 'Bayport Container Terminal — Berth 1' },
      { id: 't23', name: 'Bayport Container Terminal — Berth 2' },
      { id: 't24', name: 'Bayport Bulk Terminal' },
    ]},
    { id: 'hou-gen', name: 'Port of Houston — General Cargo', unlocode: 'US HOU', terminals: [
      { id: 't25', name: 'Greens Port Industrial Terminal' },
      { id: 't26', name: 'Kinder Morgan Bulk Terminal' },
      { id: 't27', name: 'Gulf Coast Heavy Lift Terminal' },
      { id: 't28', name: 'IMT Houston' },
      { id: 't29', name: 'Gulf Copper & Manufacturing' },
      { id: 't30', name: 'Jacintoport International Terminal' },
    ]},
    { id: 'hou-galv', name: 'Port of Galveston', unlocode: 'US GLS', terminals: [
      { id: 't31', name: 'Galveston Wharves — Pier 21' },
      { id: 't32', name: 'Galveston Wharves — Pier 35' },
      { id: 't33', name: 'Galveston Wharves — Pier 39' },
      { id: 't34', name: 'Galveston Island Terminal' },
    ]},
    { id: 'hou-txc', name: 'Port of Texas City', unlocode: 'US TXC', terminals: [
      { id: 't35', name: 'Texas City Terminal — Dock 1' },
      { id: 't36', name: 'Texas City Terminal — Dock 6' },
      { id: 't37', name: 'Cargill Dry Cargo Terminal' },
      { id: 't38', name: 'Marathon Texas City Refinery Docks' },
      { id: 't39', name: 'Valero Texas City Marine Terminal' },
    ]},
    { id: 'hou-lav', name: 'Port Lavaca / Point Comfort', unlocode: 'US PLV', terminals: [
      { id: 't40', name: 'Port Lavaca–Calhoun Port Authority' },
      { id: 't41', name: 'Formosa Plastics Marine Terminal' },
      { id: 't42', name: 'Alcoa Point Comfort Marine Terminal' },
    ]},
    { id: 'hou-fp', name: 'Port of Freeport', unlocode: 'US FPT', terminals: [
      { id: 't43', name: 'Freeport LNG Marine Terminal' },
      { id: 't44', name: 'Velasco Terminal' },
      { id: 't45', name: 'BASF Freeport Docks' },
    ]},
  ],
  MOB: [
    { id: 'mob-main', name: 'Port of Mobile', unlocode: 'US MOB', terminals: [
      { id: 't50', name: 'McDuffie Coal Terminal' },
      { id: 't51', name: 'Alabama State Docks — Berths 1–6' },
      { id: 't52', name: 'Alabama State Docks — Berths 7–12' },
      { id: 't53', name: 'Choctaw Point Container Terminal' },
      { id: 't54', name: 'APM Terminals Mobile' },
      { id: 't55', name: 'Bulk Terminals — Pinto Island' },
    ]},
    { id: 'mob-pasc', name: 'Port of Pascagoula', unlocode: 'US PGL', terminals: [
      { id: 't56', name: 'Singing River Terminal' },
      { id: 't57', name: 'VT Halter Marine Wharf' },
      { id: 't58', name: 'Mississippi Export Railroad Terminal' },
    ]},
    { id: 'mob-gpt', name: 'Port of Gulfport', unlocode: 'US GPT', terminals: [
      { id: 't59', name: 'Mississippi State Port — Berths 1–4' },
      { id: 't60', name: 'Gulfport Commercial Terminal' },
      { id: 't61', name: 'Olin Corp Marine Terminal' },
    ]},
    { id: 'mob-pns', name: 'Port of Pensacola', unlocode: 'US PNS', terminals: [
      { id: 't62', name: 'Port of Pensacola — East Wharf' },
      { id: 't63', name: 'Port of Pensacola — West Wharf' },
    ]},
  ],
}

const SAMPLE_VESSELS = [
  { id: 'v1', name: 'MV STELLAR HORIZON',  imo: '9876543', flag: 'MH', type: 'Bulk Carrier', dwt: '82,400', loa: '229m' },
  { id: 'v2', name: 'MV CAPE FORTUNA',     imo: '9812345', flag: 'PA', type: 'Supramax',     dwt: '56,800', loa: '199m' },
  { id: 'v3', name: 'MV NORDIC VALOUR',    imo: '9834567', flag: 'SG', type: 'Capesize',     dwt: '180,200',loa: '292m' },
  { id: 'v4', name: 'MV GENCO RESOLUTE',   imo: '9798765', flag: 'MH', type: 'Panamax',      dwt: '81,600', loa: '229m' },
  { id: 'v5', name: 'MV ASIAN GRACE',      imo: '9801234', flag: 'HK', type: 'Handysize',    dwt: '33,400', loa: '189m' },
  { id: 'v6', name: 'MV DELTA SPIRIT',     imo: '9823456', flag: 'LR', type: 'Supramax',     dwt: '58,200', loa: '200m' },
  { id: 'v7', name: 'MV PACIFIC HARMONY',  imo: '9387000', flag: 'HK', type: 'Bulk Carrier', dwt: '87,000', loa: '229m' },
  { id: 'v8', name: 'MV BAYOU STAR',       imo: '9765432', flag: 'PA', type: 'Bulk Carrier', dwt: '79,500', loa: '225m' },
  { id: 'v9', name: 'MV GULF PIONEER',     imo: '9745123', flag: 'GR', type: 'Panamax',      dwt: '76,800', loa: '225m' },
  { id:'v10', name: 'MV KLAVENESS CONDOR', imo: '9712980', flag: 'NO', type: 'Combination',  dwt: '62,000', loa: '210m' },
]
type Vessel = typeof SAMPLE_VESSELS[0]

const CUSTOMERS = [
  { id: 'c1', name: 'Pacific Basin Shipping',  initials: 'PB', type: 'Owner',     flag: null },
  { id: 'c2', name: 'Klaveness Combination',   initials: 'KC', type: 'Charterer', flag: { level: 'warn', msg: 'Cash only · Avg funding lead 12 days' } },
  { id: 'c3', name: 'Oldendorff Carriers',     initials: 'OC', type: 'Owner',     flag: { level: 'hold', msg: 'Account on hold — manager approval required' } },
  { id: 'c4', name: 'Cargill Ocean Transport', initials: 'CG', type: 'Charterer', flag: { level: 'info', msg: 'PDA payer · Avg settlement 8 days' } },
  { id: 'c5', name: 'Norden Bulk',             initials: 'NB', type: 'Owner',     flag: null },
  { id: 'c6', name: 'Genco Shipping',          initials: 'GS', type: 'Owner',     flag: null },
  { id: 'c7', name: 'Bunge Limited',           initials: 'BL', type: 'Charterer', flag: { level: 'warn', msg: 'Supplemental PDA required · Credit limit $25k' } },
]
type Customer = typeof CUSTOMERS[0]

const DASHBOARD_ROWS = [
  { file: 'NOL-2026-00847', vessel: 'MV STELLAR HORIZON',  type: 'Bulk Carrier', status: 'working',   principal: 'Pacific Basin',  port: 'New Orleans',  cargo: 'Pet Coke',   proforma: 87500,  funded: 62000 },
  { file: 'NOL-2026-00846', vessel: 'MV CAPE FORTUNA',     type: 'Supramax',     status: 'berthed',   principal: 'Klaveness',      port: 'Burnside, LA', cargo: 'Alumina',    proforma: 64200,  funded: 45000 },
  { file: 'HOU-2026-00312', vessel: 'MV NORDIC VALOUR',    type: 'Capesize',     status: 'expected',  principal: 'Oldendorff',     port: 'Mobile, AL',   cargo: 'Iron Ore',   proforma: 112000, funded: 0     },
  { file: 'MOB-2026-00189', vessel: 'MV GENCO RESOLUTE',   type: 'Panamax',      status: 'at_anchor', principal: 'Genco Shipping', port: 'SW Pass',      cargo: 'Coal',       proforma: 78000,  funded: 30000 },
  { file: 'NOL-2026-00845', vessel: 'MV ASIAN GRACE',      type: 'Handysize',    status: 'sailed',    principal: 'Norden',         port: 'Avondale',     cargo: 'Steel Coils',proforma: 52000,  funded: 52000 },
  { file: 'HOU-2026-00311', vessel: 'MV DELTA SPIRIT',     type: 'Supramax',     status: 'expected',  principal: 'Cargill',        port: 'Houston',      cargo: 'Grain',      proforma: 61000,  funded: 0     },
  { file: 'NOL-2026-00844', vessel: 'MV BAYOU STAR',       type: 'Bulk Carrier', status: 'working',   principal: 'Pacific Basin',  port: 'New Orleans',  cargo: 'Pet Coke',   proforma: 95000,  funded: 95000 },
]

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  expected:  { label: 'Expected',      color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  at_anchor: { label: 'At Anchor',     color: '#D97706', bg: 'rgba(217,119,6,0.12)'   },
  berthed:   { label: 'Berthed',       color: '#2563EB', bg: 'rgba(37,99,235,0.12)'   },
  working:   { label: 'Working Cargo', color: '#059669', bg: 'rgba(5,150,105,0.12)'   },
  sailed:    { label: 'Sailed',        color: '#7C3AED', bg: 'rgba(124,58,237,0.12)'  },
}

// ─── Global styles ─────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
  .shipops-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, system-ui, sans-serif; }
  .shipops-root input, .shipops-root select, .shipops-root textarea, .shipops-root button { font-family: inherit; font-size: 13px; }
  .shipops-root ::-webkit-scrollbar { width: 5px; height: 5px; }
  .shipops-root ::-webkit-scrollbar-track { background: transparent; }
  .shipops-root ::-webkit-scrollbar-thumb { background: #2D3140; border-radius: 3px; }
  @keyframes so-fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes so-slideUp { from { opacity:0; transform:translateY(20px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes so-pulse   { 0%,100% { box-shadow:0 0 0 0 rgba(5,150,105,.4); } 50% { box-shadow:0 0 0 5px rgba(5,150,105,0); } }
  @keyframes so-matrixPulse { 0%,100% { box-shadow:0 0 0 0 rgba(0,230,118,.3); } 50% { box-shadow:0 0 0 6px rgba(0,230,118,0); } }
  .so-row:hover { background: #1A1D27 !important; cursor: pointer; }
  .so-party-row:hover  { background: #252836 !important; }
  .so-vessel-row:hover { background: #252836 !important; }
  .so-btn-ghost { background:transparent; border:1px solid #2D3140; color:#CBD5E1; border-radius:6px; padding:0 14px; height:32px; cursor:pointer; font-size:13px; font-weight:500; transition:all .15s; display:inline-flex; align-items:center; gap:6px; }
  .so-btn-ghost:hover { background:#1F2937; color:#FFFFFF; border-color:#374151; }
  .so-btn-matrix { background:rgba(0,230,118,0.12); border:1px solid rgba(0,230,118,0.35); color:#00E676; border-radius:6px; padding:0 16px; height:32px; cursor:pointer; font-size:13px; font-weight:600; transition:all .15s; display:inline-flex; align-items:center; gap:6px; animation:so-matrixPulse 3s infinite; }
  .so-btn-matrix:hover:not(:disabled) { background:rgba(0,230,118,0.2); border-color:rgba(0,230,118,0.6); }
  .so-btn-matrix:disabled { opacity:.35; cursor:not-allowed; animation:none; }
  .so-input { width:100%; height:32px; background:#0D1017; border:1px solid #2D3140; border-radius:5px; padding:0 10px; color:#FFFFFF; font-size:13px; outline:none; transition:border-color .15s; }
  .so-input:focus { border-color:#3B82F6; }
  .so-input::placeholder { color:#4B5563; }
  .so-input-pl { padding-left:28px; }
  .so-select { width:100%; height:32px; background:#0D1017; border:1px solid #2D3140; border-radius:5px; padding:0 28px 0 10px; color:#FFFFFF; font-size:13px; outline:none; appearance:none; transition:border-color .15s; }
  .so-select:focus { border-color:#3B82F6; }
  .so-select.placeholder { color:#4B5563; }
  .so-textarea { width:100%; background:#0D1017; border:1px solid #2D3140; border-radius:5px; padding:8px 10px; color:#FFFFFF; font-size:13px; outline:none; resize:none; transition:border-color .15s; line-height:1.5; }
  .so-textarea:focus { border-color:#3B82F6; }
  .so-textarea::placeholder { color:#4B5563; }
  .so-multiselect-trigger { width:100%; min-height:32px; background:#0D1017; border:1px solid #2D3140; border-radius:5px; padding:4px 28px 4px 10px; color:#FFFFFF; font-size:13px; outline:none; cursor:pointer; display:flex; align-items:flex-start; flex-wrap:wrap; gap:4px; text-align:left; transition:border-color .15s; }
  .so-multiselect-trigger:focus { border-color:#3B82F6; }
`

// ─── SVG icons ─────────────────────────────────────────────────────────────────
const IC = (d: string | React.ReactNode, size = 16, color = 'currentColor') => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)
const ISearch  = (s=14) => IC('M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', s)
const IChevron = (s=12) => IC('M6 9l6 6 6-6', s)
const IClose   = (s=16) => IC(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>, s)
const IAnchor  = (s=16) => IC(<><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0020 0h-3"/></>, s)
const IAlert   = (s=14) => IC(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>, s)
const IWarn    = (s=14) => IC(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, s)
const IInfo    = (s=14) => IC(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>, s)
const IBell    = (s=14) => IC(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>, s)
const ICheck   = (s=12) => IC('M20 6L9 17l-5-5', s)
const IShip    = (s=13) => IC(<><path d="M2 20a2.4 2.4 0 002 1 2.4 2.4 0 002-1 2.4 2.4 0 012-1 2.4 2.4 0 012 1 2.4 2.4 0 002 1 2.4 2.4 0 002-1 2.4 2.4 0 012-1 2.4 2.4 0 012 1"/><path d="M4 18l-1-5h18l-1 5"/><path d="M12 2v7"/><path d="M7 9h10"/></>, s)

// ─── Dashboard (blurred behind modal) ─────────────────────────────────────────

function DashboardBehind() {
  return (
    <div className="shipops-root" style={{ position:'fixed', inset:0, display:'flex', overflow:'hidden', userSelect:'none', pointerEvents:'none', fontFamily:"'DM Sans', system-ui, sans-serif" }} aria-hidden>
      <style>{GLOBAL_CSS}</style>

      {/* Sidebar */}
      <aside style={{ width:220, flexShrink:0, height:'100%', background:'#030916', borderRight:'1px solid #0F1623', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderBottom:'1px solid #111D2E' }}>
          <div style={{ width:28, height:28, borderRadius:6, background:'rgba(59,130,246,0.9)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {IAnchor(14)}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#FFFFFF' }}>ShipOps</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:1 }}>Gulf Coast Agency</div>
          </div>
        </div>
        <nav style={{ flex:1, padding:'12px 8px', display:'flex', flexDirection:'column', gap:20 }}>
          {[
            { section:'OPERATIONS', items:[{l:'Port Calls',b:'23',a:true},{l:'Vessels'},{l:'Customers'}] },
            { section:'FINANCE',    items:[{l:'PDA / FDA'},{l:'AR / AP'},{l:'Reports'}] },
            { section:'ADMIN',      items:[{l:'Organizations'},{l:'Settings'}] },
          ].map(({ section, items }) => (
            <div key={section}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(255,255,255,0.18)', paddingLeft:8, marginBottom:4 }}>{section}</div>
              {items.map((item: any) => (
                <div key={item.l} style={{ position:'relative', display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:6, background: item.a ? 'rgba(59,130,246,0.1)' : 'transparent', color: item.a ? '#60A5FA' : 'rgba(255,255,255,0.4)', fontSize:13 }}>
                  {item.a && <span style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', width:2, height:16, background:'#3B82F6', borderRadius:'0 2px 2px 0' }} />}
                  <div style={{ width:14, height:14, borderRadius:3, background:'currentColor', opacity:0.4, flexShrink:0 }} />
                  <span style={{ flex:1 }}>{item.l}</span>
                  {item.b && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:10, background: item.a ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)', color: item.a ? '#60A5FA' : 'rgba(255,255,255,0.3)' }}>{item.b}</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ borderTop:'1px solid #111D2E', padding:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px' }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:9, fontWeight:700, color:'#60A5FA' }}>WD</span>
            </div>
            <div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', fontWeight:500 }}>Will Davis</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>Manager · NOL</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:T.bg }}>
        {/* Topbar */}
        <div style={{ height:48, borderBottom:`1px solid ${T.border}`, background:T.surface, display:'flex', alignItems:'center', padding:'0 20px', gap:12, flexShrink:0 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.7)' }}>Port Calls</span>
          <div style={{ flex:1 }} />
          <div style={{ display:'flex', alignItems:'center', gap:8, height:30, padding:'0 12px', borderRadius:6, border:`1px solid ${T.border}`, background:'rgba(255,255,255,0.02)', color:T.textFaint, fontSize:12 }}>
            {ISearch(13)} Search everything…
            <span style={{ marginLeft:6, fontSize:10, border:`1px solid ${T.borderMd}`, borderRadius:3, padding:'1px 5px', color:T.textFaint }}>⌘K</span>
          </div>
          <div style={{ width:30, height:30, borderRadius:6, border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', color:T.textFaint }}>
            {IBell(14)}
          </div>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:9, fontWeight:700, color:'rgba(96,165,250,0.7)' }}>WD</span>
          </div>
        </div>

        {/* Page header */}
        <div style={{ padding:'16px 24px 14px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, color:'rgba(255,255,255,0.65)', letterSpacing:'-0.02em' }}>Active Port Calls</h1>
            <p style={{ fontSize:12, color:T.textFaint, marginTop:2 }}>7 active files · 3 vessels in port</p>
          </div>
          <div style={{ height:32, padding:'0 14px', borderRadius:6, background:'rgba(59,130,246,0.2)', color:'rgba(96,165,250,0.55)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center' }}>+ New Port Call</div>
        </div>

        {/* Filters */}
        <div style={{ padding:'10px 24px', display:'flex', gap:6, flexShrink:0, borderBottom:`1px solid ${T.border}` }}>
          {['All (7)', 'Expected (2)', 'At Anchor (1)', 'Berthed (1)', 'Working (2)', 'Sailed (1)'].map((f, i) => (
            <div key={f} style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:500, border:`1px solid ${i===0?'#3B82F6':T.borderMd}`, background:i===0?'rgba(30,41,59,0.8)':'transparent', color:i===0?'#60A5FA':T.textFaint }}>
              {f}
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex:1, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {['Vessel / File No.','Status','Port','Cargo','Proforma','Funded'].map(h => (
                  <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:T.textFaint, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DASHBOARD_ROWS.map((r, i) => {
                const sc = STATUS_CFG[r.status]
                const pct = r.proforma ? Math.min(100, (r.funded / r.proforma) * 100) : 0
                return (
                  <tr key={r.file} className="so-row" style={{ borderBottom:`1px solid ${T.border}`, animation:`so-fadeIn 0.2s ease ${i*0.04}s both` }}>
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ fontWeight:600, fontSize:13, color:'rgba(255,255,255,0.6)' }}>{r.vessel}</div>
                      <div style={{ fontSize:11, color:T.textFaint, marginTop:1, fontFamily:"'JetBrains Mono', monospace" }}>{r.file} · {r.type}</div>
                    </td>
                    <td style={{ padding:'11px 16px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.02em', background:sc.bg, color:sc.color }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:sc.color, ...(r.status==='working'?{animation:'so-pulse 2s infinite'}:{}) }} />
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding:'11px 16px', fontSize:12, color:'rgba(255,255,255,0.45)' }}>{r.port}</td>
                    <td style={{ padding:'11px 16px', fontSize:12, color:'rgba(255,255,255,0.45)' }}>{r.cargo}</td>
                    <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'rgba(0,230,118,0.55)' }}>${r.proforma.toLocaleString()}</td>
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color: pct>=100?'rgba(0,230,118,0.7)':'rgba(245,158,11,0.65)' }}>${r.funded.toLocaleString()}</div>
                      {r.proforma > 0 && <div style={{ width:80, height:2, background:'#1F2937', borderRadius:1, marginTop:3 }}>
                        <div style={{ width:`${pct}%`, height:'100%', background: pct>=100?T.matrix:T.yellow, borderRadius:1, opacity:0.6 }} />
                      </div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Form helpers ──────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display:'block', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:T.textDim, marginBottom:6 }}>
      {children}{required && <span style={{ color:T.red, marginLeft:2 }}>*</span>}
    </label>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:4 }}>
      <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:T.textFaint, whiteSpace:'nowrap' }}>{label}</span>
      <div style={{ flex:1, height:1, background:T.border }} />
    </div>
  )
}

function FlagBanner({ level, msg }: { level: string; msg: string }) {
  const cfg: Record<string,{bg:string;border:string;color:string}> = {
    hold: { bg:'rgba(239,68,68,0.07)',  border:'rgba(239,68,68,0.3)',  color:'#FCA5A5' },
    warn: { bg:'rgba(245,158,11,0.07)', border:'rgba(245,158,11,0.3)', color:'#FCD34D' },
    info: { bg:'rgba(59,130,246,0.07)', border:'rgba(59,130,246,0.3)', color:'#93C5FD' },
  }
  const c = cfg[level] ?? cfg.info
  const icon = level==='hold' ? IAlert(13) : level==='warn' ? IWarn(13) : IInfo(13)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 10px', borderRadius:5, border:`1px solid ${c.border}`, background:c.bg, color:c.color, fontSize:11, marginTop:5 }}>
      {icon}{msg}
    </div>
  )
}

// ─── Vessel search field ───────────────────────────────────────────────────────

function VesselSearch({ value, onSelect }: { value: Vessel | null; onSelect: (v: Vessel | null) => void }) {
  const [q, setQ]       = useState('')
  const [open, setOpen] = useState(false)
  const inputRef        = useRef<HTMLInputElement>(null)

  const shown = q.length >= 1
    ? SAMPLE_VESSELS.filter(v => v.name.toLowerCase().includes(q.toLowerCase()) || v.imo.includes(q))
    : SAMPLE_VESSELS

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && shown.length > 0) {
      onSelect(shown[0]); setOpen(false); setQ('')
    }
    if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <div>
      <FieldLabel required>Vessel</FieldLabel>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:T.textFaint, pointerEvents:'none' }}>
          {ISearch(13)}
        </span>
        <input
          ref={inputRef}
          className="so-input so-input-pl"
          value={open ? q : (value?.name ?? '')}
          onChange={e => { setQ(e.target.value); setOpen(true); if (value) onSelect(null) }}
          onFocus={() => { setQ(''); setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKey}
          placeholder="Search by vessel name or IMO…"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onSelect(null); setQ(''); inputRef.current?.focus() }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.textFaint, display:'flex', alignItems:'center' }}>
            {IClose(13)}
          </button>
        )}
        {open && (
          <div style={{ position:'absolute', zIndex:60, top:'100%', marginTop:4, width:'100%', background:T.panel, border:`1px solid ${T.borderMd}`, borderRadius:8, boxShadow:'0 20px 50px rgba(0,0,0,0.7)', overflow:'hidden', maxHeight:220, overflowY:'auto' }}>
            {shown.length === 0 && (
              <div style={{ padding:'14px 12px', fontSize:12, color:T.textFaint, textAlign:'center' }}>No vessels found</div>
            )}
            {shown.map(v => (
              <button key={v.id} type="button" className="so-vessel-row"
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'transparent', border:'none', borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:'pointer', textAlign:'left' }}
                onMouseDown={() => { onSelect(v); setOpen(false); setQ('') }}>
                <div style={{ width:28, height:28, borderRadius:6, background:'rgba(59,130,246,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {IShip(13)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{v.name}</div>
                  <div style={{ fontSize:11, color:T.textDim, marginTop:1, fontFamily:"'JetBrains Mono', monospace" }}>
                    IMO {v.imo} · {v.type} · Flag: {v.flag}
                  </div>
                </div>
                <div style={{ fontSize:11, color:T.textFaint, textAlign:'right', flexShrink:0 }}>
                  <div>{v.dwt} DWT</div>
                  <div>LOA {v.loa}</div>
                </div>
              </button>
            ))}
            <div style={{ padding:'6px 12px', fontSize:10, color:T.textFaint, borderTop:`1px solid ${T.border}` }}>
              Press <kbd style={{ background:T.border, padding:'1px 4px', borderRadius:3, fontSize:10 }}>Enter</kbd> to select first result
            </div>
          </div>
        )}
      </div>
      {value && (
        <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:14, padding:'8px 12px', background:T.input, border:`1px solid rgba(0,230,118,0.2)`, borderRadius:6, fontSize:11 }}>
          <span style={{ fontWeight:700, color:T.matrix, fontFamily:"'JetBrains Mono', monospace" }}>{value.name}</span>
          <span style={{ color:T.textDim }}>IMO {value.imo}</span>
          <span style={{ color:T.textDim }}>Flag: {value.flag}</span>
          <span style={{ color:T.textDim }}>{value.type}</span>
          <span style={{ color:T.textDim }}>{value.dwt} DWT</span>
          <span style={{ color:T.textDim }}>LOA {value.loa}</span>
        </div>
      )}
    </div>
  )
}

// ─── Party search field ────────────────────────────────────────────────────────

function PartySearch({ label, required, value, onSelect, sameAsLabel, isSameAs, onToggleSameAs }: {
  label: string; required?: boolean; value: Customer | null; onSelect: (c: Customer | null) => void
  sameAsLabel?: string; isSameAs?: boolean; onToggleSameAs?: (v: boolean) => void
}) {
  const [q, setQ]       = useState('')
  const [open, setOpen] = useState(false)
  const shown = q ? CUSTOMERS.filter(c => c.name.toLowerCase().includes(q.toLowerCase())) : CUSTOMERS

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <FieldLabel required={required}>{label}</FieldLabel>
        {sameAsLabel && onToggleSameAs && (
          <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:T.textDim, cursor:'pointer', userSelect:'none' }}>
            <input type="checkbox" checked={isSameAs} onChange={e => onToggleSameAs(e.target.checked)} style={{ accentColor:T.primary, width:11, height:11 }} />
            Same as {sameAsLabel}
          </label>
        )}
      </div>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:T.textFaint, pointerEvents:'none' }}>
          {ISearch(13)}
        </span>
        <input
          className="so-input so-input-pl"
          value={isSameAs ? '' : (open ? q : (value?.name ?? ''))}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => { if (!isSameAs) { setQ(''); setOpen(true) } }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={isSameAs}
          placeholder={isSameAs ? `Same as ${sameAsLabel}` : 'Search customers…'}
          style={{ opacity: isSameAs ? 0.4 : 1, cursor: isSameAs ? 'not-allowed' : 'text' }}
        />
        {open && !isSameAs && (
          <div style={{ position:'absolute', zIndex:60, top:'100%', marginTop:4, width:'100%', background:T.panel, border:`1px solid ${T.borderMd}`, borderRadius:8, boxShadow:'0 20px 50px rgba(0,0,0,0.7)', overflow:'hidden', maxHeight:200, overflowY:'auto' }}>
            {shown.map(c => (
              <button key={c.id} type="button" className="so-party-row"
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', background:'transparent', border:'none', borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:'pointer', textAlign:'left' }}
                onMouseDown={() => { onSelect(c); setOpen(false); setQ('') }}>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <div style={{ width:24, height:24, borderRadius:6, background:'rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:9, fontWeight:700, color:T.primary }}>{c.initials}</span>
                  </div>
                  <span style={{ fontSize:13, color:T.text }}>{c.name}</span>
                  <span style={{ fontSize:11, color:T.textDim }}>{c.type}</span>
                </div>
                {c.flag?.level === 'hold' && <span style={{ fontSize:10, color:'#FCA5A5', fontWeight:600 }}>On Hold</span>}
                {c.flag?.level === 'warn' && <span style={{ fontSize:10, color:'#FCD34D' }}>⚠ Warning</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {value && !isSameAs && value.flag && <FlagBanner level={value.flag.level} msg={value.flag.msg} />}
    </div>
  )
}

// ─── Scope multi-select dropdown ───────────────────────────────────────────────

function ScopeSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt])

  const label = value.length === 0 ? 'Select service scope…'
    : value.length === 1 ? value[0]
    : `${value[0]} +${value.length - 1} more`

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ width:'100%', height:32, background:T.input, border:`1px solid ${open ? T.primary : T.borderMd}`, borderRadius:5, padding:'0 28px 0 10px', color: value.length ? T.text : T.textFaint, fontSize:13, outline:'none', cursor:'pointer', display:'flex', alignItems:'center', textAlign:'left', transition:'border-color .15s', position:'relative' }}>
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
        <span style={{ position:'absolute', right:8, top:'50%', transform:`translateY(-50%) rotate(${open?'180deg':'0deg'})`, transition:'transform .15s', color:T.textFaint, display:'flex' }}>
          {IChevron(12)}
        </span>
      </button>
      {value.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
          {value.map(v => (
            <span key={v} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px 2px 9px', borderRadius:20, fontSize:11, fontWeight:500, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.3)', color:'#93C5FD' }}>
              {v}
              <button type="button" onClick={() => toggle(v)} style={{ background:'none', border:'none', cursor:'pointer', color:'#93C5FD', display:'flex', alignItems:'center', padding:0, marginLeft:1 }}>
                {IClose(10)}
              </button>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div style={{ position:'absolute', zIndex:60, top:'100%', marginTop:4, width:'100%', background:T.panel, border:`1px solid ${T.borderMd}`, borderRadius:8, boxShadow:'0 20px 50px rgba(0,0,0,0.7)', overflow:'hidden', maxHeight:240, overflowY:'auto' }}>
          {SCOPE_OPTS.map(opt => {
            const checked = value.includes(opt)
            return (
              <button key={opt} type="button"
                onClick={() => toggle(opt)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background: checked ? 'rgba(59,130,246,0.08)' : 'transparent', border:'none', borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:'pointer', textAlign:'left', transition:'background .1s' }}
                onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background='#252836' }}
                onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background='transparent' }}>
                <div style={{ width:16, height:16, borderRadius:4, border:`1px solid ${checked ? T.primary : T.borderMd}`, background: checked ? T.primary : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .12s' }}>
                  {checked && <span style={{ color:'#fff' }}>{ICheck(10)}</span>}
                </div>
                <span style={{ fontSize:13, color: checked ? T.text : T.textMuted }}>{opt}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Port + Terminal cascading select ─────────────────────────────────────────
// Scoped to office. Port dropdown → Terminal dropdown cascade.

function PortTerminalSelect({ officeCode, port, terminal, onPortChange, onTerminalChange }: {
  officeCode: string
  port: PortEntry | null
  terminal: Terminal | null
  onPortChange: (p: PortEntry | null) => void
  onTerminalChange: (t: Terminal | null) => void
}) {
  const [portQ, setPortQ]         = useState('')
  const [portOpen, setPortOpen]   = useState(false)
  const [termOpen, setTermOpen]   = useState(false)
  const portRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (portRef.current && !portRef.current.contains(e.target as Node)) setPortOpen(false)
      if (termRef.current && !termRef.current.contains(e.target as Node)) setTermOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const availablePorts = officeCode ? (OFFICE_PORTS[officeCode] ?? []) : []
  const shownPorts = portQ
    ? availablePorts.filter(p => p.name.toLowerCase().includes(portQ.toLowerCase()) || p.unlocode.toLowerCase().includes(portQ.toLowerCase()))
    : availablePorts
  const availableTerminals = port?.terminals ?? []

  const noOffice = !officeCode

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      {/* Port */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <FieldLabel required>Port</FieldLabel>
          {officeCode && (
            <span style={{ fontSize:10, color:T.textFaint, fontStyle:'italic' }}>
              {availablePorts.length} ports · {officeCode} office
            </span>
          )}
        </div>
        <div ref={portRef} style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color: noOffice ? T.textFaint : T.textDim, pointerEvents:'none' }}>
            {ISearch(13)}
          </span>
          <input
            className="so-input so-input-pl"
            disabled={noOffice}
            value={portOpen ? portQ : (port?.name ?? '')}
            onChange={e => { setPortQ(e.target.value); setPortOpen(true) }}
            onFocus={() => { if (!noOffice) { setPortQ(''); setPortOpen(true) } }}
            onBlur={() => setTimeout(() => setPortOpen(false), 150)}
            placeholder={noOffice ? 'Select office first…' : `Search ${availablePorts.length} ports…`}
            style={{ opacity: noOffice ? 0.4 : 1, cursor: noOffice ? 'not-allowed' : 'text' }}
          />
          {port && (
            <button type="button" onClick={() => { onPortChange(null); onTerminalChange(null) }}
              style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.textFaint, display:'flex' }}>
              {IClose(12)}
            </button>
          )}
          {portOpen && !noOffice && (
            <div style={{ position:'absolute', zIndex:60, top:'100%', marginTop:4, width:'100%', background:T.panel, border:`1px solid ${T.borderMd}`, borderRadius:8, boxShadow:'0 20px 50px rgba(0,0,0,0.7)', overflow:'hidden', maxHeight:240, overflowY:'auto' }}>
              {shownPorts.length === 0 && (
                <div style={{ padding:'12px', fontSize:12, color:T.textFaint, textAlign:'center' }}>No ports match</div>
              )}
              {shownPorts.map(p => (
                <button key={p.id} type="button" className="so-vessel-row"
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', background:'transparent', border:'none', borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:'pointer', textAlign:'left' }}
                  onMouseDown={() => { onPortChange(p); onTerminalChange(null); setPortOpen(false); setPortQ('') }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{p.name}</div>
                    <div style={{ fontSize:11, color:T.textFaint, marginTop:1 }}>{p.terminals.length} terminals · {p.unlocode}</div>
                  </div>
                </button>
              ))}
              <div style={{ padding:'6px 12px', borderTop:`1px solid ${T.border}`, fontSize:10, color:T.textFaint }}>
                Showing {officeCode} office ports only · <span style={{ color:T.primary }}>+ Add foreign port</span>
              </div>
            </div>
          )}
        </div>
        {port && (
          <div style={{ marginTop:5, fontSize:11, color:T.textDim, display:'flex', gap:8 }}>
            <span style={{ color:T.matrix }}>✓</span>
            <span>{port.unlocode}</span>
            <span>·</span>
            <span>{port.terminals.length} terminals</span>
          </div>
        )}
      </div>

      {/* Terminal */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <FieldLabel>Terminal / Berth</FieldLabel>
          {port && <span style={{ fontSize:10, color:T.textFaint, fontStyle:'italic' }}>{availableTerminals.length} berths</span>}
        </div>
        <div ref={termRef} style={{ position:'relative' }}>
          <button type="button" onClick={() => { if (port) setTermOpen(o => !o) }}
            style={{ width:'100%', height:32, background:T.input, border:`1px solid ${termOpen ? T.primary : T.borderMd}`, borderRadius:5, padding:'0 28px 0 10px', color: terminal ? T.text : T.textFaint, fontSize:13, outline:'none', cursor: port ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', opacity: port ? 1 : 0.4, transition:'border-color .15s', textAlign:'left' }}>
            <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {!port ? 'Select port first…' : terminal ? terminal.name : `Select terminal…`}
            </span>
            <span style={{ position:'absolute', right:8, top:'50%', transform:`translateY(-50%) rotate(${termOpen?'180deg':'0deg'})`, transition:'transform .15s', color:T.textFaint, display:'flex' }}>
              {IChevron(12)}
            </span>
          </button>
          {termOpen && port && (
            <div style={{ position:'absolute', zIndex:60, top:'100%', marginTop:4, width:'100%', background:T.panel, border:`1px solid ${T.borderMd}`, borderRadius:8, boxShadow:'0 20px 50px rgba(0,0,0,0.7)', overflow:'hidden', maxHeight:240, overflowY:'auto' }}>
              <div style={{ padding:'6px 12px 4px', fontSize:10, color:T.textFaint, borderBottom:`1px solid ${T.border}` }}>
                {port.name}
              </div>
              {availableTerminals.map(t => (
                <button key={t.id} type="button" className="so-vessel-row"
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background: terminal?.id === t.id ? 'rgba(59,130,246,0.1)' : 'transparent', border:'none', borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:'pointer', textAlign:'left' }}
                  onMouseDown={() => { onTerminalChange(t); setTermOpen(false) }}>
                  {terminal?.id === t.id && <span style={{ color:T.primary, flexShrink:0 }}>{ICheck(12)}</span>}
                  <span style={{ fontSize:13, color: terminal?.id === t.id ? T.text : T.textMuted }}>{t.name}</span>
                </button>
              ))}
              <div style={{ padding:'6px 12px', borderTop:`1px solid ${T.border}`, fontSize:10, color:T.textFaint }}>
                <span style={{ color:T.primary, cursor:'pointer' }}>+ Enter custom berth / anchorage</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export function AutoOpenModal() {
  const [open, setOpen]           = useState(false)
  const [office, setOffice]       = useState('')
  const [pcType, setPcType]       = useState('')
  const [cargoGrp, setCargoGrp]   = useState('')
  const [vessel, setVessel]       = useState<Vessel | null>(null)
  const [port, setPort]           = useState<PortEntry | null>(null)
  const [terminal, setTerminal]   = useState<Terminal | null>(null)
  const [eta, setEta]             = useState('')
  const [voyNo, setVoyNo]         = useState('')
  const [extRef, setExtRef]       = useState('')
  const [notes, setNotes]         = useState('')
  const [scope, setScope]         = useState<string[]>([])
  const [appt, setAppt]           = useState<Customer | null>(null)
  const [charterer, setCharterer] = useState<Customer | null>(null)
  const [nominator, setNominator] = useState<Customer | null>(null)
  const [nomSame, setNomSame]     = useState(false)

  useEffect(() => { setTimeout(() => setOpen(true), 200) }, [])

  const offCode  = office.match(/\((\w+)\)/)?.[1] ?? ''
  const fileNo   = offCode ? `${offCode}-2026-00848` : '—'
  const hasHold  = [appt, charterer, nomSame ? null : nominator].some(p => p?.flag?.level === 'hold')

  return (
    <div className="shipops-root" style={{ fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      <DashboardBehind />

      {/* Backdrop */}
      {open && (
        <div style={{ position:'fixed', inset:0, zIndex:40, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(3px)', animation:'so-fadeIn 0.2s ease' }} onClick={() => setOpen(false)} />
      )}

      {/* Modal */}
      {open && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{
            width:'100%', maxWidth:700, maxHeight:'90vh', display:'flex', flexDirection:'column',
            background:T.panel, border:`1px solid ${T.borderMd}`, borderRadius:12,
            boxShadow:'0 32px 80px rgba(0,0,0,0.75)', overflow:'hidden',
            animation:'so-slideUp 0.22s cubic-bezier(0.16,1,0.3,1)',
          }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px 16px', borderBottom:`1px solid ${T.border}`, flexShrink:0, background:'rgba(0,0,0,0.15)' }}>
              <div>
                <h2 style={{ fontSize:16, fontWeight:700, color:T.text, letterSpacing:'-0.02em' }}>New Port Call</h2>
                <p style={{ fontSize:11, color:T.textDim, marginTop:3 }}>Open a new file · File number assigned on save</p>
              </div>
              <button onClick={() => setOpen(false)} className="so-btn-ghost" style={{ width:30, height:30, padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {IClose(15)}
              </button>
            </div>

            {/* Body */}
            <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* File Setup */}
              <SectionDivider label="File Setup" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <FieldLabel required>Office</FieldLabel>
                  <div style={{ position:'relative' }}>
                    <select className={`so-select${!office?' placeholder':''}`} value={office} onChange={e => { setOffice(e.target.value); setPort(null); setTerminal(null) }}>
                      <option value="">Select office…</option>
                      {OFFICES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:T.textFaint, display:'flex' }}>{IChevron(12)}</span>
                  </div>
                </div>
                <div>
                  <FieldLabel required>Port Call Type</FieldLabel>
                  <div style={{ position:'relative' }}>
                    <select className={`so-select${!pcType?' placeholder':''}`} value={pcType} onChange={e => setPcType(e.target.value)}>
                      <option value="">Select type…</option>
                      {PORT_CALL_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:T.textFaint, display:'flex' }}>{IChevron(12)}</span>
                  </div>
                </div>
              </div>
              <div>
                <FieldLabel>Service Scope</FieldLabel>
                <ScopeSelect value={scope} onChange={setScope} />
              </div>

              {/* Vessel */}
              <SectionDivider label="Vessel" />
              <VesselSearch value={vessel} onSelect={setVessel} />

              {/* Parties */}
              <SectionDivider label="Parties" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <PartySearch label="Appointing Party" required value={appt} onSelect={setAppt} />
                <PartySearch label="Charterer" value={charterer} onSelect={setCharterer} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <PartySearch label="Nominator" value={nominator} onSelect={setNominator} sameAsLabel="Appointing Party" isSameAs={nomSame} onToggleSameAs={setNomSame} />
                <div>
                  <FieldLabel>Cargo Group</FieldLabel>
                  <div style={{ position:'relative' }}>
                    <select className={`so-select${!cargoGrp?' placeholder':''}`} value={cargoGrp} onChange={e => setCargoGrp(e.target.value)}>
                      <option value="">Select cargo group…</option>
                      {CARGO_GROUPS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:T.textFaint, display:'flex' }}>{IChevron(12)}</span>
                  </div>
                </div>
              </div>

              {/* Port & Timing */}
              <SectionDivider label="Port & Timing" />
              <PortTerminalSelect
                officeCode={offCode}
                port={port}
                terminal={terminal}
                onPortChange={p => { setPort(p); setTerminal(null) }}
                onTerminalChange={setTerminal}
              />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <div>
                  <FieldLabel>ETA</FieldLabel>
                  <input type="datetime-local" className="so-input" value={eta} onChange={e => setEta(e.target.value)} style={{ colorScheme:'dark' }} />
                </div>
                <div>
                  <FieldLabel>Voyage No.</FieldLabel>
                  <input className="so-input" value={voyNo} onChange={e => setVoyNo(e.target.value)} placeholder="e.g. 2026-014N" style={{ fontFamily:"'JetBrains Mono', monospace" }} />
                </div>
                <div>
                  <FieldLabel>Ext. Ref No.</FieldLabel>
                  <input className="so-input" value={extRef} onChange={e => setExtRef(e.target.value)} placeholder="Principal's reference" style={{ fontFamily:"'JetBrains Mono', monospace" }} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <FieldLabel>Notes</FieldLabel>
                <textarea className="so-textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Initial instructions or remarks from appointing party…" />
              </div>

            </div>

            {/* Footer */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 22px',
              borderTop:`1px solid ${T.border}`, flexShrink:0, background:'rgba(0,0,0,0.2)',
              ...(hasHold ? { background:'rgba(239,68,68,0.06)' } : {}),
            }}>
              <div style={{ fontSize:12 }}>
                {hasHold ? (
                  <span style={{ display:'flex', alignItems:'center', gap:6, color:'#FCA5A5' }}>
                    {IAlert(14)} Account on hold — manager approval required to proceed
                  </span>
                ) : (
                  <span style={{ color:T.textDim }}>
                    File No.{' '}
                    <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, color:T.matrix, fontSize:13, letterSpacing:'0.04em' }}>
                      {fileNo}
                    </span>
                  </span>
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setOpen(false)} className="so-btn-ghost">Cancel</button>
                <button disabled={hasHold} className="so-btn-matrix">Open File →</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
