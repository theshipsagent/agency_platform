// ─── Port Call Phases ────────────────────────────────────────────────────────
// String-valued so values match keys, matching the Postgres "PortCallPhase"
// enum on the wire. The numeric ordinal (Phase 1 through Phase 9) is preserved
// separately via PHASE_ORDER (workflow sequence) and PHASE_ORDINAL (lookup).
export const PortCallPhase = {
  PROFORMA_ESTIMATED: 'PROFORMA_ESTIMATED',
  AWAITING_APPOINTMENT: 'AWAITING_APPOINTMENT',
  APPOINTED: 'APPOINTED',
  ACTIVE: 'ACTIVE',
  SAILED: 'SAILED',
  COMPLETED: 'COMPLETED',
  PROCESSING_FDA: 'PROCESSING_FDA',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  SETTLED: 'SETTLED',
} as const
export type PortCallPhase = (typeof PortCallPhase)[keyof typeof PortCallPhase]

/**
 * Phases in workflow order. Use for iterating UI lists (e.g. phase filter
 * chips in workflow sequence). Index in this array IS the 1-based ordinal
 * minus one (PHASE_ORDER[0] is Phase 1).
 */
export const PHASE_ORDER: PortCallPhase[] = [
  'PROFORMA_ESTIMATED',
  'AWAITING_APPOINTMENT',
  'APPOINTED',
  'ACTIVE',
  'SAILED',
  'COMPLETED',
  'PROCESSING_FDA',
  'AWAITING_PAYMENT',
  'SETTLED',
]

/**
 * 1-based ordinal position per phase. Use for SQL-side sort orderings, or any
 * comparison like "is this phase past the audit gate." Derived from PHASE_ORDER
 * so re-orderings stay in sync.
 */
export const PHASE_ORDINAL: Record<PortCallPhase, number> = Object.fromEntries(
  PHASE_ORDER.map((phase, i) => [phase, i + 1]),
) as Record<PortCallPhase, number>

