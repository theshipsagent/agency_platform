import { useState, useEffect, useRef, useCallback } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────
const VESSELS = [
  { id: "PC-2026-0012", vessel: "MV STELLAR HORIZON", imo: "9876543", flag: "MH", loa: "229m", dwt: "82,400", type: "Bulk Carrier", principal: "Oldendorff Carriers", agent: "W. Davis", status: "working", berth: "Nashville Ave Wharf 7", port: "New Orleans", cargo: "Pet Coke", cargoQty: "54,200 MT", eta: "2026-03-08 0600", nor: "2026-03-08 1400", berthed: "2026-03-09 0200", commenced: "2026-03-09 0800", completed: null, sailed: null, proforma: 87500, funded: 62000, actual: 71200, docs: 14, pendingSync: 0 },
  { id: "PC-2026-0013", vessel: "MV CAPE FORTUNA", imo: "9812345", flag: "PA", loa: "199m", dwt: "56,800", type: "Supramax", principal: "Pacific Basin", agent: "W. Davis", status: "berthed", berth: "Burnside Terminal", port: "Burnside, LA", cargo: "Alumina", cargoQty: "48,600 MT", eta: "2026-03-10 1200", nor: "2026-03-10 1800", berthed: "2026-03-11 0600", commenced: null, completed: null, sailed: null, proforma: 64200, funded: 45000, actual: 0, docs: 8, pendingSync: 0 },
  { id: "PC-2026-0014", vessel: "MV NORDIC VALOUR", imo: "9834567", flag: "SG", loa: "292m", dwt: "180,200", type: "Capesize", principal: "Klaveness", agent: "S. Champagne", status: "expected", berth: "TBD", port: "Mobile, AL", cargo: "Iron Ore", cargoQty: "172,000 MT", eta: "2026-03-14 0800", nor: null, berthed: null, commenced: null, completed: null, sailed: null, proforma: 112000, funded: 0, actual: 0, docs: 3, pendingSync: 0 },
  { id: "PC-2026-0011", vessel: "MV ASIAN GRACE", imo: "9801234", flag: "HK", loa: "189m", dwt: "33,400", type: "Handysize", principal: "Norden", agent: "W. Davis", status: "sailed", berth: "Avondale Terminal", port: "Avondale, LA", cargo: "Steel Coils", cargoQty: "28,100 MT", eta: "2026-03-01 1400", nor: "2026-03-01 2000", berthed: "2026-03-02 1000", commenced: "2026-03-02 1600", completed: "2026-03-05 0400", sailed: "2026-03-05 1800", proforma: 52000, funded: 52000, actual: 49800, docs: 22, pendingSync: 0 },
  { id: "PC-2026-0010", vessel: "MV GENCO RESOLUTE", imo: "9798765", flag: "MH", loa: "229m", dwt: "81,600", type: "Panamax", principal: "Genco Shipping", agent: "W. Davis", status: "at_anchor", berth: "Anchorage B", port: "Southwest Pass", cargo: "Coal", cargoQty: "74,500 MT", eta: "2026-03-11 2200", nor: "2026-03-12 0600", berthed: null, commenced: null, completed: null, sailed: null, proforma: 78000, funded: 30000, actual: 0, docs: 6, pendingSync: 2 },
];

const EXPENSES = [
  { id: 1, portcall: "PC-2026-0012", vendor: "Crescent Towing", category: "Towage", desc: "Inbound pilotage assist — 2 tugs", amount: 12400, status: "invoiced", date: "2026-03-09" },
  { id: 2, portcall: "PC-2026-0012", vendor: "Associated Terminals", category: "Stevedoring", desc: "Discharge pet coke — rate $4.25/MT", amount: 0, status: "estimated", date: "2026-03-09" },
  { id: 3, portcall: "PC-2026-0012", vendor: "Port of New Orleans", category: "Wharfage", desc: "Nashville Ave Wharf 7 — 5 days est.", amount: 8200, status: "accrued", date: "2026-03-09" },
  { id: 4, portcall: "PC-2026-0012", vendor: "CBP", category: "Tonnage Tax", desc: "Formal entry — $0.27/NT", amount: 6480, status: "paid", date: "2026-03-08" },
  { id: 5, portcall: "PC-2026-0012", vendor: "LaFleur Launch Service", category: "Launch", desc: "Crew change x2", amount: 1800, status: "invoiced", date: "2026-03-10" },
  { id: 6, portcall: "PC-2026-0012", vendor: "Gulf South Maritime", category: "Provisions", desc: "Stores delivery — deck & engine", amount: 3400, status: "paid", date: "2026-03-09" },
  { id: 7, portcall: "PC-2026-0012", vendor: "Higgins Marine Svcs", category: "Surveyors", desc: "Draft survey — load port", amount: 2200, status: "invoiced", date: "2026-03-09" },
  { id: 8, portcall: "PC-2026-0012", vendor: "Pilot Association", category: "Pilotage", desc: "Bar pilot inbound + NOBRA", amount: 18400, status: "paid", date: "2026-03-08" },
];