export const PHASE_LABELS: Record<PortCallPhase, string> = {
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

// ─── Active Port Call Sub-Statuses ───────────────────────────────────────────
export const ActiveSubStatus = {
  AT_ANCHOR: 'AT_ANCHOR',
  BERTHED: 'BERTHED',
  WORKING_CARGO: 'WORKING_CARGO',
  CARGO_COMPLETE: 'CARGO_COMPLETE',
} as const
export type ActiveSubStatus = (typeof ActiveSubStatus)[keyof typeof ActiveSubStatus]

// ─── Settled Sub-Statuses ─────────────────────────────────────────────────────
export const SettledSubStatus = {
  FULLY_SETTLED: 'FULLY_SETTLED',
  PENDING_DEMURRAGE: 'PENDING_DEMURRAGE',
} as const
export type SettledSubStatus = (typeof SettledSubStatus)[keyof typeof SettledSubStatus]

// ─── Port Call Types ──────────────────────────────────────────────────────────
export const PortCallType = {
  DISCHARGE: 'DISCHARGE',
  LOAD: 'LOAD',
  LOAD_DISCHARGE: 'LOAD_DISCHARGE',
  TRANSSHIPMENT: 'TRANSSHIPMENT',
  BUNKERING_ONLY: 'BUNKERING_ONLY',
  CREW_CHANGE_ONLY: 'CREW_CHANGE_ONLY',
  REPAIRS_DRYDOCK: 'REPAIRS_DRYDOCK',
  LAY_UP: 'LAY_UP',
  TRANSIT: 'TRANSIT',
  SURVEY_INSPECTION: 'SURVEY_INSPECTION',
} as const
export type PortCallType = (typeof PortCallType)[keyof typeof PortCallType]

// ─── Cargo Types ──────────────────────────────────────────────────────────────
export const CargoType = {
  DRY_BULK: 'DRY_BULK',
  BREAK_BULK: 'BREAK_BULK',
  LIQUID_BULK: 'LIQUID_BULK',
  CONTAINERIZED: 'CONTAINERIZED',
  RORO_VEHICLES: 'RORO_VEHICLES',
  PROJECT_CARGO: 'PROJECT_CARGO',
  TANKER_CLEAN: 'TANKER_CLEAN',
  TANKER_DIRTY: 'TANKER_DIRTY',
  CHEMICAL_TANKER: 'CHEMICAL_TANKER',
  GAS_CARRIER: 'GAS_CARRIER',
} as const
export type CargoType = (typeof CargoType)[keyof typeof CargoType]

// ─── Expense Status ───────────────────────────────────────────────────────────
export const ExpenseStatus = {
  ESTIMATED: 'ESTIMATED',
  ACCRUED: 'ACCRUED',
  INVOICE_RECEIVED: 'INVOICE_RECEIVED',
  VERIFIED: 'VERIFIED',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
} as const
export type ExpenseStatus = (typeof ExpenseStatus)[keyof typeof ExpenseStatus]

export const EXPENSE_STATUS_ORDER: ExpenseStatus[] = [
  'ESTIMATED', 'ACCRUED', 'INVOICE_RECEIVED', 'VERIFIED', 'APPROVED', 'PAID',
]

// ─── Expense Categories ───────────────────────────────────────────────────────
export const ExpenseCategory = {
  PILOTAGE: 'PILOTAGE',
  TOWAGE: 'TOWAGE',
  DOCKAGE_WHARFAGE: 'DOCKAGE_WHARFAGE',
  STEVEDORING: 'STEVEDORING',
  LAUNCH_WATER_TAXI: 'LAUNCH_WATER_TAXI',
  PROVISIONS_STORES: 'PROVISIONS_STORES',
  SURVEYORS: 'SURVEYORS',
  CUSTOMS_CBP: 'CUSTOMS_CBP',
  IMMIGRATION: 'IMMIGRATION',
  FUMIGATION: 'FUMIGATION',
  WASTE_REMOVAL: 'WASTE_REMOVAL',
  LINE_HANDLERS: 'LINE_HANDLERS',
  WATCHMEN: 'WATCHMEN',
  CREW_CHANGE: 'CREW_CHANGE',
  MEDICAL: 'MEDICAL',
  CASH_TO_MASTER: 'CASH_TO_MASTER',
  BUNKERS: 'BUNKERS',
  FREIGHT_TAX: 'FREIGHT_TAX',
  TONNAGE_TAX: 'TONNAGE_TAX',
  AGENCY_FEE: 'AGENCY_FEE',
  COMMUNICATION: 'COMMUNICATION',
  TRANSPORTATION: 'TRANSPORTATION',
  MISCELLANEOUS: 'MISCELLANEOUS',
} as const
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory]

// ─── Funding Status ───────────────────────────────────────────────────────────
export const FundingStatus = {
  REQUESTED: 'REQUESTED',
  RECEIVED: 'RECEIVED',
} as const
export type FundingStatus = (typeof FundingStatus)[keyof typeof FundingStatus]

// ─── Task Status ──────────────────────────────────────────────────────────────
export const TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
} as const
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

// ─── Document Types ───────────────────────────────────────────────────────────
export const DocumentType = {
  NOR: 'NOR',
  SOF: 'SOF',
  BILL_OF_LADING: 'BILL_OF_LADING',
  MANIFEST: 'MANIFEST',
  INVOICE: 'INVOICE',
  RECEIPT: 'RECEIPT',
  SURVEY_REPORT: 'SURVEY_REPORT',
  CUSTOMS_ENTRY: 'CUSTOMS_ENTRY',
  CREW_LIST: 'CREW_LIST',
  STORES_LIST: 'STORES_LIST',
  STOWAGE_PLAN: 'STOWAGE_PLAN',
  MATES_RECEIPT: 'MATES_RECEIPT',
  TALLY_SHEET: 'TALLY_SHEET',
  OUTTURN_REPORT: 'OUTTURN_REPORT',
  CHARTER_PARTY: 'CHARTER_PARTY',
  AGENCY_AGREEMENT: 'AGENCY_AGREEMENT',
  CORRESPONDENCE: 'CORRESPONDENCE',
  OTHER: 'OTHER',
} as const
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType]