const TIMELINE_EVENTS = [
  { id: 1, portcall: "PC-2026-0012", event: "ETA Received", time: "2026-03-06 1000", source: "Principal", confirmed: true },
  { id: 2, portcall: "PC-2026-0012", event: "Vessel Arrived Pilot Station", time: "2026-03-08 0545", source: "AIS / Pilot", confirmed: true },
  { id: 3, portcall: "PC-2026-0012", event: "NOR Tendered", time: "2026-03-08 1400", source: "Master", confirmed: true },
  { id: 4, portcall: "PC-2026-0012", event: "NOR Accepted", time: "2026-03-08 1400", source: "Receiver", confirmed: true },
  { id: 5, portcall: "PC-2026-0012", event: "Free Pratique Granted", time: "2026-03-08 1430", source: "CBP/USPH", confirmed: true },
  { id: 6, portcall: "PC-2026-0012", event: "All Fast", time: "2026-03-09 0200", source: "Terminal", confirmed: true },
  { id: 7, portcall: "PC-2026-0012", event: "Hatch Survey Completed", time: "2026-03-09 0630", source: "Surveyor", confirmed: true },
  { id: 8, portcall: "PC-2026-0012", event: "Commenced Discharge", time: "2026-03-09 0800", source: "Terminal", confirmed: true },
  { id: 9, portcall: "PC-2026-0012", event: "Rain Delay Start", time: "2026-03-10 1400", source: "Terminal", confirmed: true },
  { id: 10, portcall: "PC-2026-0012", event: "Rain Delay End", time: "2026-03-10 2000", source: "Terminal", confirmed: true },
  { id: 11, portcall: "PC-2026-0012", event: "Completed Discharge (Est.)", time: "2026-03-13 1200", source: "Estimate", confirmed: false },
];

const DOCUMENTS = [
  { id: 1, portcall: "PC-2026-0012", name: "Notice of Readiness", type: "NOR", uploaded: "2026-03-08", source: "scan" },
  { id: 2, portcall: "PC-2026-0012", name: "CBP Formal Entry 3461", type: "Customs", uploaded: "2026-03-08", source: "email" },
  { id: 3, portcall: "PC-2026-0012", name: "Statement of Facts (Draft)", type: "SOF", uploaded: "2026-03-10", source: "generated" },
  { id: 4, portcall: "PC-2026-0012", name: "Draft Survey Report — Arrival", type: "Survey", uploaded: "2026-03-09", source: "email" },
  { id: 5, portcall: "PC-2026-0012", name: "Proforma DA", type: "DA", uploaded: "2026-03-07", source: "generated" },
  { id: 6, portcall: "PC-2026-0012", name: "Crew List", type: "Crew", uploaded: "2026-03-08", source: "email" },
  { id: 7, portcall: "PC-2026-0012", name: "Stores Receipt — Gulf South", type: "Receipt", uploaded: "2026-03-09", source: "scan" },
];

const FUNDING_RECORDS = [
  { id: 1, portcall: "PC-2026-0012", from: "Pacific Basin (Proforma Request)", amount: 87500, date: "2026-03-06", status: "requested" },
  { id: 2, portcall: "PC-2026-0012", from: "Pacific Basin — Wire #1", amount: 45000, date: "2026-03-07", status: "received" },
  { id: 3, portcall: "PC-2026-0012", from: "Pacific Basin — Wire #2", amount: 17000, date: "2026-03-10", status: "received" },
];

// ─── STATUS CONFIG ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  expected:  { label: "Expected",      color: "#6B7280", bg: "#F3F4F6", ring: "#D1D5DB" },
  at_anchor: { label: "At Anchor",     color: "#D97706", bg: "#FEF3C7", ring: "#FCD34D" },
  berthed:   { label: "Berthed",       color: "#2563EB", bg: "#DBEAFE", ring: "#93C5FD" },
  working:   { label: "Working Cargo", color: "#059669", bg: "#D1FAE5", ring: "#6EE7B7" },
  sailed:    { label: "Sailed",        color: "#7C3AED", bg: "#EDE9FE", ring: "#C4B5FD" },
};