// ─── Document Source ──────────────────────────────────────────────────────────
export const DocumentSource = {
  SCANNED_MOBILE: 'SCANNED_MOBILE',
  EMAIL_ATTACHMENT: 'EMAIL_ATTACHMENT',
  MANUAL_UPLOAD: 'MANUAL_UPLOAD',
  SYSTEM_GENERATED: 'SYSTEM_GENERATED',
} as const
export type DocumentSource = (typeof DocumentSource)[keyof typeof DocumentSource]

// ─── Communication (Inbox Triage) ──────────────────────────────────────────────
export const CommunicationStatus = {
  UNREAD: 'UNREAD',     // ingested, not yet classified or actioned
  TRIAGED: 'TRIAGED',   // classified by AI, awaiting operator decision
  LINKED: 'LINKED',     // attached to a port call
  ARCHIVED: 'ARCHIVED', // dismissed / irrelevant
} as const
export type CommunicationStatus = (typeof CommunicationStatus)[keyof typeof CommunicationStatus]

// ─── User Roles ───────────────────────────────────────────────────────────────
export const UserRole = {
  OPERATOR: 'OPERATOR',
  ACCOUNTING: 'ACCOUNTING',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

// ─── Organization Types ───────────────────────────────────────────────────────
export const OrgType = {
  PRINCIPAL_CHARTERER: 'PRINCIPAL_CHARTERER',
  PRINCIPAL_OWNER: 'PRINCIPAL_OWNER',
  PRINCIPAL_CARGO_INTEREST: 'PRINCIPAL_CARGO_INTEREST',
  VENDOR: 'VENDOR',
  SURVEYOR: 'SURVEYOR',
  TERMINAL_OPERATOR: 'TERMINAL_OPERATOR',
  GOVERNMENT_AGENCY: 'GOVERNMENT_AGENCY',
  BROKER: 'BROKER',
  CORRESPONDENT_AGENT: 'CORRESPONDENT_AGENT',
} as const
export type OrgType = (typeof OrgType)[keyof typeof OrgType]

// ─── Service Scope ────────────────────────────────────────────────────────────
export const ServiceScope = {
  FULL_AGENCY: 'FULL_AGENCY',
  HUSBANDRY_ONLY: 'HUSBANDRY_ONLY',
  PROTECTING_AGENCY: 'PROTECTING_AGENCY',
  CUSTOMS_CLEARANCE: 'CUSTOMS_CLEARANCE',
  CREW_CHANGE: 'CREW_CHANGE',
  STORES_PROVISIONS: 'STORES_PROVISIONS',
  MEDICAL: 'MEDICAL',
  CASH_TO_MASTER: 'CASH_TO_MASTER',
  BUNKER_COORDINATION: 'BUNKER_COORDINATION',
  SURVEYOR_COORDINATION: 'SURVEYOR_COORDINATION',
  STEVEDORING_COORDINATION: 'STEVEDORING_COORDINATION',
  LAUNCH_WATER_TAXI: 'LAUNCH_WATER_TAXI',
  WASTE_REMOVAL: 'WASTE_REMOVAL',
  IMMIGRATION_SHORE_LEAVE: 'IMMIGRATION_SHORE_LEAVE',
} as const
export type ServiceScope = (typeof ServiceScope)[keyof typeof ServiceScope]

// ─── Timeline Event Types ─────────────────────────────────────────────────────
export const TimelineEventType = {
  ETA_RECEIVED: 'ETA_RECEIVED',
  ARRIVED_PILOT_STATION: 'ARRIVED_PILOT_STATION',
  NOR_TENDERED: 'NOR_TENDERED',
  NOR_ACCEPTED: 'NOR_ACCEPTED',
  FREE_PRATIQUE: 'FREE_PRATIQUE',
  ALL_FAST: 'ALL_FAST',
  COMMENCED_CARGO: 'COMMENCED_CARGO',
  RAIN_DELAY_START: 'RAIN_DELAY_START',
  RAIN_DELAY_END: 'RAIN_DELAY_END',
  COMPLETED_CARGO: 'COMPLETED_CARGO',
  SAILED: 'SAILED',
  CUSTOM: 'CUSTOM',
} as const
export type TimelineEventType = (typeof TimelineEventType)[keyof typeof TimelineEventType]