const EXPENSE_STATUS = {
  estimated: { label: "Estimated", color: "#9CA3AF", bg: "#F9FAFB" },
  accrued:   { label: "Accrued",   color: "#D97706", bg: "#FFFBEB" },
  invoiced:  { label: "Invoiced",  color: "#2563EB", bg: "#EFF6FF" },
  paid:      { label: "Paid",      color: "#059669", bg: "#F0FDF4" },
};

// ─── ICONS (inline SVG) ─────────────────────────────────────────────────────
const Icon = ({ d, size = 18, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>{typeof d === "string" ? <path d={d} /> : d}</svg>
);
const SearchIcon = (p) => <Icon {...p} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />;
const ShipIcon = (p) => <Icon {...p} d={<><path d="M2 20a2.4 2.4 0 002 1 2.4 2.4 0 002-1 2.4 2.4 0 012-1 2.4 2.4 0 012 1 2.4 2.4 0 002 1 2.4 2.4 0 002-1 2.4 2.4 0 012-1 2.4 2.4 0 012 1 2.4 2.4 0 002 1 2.4 2.4 0 002-1" /><path d="M4 18l-1-5h18l-1 5" /><path d="M12 2v7" /><path d="M7 9h10" /></>} />;
const ClockIcon = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>} />;
const DollarIcon = (p) => <Icon {...p} d={<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>} />;
const FileIcon = (p) => <Icon {...p} d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></>} />;
const FundingIcon = (p) => <Icon {...p} d={<><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>} />;
const AnchorIcon = (p) => <Icon {...p} d={<><circle cx="12" cy="5" r="3" /><line x1="12" y1="22" x2="12" y2="8" /><path d="M5 12H2a10 10 0 0020 0h-3" /></>} />;
const WifiOffIcon = (p) => <Icon {...p} d={<><line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0119 12.55" /><path d="M5 12.55a10.94 10.94 0 015.17-2.39" /><path d="M10.71 5.05A16 16 0 0122.56 9" /><path d="M1.42 9a15.91 15.91 0 014.7-2.88" /><path d="M8.53 16.11a6 6 0 016.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></>} />;
const XIcon = (p) => <Icon {...p} d={<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>} />;
const CameraIcon = (p) => <Icon {...p} d={<><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></>} />;
const ChevronIcon = (p) => <Icon {...p} d="M9 18l6-6-6-6" />;
const SyncIcon = (p) => <Icon {...p} d={<><path d="M21.5 2v6h-6" /><path d="M2.5 22v-6h6" /><path d="M2.5 11.5a10 10 0 0118.37-4.5" /><path d="M21.5 12.5a10 10 0 01-18.37 4.5" /></>} />;

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function ShipAgencyPlatform() {
  const [view, setView] = useState("dashboard"); // dashboard | detail
  const [selectedPC, setSelectedPC] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [omniOpen, setOmniOpen] = useState(false);
  const [omniQuery, setOmniQuery] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [editMode, setEditMode] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Cmd+K listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOmniOpen(true); }
      if (e.key === "Escape") { setOmniOpen(false); setOmniQuery(""); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const openPortCall = (pc) => { setSelectedPC(pc); setView("detail"); setActiveTab("summary"); setEditMode(false); };
  const goBack = () => { setView("dashboard"); setSelectedPC(null); setEditMode(false); };

  // OmniBar search
  const omniResults = omniQuery.length > 1 ? [
    ...VESSELS.filter(v => `${v.vessel} ${v.id} ${v.cargo} ${v.principal} ${v.port}`.toLowerCase().includes(omniQuery.toLowerCase())).map(v => ({ type: "portcall", item: v })),
    ...DOCUMENTS.filter(d => `${d.name} ${d.type}`.toLowerCase().includes(omniQuery.toLowerCase())).map(d => ({ type: "document", item: d })),
    ...EXPENSES.filter(e => `${e.vendor} ${e.category} ${e.desc}`.toLowerCase().includes(omniQuery.toLowerCase())).map(e => ({ type: "expense", item: e })),
  ] : [];

  const filteredVessels = statusFilter === "all" ? VESSELS : VESSELS.filter(v => v.status === statusFilter);

  const fmtMoney = (n) => n ? `$${n.toLocaleString()}` : "—";
  const fmtDate = (d) => { if (!d) return "—"; const dt = new Date(d.replace(" ", "T")); return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }); };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: "#0F1117", color: "#E5E7EB", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Import font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        input, select, textarea { font-family: inherit; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.4); } 50% { box-shadow: 0 0 0 6px rgba(5, 150, 105, 0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .vessel-row { transition: all 0.15s ease; cursor: pointer; }
        .vessel-row:hover { background: #1A1D27 !important; }
        .tab-btn { transition: all 0.15s ease; cursor: pointer; border: none; background: none; padding: 10px 16px; font-size: 13px; font-weight: 500; color: #9CA3AF; border-bottom: 2px solid transparent; font-family: inherit; }
        .tab-btn:hover { color: #E5E7EB; }
        .tab-btn.active { color: #60A5FA; border-bottom-color: #3B82F6; }
        .btn { border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 6px; transition: all 0.15s ease; display: inline-flex; align-items: center; gap: 6px; }
        .btn-primary { background: #3B82F6; color: white; } .btn-primary:hover { background: #2563EB; }
        .btn-ghost { background: transparent; color: #9CA3AF; border: 1px solid #374151; } .btn-ghost:hover { background: #1F2937; color: #E5E7EB; }
        .btn-success { background: #059669; color: white; } .btn-success:hover { background: #047857; }
        .status-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
        .omni-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 100; display: flex; justify-content: center; padding-top: 120px; animation: fadeIn 0.15s ease; }
        .omni-modal { background: #1A1D27; border: 1px solid #2D3140; border-radius: 12px; width: 580px; max-height: 460px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.5); }
        .scanner-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.15s ease; }
        .expense-row { display: grid; grid-template-columns: 2fr 1.5fr 3fr 1fr 1fr; align-items: center; padding: 10px 16px; border-bottom: 1px solid #1F2328; font-size: 13px; }
        .expense-row:hover { background: #161921; }
        .timeline-item { display: flex; gap: 16px; padding: 8px 0; position: relative; }
        .timeline-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
        .timeline-line { position: absolute; left: 4px; top: 20px; bottom: -8px; width: 2px; background: #2D3140; }
        .filter-chip { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid #2D3140; background: transparent; color: #9CA3AF; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }
        .filter-chip:hover { border-color: #4B5563; color: #E5E7EB; }
        .filter-chip.active { background: #1E293B; border-color: #3B82F6; color: #60A5FA; }
        .doc-card { background: #161921; border: 1px solid #2D3140; border-radius: 8px; padding: 14px; transition: all 0.15s ease; cursor: pointer; }
        .doc-card:hover { border-color: #4B5563; background: #1A1D27; }
        .funding-row { display: grid; grid-template-columns: 3fr 1.5fr 1fr 1fr; align-items: center; padding: 10px 16px; border-bottom: 1px solid #1F2328; font-size: 13px; }
      `}</style>

      {/* ─── TOP BAR ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid #1F2328", background: "#13151C" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AnchorIcon size={22} color="#3B82F6" />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "#F9FAFB" }}>ShipOps</span>
          <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 500, marginLeft: 4 }}>Agency Platform</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Offline indicator */}
          <button className="btn btn-ghost" onClick={() => setIsOffline(!isOffline)} style={{ fontSize: 11, padding: "5px 10px" }}>
            {isOffline ? <><WifiOffIcon size={14} color="#EF4444" /> <span style={{ color: "#EF4444" }}>Offline — 2 pending</span></> : <><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} /> <span>Connected</span></>}
          </button>
          {/* OmniBar trigger */}
          <button className="btn btn-ghost" onClick={() => setOmniOpen(true)} style={{ minWidth: 220, justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><SearchIcon size={14} /> Search everything...</span>
            <kbd style={{ fontSize: 10, background: "#0F1117", padding: "2px 6px", borderRadius: 4, border: "1px solid #374151", color: "#6B7280" }}>⌘K</kbd>
          </button>
          {/* Scanner shortcut */}
          <button className="btn btn-ghost" onClick={() => setScannerOpen(true)} style={{ padding: "5px 10px" }}>
            <CameraIcon size={14} /> <span style={{ fontSize: 12 }}>Scan</span>
          </button>
        </div>
      </div>

      {/* ─── OMNIBAR MODAL ────────────────────────────────────────────── */}
      {omniOpen && (
        <div className="omni-overlay" onClick={() => { setOmniOpen(false); setOmniQuery(""); }}>
          <div className="omni-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #2D3140" }}>
              <SearchIcon size={18} color="#6B7280" />
              <input autoFocus value={omniQuery} onChange={(e) => setOmniQuery(e.target.value)} placeholder="Search vessels, documents, expenses, vendors..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#E5E7EB", fontSize: 15 }} />
              <kbd style={{ fontSize: 10, background: "#0F1117", padding: "2px 6px", borderRadius: 4, border: "1px solid #374151", color: "#6B7280" }}>ESC</kbd>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto", padding: "8px" }}>
              {omniQuery.length < 2 && <div style={{ padding: "24px 16px", textAlign: "center", color: "#6B7280", fontSize: 13 }}>Type to search across all port calls, documents, and expenses</div>}
              {omniQuery.length >= 2 && omniResults.length === 0 && <div style={{ padding: "24px 16px", textAlign: "center", color: "#6B7280", fontSize: 13 }}>No results for "{omniQuery}"</div>}
              {omniResults.map((r, i) => (
                <div key={i} onClick={() => { if (r.type === "portcall") openPortCall(r.item); setOmniOpen(false); setOmniQuery(""); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, cursor: "pointer", transition: "background 0.1s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#252836"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: r.type === "portcall" ? "#1E3A5F" : r.type === "document" ? "#2D1F3D" : "#1F2E1F", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {r.type === "portcall" && <ShipIcon size={14} color="#60A5FA" />}
                    {r.type === "document" && <FileIcon size={14} color="#A78BFA" />}
                    {r.type === "expense" && <DollarIcon size={14} color="#6EE7B7" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#E5E7EB" }}>{r.type === "portcall" ? r.item.vessel : r.type === "document" ? r.item.name : r.item.vendor}</div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{r.type === "portcall" ? `${r.item.port} — ${r.item.cargo}` : r.type === "document" ? r.item.type : `${r.item.category} — ${fmtMoney(r.item.amount)}`}</div>
                  </div>
                  <span style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", fontWeight: 600 }}>{r.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── SCANNER MODAL ────────────────────────────────────────────── */}
      {scannerOpen && (
        <div className="scanner-overlay" onClick={() => setScannerOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1A1D27", border: "1px solid #2D3140", borderRadius: 16, padding: 32, width: 400, textAlign: "center", animation: "slideUp 0.2s ease" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1E293B", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CameraIcon size={28} color="#3B82F6" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#F9FAFB", marginBottom: 8 }}>Document Scanner</div>
            <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 24, lineHeight: 1.5 }}>On iOS, this opens the camera for document capture. Scanned docs are OCR'd and tagged to the active port call.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
              {["NOR", "SOF", "Receipt", "B/L", "Survey", "Customs", "Other"].map(t => (
                <button key={t} className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}>{t}</button>
              ))}
            </div>
            <div style={{ border: "2px dashed #374151", borderRadius: 12, padding: "40px 20px", color: "#4B5563", fontSize: 13, marginBottom: 16 }}>
              Tap to scan or drag & drop file here
            </div>
            <button className="btn btn-ghost" onClick={() => setScannerOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* ─── DASHBOARD VIEW ───────────────────────────────────────────── */}
      {view === "dashboard" && (
        <div style={{ padding: "20px 24px", animation: "fadeIn 0.2s ease" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F9FAFB", letterSpacing: "-0.02em" }}>Active Port Calls</h1>
              <p style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{VESSELS.length} port calls · {VESSELS.filter(v => v.status === "working" || v.status === "berthed").length} vessels in port</p>
            </div>
            <button className="btn btn-primary">+ New Port Call</button>
          </div>

          {/* Status filters */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <button className={`filter-chip ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>All ({VESSELS.length})</button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = VESSELS.filter(v => v.status === key).length;
              return <button key={key} className={`filter-chip ${statusFilter === key ? "active" : ""}`} onClick={() => setStatusFilter(key)} style={statusFilter === key ? { borderColor: cfg.color, color: cfg.color, background: cfg.bg + "22" } : {}}>{cfg.label} ({count})</button>;
            })}
          </div>

          {/* Vessel table */}
          <div style={{ background: "#13151C", border: "1px solid #1F2328", borderRadius: 10, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1.5fr 1.5fr 1fr 1fr 0.5fr", padding: "10px 16px", borderBottom: "1px solid #1F2328", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span>Vessel / Port Call</span><span>Status</span><span>Port / Berth</span><span>Cargo</span><span>Proforma</span><span>Funded</span><span></span>
            </div>
            {/* Vessel rows */}
            {filteredVessels.map((v, i) => {
              const sc = STATUS_CONFIG[v.status];
              return (
                <div key={v.id} className="vessel-row" onClick={() => openPortCall(v)} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1.5fr 1.5fr 1fr 1fr 0.5fr", padding: "14px 16px", borderBottom: "1px solid #1F2328", animation: `fadeIn 0.2s ease ${i * 0.04}s both` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#F9FAFB" }}>{v.vessel}</div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{v.id} · {v.type} · {v.flag} · IMO {v.imo}</div>
                  </div>
                  <div>
                    <span className="status-chip" style={{ background: sc.bg, color: sc.color }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.color, ...(v.status === "working" ? { animation: "pulseGlow 2s infinite" } : {}) }} />
                      {sc.label}
                    </span>
                    {v.pendingSync > 0 && <div style={{ fontSize: 10, color: "#EF4444", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}><SyncIcon size={10} color="#EF4444" style={{ animation: "spin 2s linear infinite" }} /> {v.pendingSync} pending</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#E5E7EB" }}>{v.port}</div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{v.berth}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#E5E7EB" }}>{v.cargo}</div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{v.cargoQty}</div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#E5E7EB" }}>{fmtMoney(v.proforma)}</div>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: v.funded >= v.proforma ? "#10B981" : "#F59E0B" }}>{fmtMoney(v.funded)}</div>
                    {v.proforma > 0 && <div style={{ width: "100%", height: 3, background: "#1F2937", borderRadius: 2, marginTop: 4 }}><div style={{ width: `${Math.min(100, (v.funded / v.proforma) * 100)}%`, height: "100%", background: v.funded >= v.proforma ? "#10B981" : "#F59E0B", borderRadius: 2, transition: "width 0.3s ease" }} /></div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <ChevronIcon size={16} color="#4B5563" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── DETAIL VIEW ──────────────────────────────────────────────── */}
      {view === "detail" && selectedPC && (() => {
        const v = selectedPC;
        const sc = STATUS_CONFIG[v.status];
        const pcExpenses = EXPENSES.filter(e => e.portcall === v.id);
        const pcTimeline = TIMELINE_EVENTS.filter(t => t.portcall === v.id);
        const pcDocs = DOCUMENTS.filter(d => d.portcall === v.id);
        const pcFunding = FUNDING_RECORDS.filter(f => f.portcall === v.id);
        const totalExpenses = pcExpenses.reduce((s, e) => s + e.amount, 0);

        return (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            {/* Detail header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #1F2328", background: "#13151C" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <button className="btn btn-ghost" onClick={goBack} style={{ padding: "4px 8px" }}>← Back</button>
                <span style={{ color: "#4B5563" }}>|</span>
                <span style={{ fontSize: 12, color: "#6B7280" }}>{v.id}</span>
                <span className="status-chip" style={{ background: sc.bg, color: sc.color }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.color }} />{sc.label}
                </span>
                <div style={{ flex: 1 }} />
                {editMode ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-ghost" onClick={() => setEditMode(false)}>Cancel</button>
                    <button className="btn btn-success" onClick={() => setEditMode(false)}>Save Changes</button>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={() => setEditMode(true)}>Edit Port Call</button>
                )}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F9FAFB", letterSpacing: "-0.02em" }}>{v.vessel}</h1>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{v.type} · {v.flag} · IMO {v.imo} · LOA {v.loa} · DWT {v.dwt}</p>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, marginTop: 16 }}>
                {[
                  { key: "summary", label: "Summary", icon: ShipIcon },
                  { key: "timeline", label: "Timeline / SOF", icon: ClockIcon },
                  { key: "disbursement", label: "Disbursement", icon: DollarIcon },
                  { key: "funding", label: "Funding", icon: FundingIcon },
                  { key: "documents", label: `Documents (${pcDocs.length})`, icon: FileIcon },
                ].map(tab => (
                  <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? "active" : ""}`} onClick={() => setActiveTab(tab.key)}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><tab.icon size={14} /> {tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ padding: "20px 24px" }}>
              {/* ── SUMMARY TAB ──────────────────────────────────────── */}
              {activeTab === "summary" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, animation: "fadeIn 0.15s ease" }}>
                  {/* Port Call Info */}
                  <div style={{ background: "#13151C", border: "1px solid #1F2328", borderRadius: 10, padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#F9FAFB", marginBottom: 16 }}>Port Call Details</h3>
                    {[
                      ["Principal", v.principal], ["Agent", v.agent], ["Port", v.port], ["Berth", v.berth],
                      ["Cargo", v.cargo], ["Quantity", v.cargoQty],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1F2328" }}>
                        <span style={{ fontSize: 13, color: "#6B7280" }}>{label}</span>
                        {editMode ? <input defaultValue={val} style={{ background: "#0F1117", border: "1px solid #374151", borderRadius: 4, padding: "2px 8px", color: "#E5E7EB", fontSize: 13, textAlign: "right", width: 200 }} /> : <span style={{ fontSize: 13, color: "#E5E7EB", fontWeight: 500 }}>{val}</span>}
                      </div>
                    ))}
                  </div>
                  {/* Key Times */}
                  <div style={{ background: "#13151C", border: "1px solid #1F2328", borderRadius: 10, padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#F9FAFB", marginBottom: 16 }}>Key Times</h3>
                    {[
                      ["ETA", v.eta], ["NOR Tendered", v.nor], ["All Fast (Berthed)", v.berthed],
                      ["Commenced Cargo", v.commenced], ["Completed Cargo", v.completed], ["Sailed", v.sailed],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1F2328" }}>
                        <span style={{ fontSize: 13, color: "#6B7280" }}>{label}</span>
                        {editMode ? <input defaultValue={val || ""} placeholder="YYYY-MM-DD HHMM" style={{ background: "#0F1117", border: "1px solid #374151", borderRadius: 4, padding: "2px 8px", color: "#E5E7EB", fontSize: 13, textAlign: "right", width: 200, fontFamily: "'JetBrains Mono', monospace" }} /> : <span style={{ fontSize: 13, color: val ? "#E5E7EB" : "#4B5563", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(val)}</span>}
                      </div>
                    ))}
                  </div>
                  {/* Financial Summary */}
                  <div style={{ gridColumn: "1 / -1", background: "#13151C", border: "1px solid #1F2328", borderRadius: 10, padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#F9FAFB", marginBottom: 16 }}>Financial Summary</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                      {[
                        { label: "Proforma DA", value: fmtMoney(v.proforma), color: "#9CA3AF" },
                        { label: "Total Funded", value: fmtMoney(v.funded), color: v.funded >= v.proforma ? "#10B981" : "#F59E0B" },
                        { label: "Actual Expenses", value: fmtMoney(v.actual || totalExpenses), color: "#60A5FA" },
                        { label: "Balance", value: fmtMoney(v.funded - (v.actual || totalExpenses)), color: (v.funded - (v.actual || totalExpenses)) >= 0 ? "#10B981" : "#EF4444" },
                      ].map(item => (
                        <div key={item.label} style={{ background: "#0F1117", borderRadius: 8, padding: 16 }}>
                          <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 6 }}>{item.label}</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TIMELINE TAB ─────────────────────────────────────── */}
              {activeTab === "timeline" && (
                <div style={{ background: "#13151C", border: "1px solid #1F2328", borderRadius: 10, padding: 24, maxWidth: 700, animation: "fadeIn 0.15s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#F9FAFB" }}>Statement of Facts</h3>
                    {editMode && <button className="btn btn-ghost" style={{ fontSize: 12 }}>+ Add Event</button>}
                  </div>
                  {pcTimeline.map((t, i) => (
                    <div key={t.id} className="timeline-item" style={{ animation: `fadeIn 0.15s ease ${i * 0.04}s both` }}>
                      <div style={{ position: "relative" }}>
                        <div className="timeline-dot" style={{ background: t.confirmed ? "#3B82F6" : "#4B5563", border: t.confirmed ? "none" : "2px dashed #6B7280" }} />
                        {i < pcTimeline.length - 1 && <div className="timeline-line" />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: t.confirmed ? "#E5E7EB" : "#6B7280" }}>{t.event}</span>
                          {!t.confirmed && <span style={{ fontSize: 10, color: "#F59E0B", background: "#FEF3C7", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>EST</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(t.time)}</div>
                        <div style={{ fontSize: 11, color: "#4B5563", marginTop: 1 }}>Source: {t.source}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── DISBURSEMENT TAB ─────────────────────────────────── */}
              {activeTab === "disbursement" && (
                <div style={{ background: "#13151C", border: "1px solid #1F2328", borderRadius: 10, overflow: "hidden", animation: "fadeIn 0.15s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #1F2328" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#F9FAFB" }}>Disbursement Account</h3>
                    <div style={{ display: "flex", gap: 6 }}>
                      {editMode && <button className="btn btn-ghost" style={{ fontSize: 12 }}>+ Add Expense</button>}
                      <button className="btn btn-ghost" style={{ fontSize: 12 }}>Export DA</button>
                    </div>
                  </div>
                  <div className="expense-row" style={{ borderBottom: "2px solid #1F2328", fontWeight: 600, fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <span>Vendor</span><span>Category</span><span>Description</span><span>Amount</span><span>Status</span>
                  </div>
                  {pcExpenses.map((e, i) => {
                    const es = EXPENSE_STATUS[e.status];
                    return (
                      <div key={e.id} className="expense-row" style={{ animation: `fadeIn 0.15s ease ${i * 0.03}s both` }}>
                        <span style={{ fontWeight: 500, color: "#E5E7EB" }}>{e.vendor}</span>
                        <span style={{ color: "#9CA3AF" }}>{e.category}</span>
                        <span style={{ color: "#9CA3AF" }}>{e.desc}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#E5E7EB", fontWeight: 500 }}>{e.amount > 0 ? fmtMoney(e.amount) : "TBD"}</span>
                        <span><span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: es.bg, color: es.color, border: `1px solid ${es.color}22` }}>{es.label}</span></span>
                      </div>
                    );
                  })}
                  <div className="expense-row" style={{ fontWeight: 700, background: "#0F1117" }}>
                    <span style={{ color: "#F9FAFB" }}>TOTAL</span><span></span><span></span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#F9FAFB", fontSize: 14 }}>{fmtMoney(totalExpenses)}</span><span></span>
                  </div>
                </div>
              )}

              {/* ── FUNDING TAB ──────────────────────────────────────── */}
              {activeTab === "funding" && (
                <div style={{ background: "#13151C", border: "1px solid #1F2328", borderRadius: 10, overflow: "hidden", animation: "fadeIn 0.15s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #1F2328" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#F9FAFB" }}>Funding Ledger</h3>
                    {editMode && <button className="btn btn-ghost" style={{ fontSize: 12 }}>+ Record Payment</button>}
                  </div>
                  <div className="funding-row" style={{ borderBottom: "2px solid #1F2328", fontWeight: 600, fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <span>Description</span><span>Amount</span><span>Date</span><span>Status</span>
                  </div>
                  {pcFunding.map((f, i) => (
                    <div key={f.id} className="funding-row" style={{ animation: `fadeIn 0.15s ease ${i * 0.03}s both` }}>
                      <span style={{ fontWeight: 500, color: "#E5E7EB" }}>{f.from}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#E5E7EB", fontWeight: 500 }}>{fmtMoney(f.amount)}</span>
                      <span style={{ color: "#9CA3AF" }}>{f.date}</span>
                      <span><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: f.status === "received" ? "#D1FAE522" : "#FEF3C722", color: f.status === "received" ? "#10B981" : "#D97706", border: `1px solid ${f.status === "received" ? "#10B98133" : "#D9770633"}` }}>{f.status === "received" ? "Received" : "Requested"}</span></span>
                    </div>
                  ))}
                  <div className="funding-row" style={{ fontWeight: 700, background: "#0F1117" }}>
                    <span style={{ color: "#F9FAFB" }}>TOTAL FUNDED</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#10B981", fontSize: 14 }}>{fmtMoney(pcFunding.filter(f => f.status === "received").reduce((s, f) => s + f.amount, 0))}</span>
                    <span></span><span></span>
                  </div>
                </div>
              )}

              {/* ── DOCUMENTS TAB ────────────────────────────────────── */}
              {activeTab === "documents" && (
                <div style={{ animation: "fadeIn 0.15s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#F9FAFB" }}>Documents</h3>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost" onClick={() => setScannerOpen(true)} style={{ fontSize: 12 }}><CameraIcon size={14} /> Scan Document</button>
                      <button className="btn btn-ghost" style={{ fontSize: 12 }}>Upload File</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    {pcDocs.map((d, i) => (
                      <div key={d.id} className="doc-card" style={{ animation: `fadeIn 0.15s ease ${i * 0.04}s both` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: d.source === "scan" ? "#1E3A5F" : d.source === "generated" ? "#1F2E1F" : "#2D1F3D", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {d.source === "scan" ? <CameraIcon size={16} color="#60A5FA" /> : <FileIcon size={16} color={d.source === "generated" ? "#6EE7B7" : "#A78BFA"} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#E5E7EB" }}>{d.name}</div>
                            <div style={{ fontSize: 11, color: "#6B7280" }}>{d.type} · {d.uploaded}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#1F2937", color: "#9CA3AF" }}>{d.source}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
