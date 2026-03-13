import { PortCallPhase, PortCallType, ExpenseCategory, ServiceScope, UserRole } from '../enums'

// ─── Phase Transition Map ─────────────────────────────────────────────────────
// Key = current phase, Value = allowed next phases
export const VALID_PHASE_TRANSITIONS: Record<PortCallPhase, PortCallPhase[]> = {
  1: [2, 3],  // Can go to Awaiting Appointment or directly to Appointed
  2: [3],
  3: [4],
  4: [5],
  5: [6],
  6: [7],
  7: [8, 7], // Can loop back to 7 (FDA dispute/resubmit)
  8: [9],
  9: [],     // Terminal state
}

// Phases that require manager role to transition backward
export const BACKWARD_TRANSITION_REQUIRES_MANAGER = true

// ─── Phase Prerequisites ──────────────────────────────────────────────────────
export const PHASE_PREREQUISITES: Record<PortCallPhase, string> = {
  1: 'Port call created',
  2: 'Proforma DA must exist',
  3: 'Appointment confirmation recorded',
  4: 'Vessel arrival event logged in timeline',
  5: 'Sailed event logged in timeline',
  6: 'All expense lines have status ≥ Invoice Received',
  7: 'FDA document generated, management approval recorded',
  8: 'Principal approval recorded on FDA',
  9: 'Balance = zero (all AR collected, all AP paid)',
}

// ─── Auto-Generated Tasks per Port Call Type ──────────────────────────────────
export const DEFAULT_TASKS_BY_TYPE: Record<PortCallType, string[]> = {
  DISCHARGE: [
    'Order inbound pilotage',
    'Order inbound towage',
    'Coordinate berth with terminal',
    'File CBP advance notice of arrival',
    'Request crew list from vessel',
    'Send NOR to principal on tender',
    'Coordinate draft survey',
    'Monitor cargo discharge progress',
    'Collect final SOF from terminal',
    'Chase outstanding vendor invoices',
    'Compile FDA',
  ],
  LOAD: [
    'Order inbound pilotage',
    'Order inbound towage',
    'Coordinate berth and load schedule with terminal',
    'File CBP advance notice of arrival',
    'Coordinate cargo surveyors',
    'Send NOR to principal on tender',
    'Monitor cargo load progress',
    'Collect final B/L from terminal',
    'Collect final SOF from terminal',
    'Chase outstanding vendor invoices',
    'Compile FDA',
  ],
  LOAD_DISCHARGE: [
    'Order inbound pilotage',
    'Order inbound towage',
    'Coordinate berth with terminal',
    'File CBP advance notice of arrival',
    'Request crew list',
    'Send NOR to principal on tender',
    'Coordinate draft surveys (pre/post)',
    'Monitor cargo operations',
    'Collect final SOF',
    'Chase outstanding vendor invoices',
    'Compile FDA',
  ],
  TRANSSHIPMENT: [
    'Order inbound pilotage',
    'Order towage',
    'Coordinate lightering/transship operations',
    'File customs entries',
    'Collect SOF',
    'Compile FDA',
  ],
  BUNKERING_ONLY: [
    'Coordinate bunker barge',
    'Order inbound pilotage',
    'Witness bunker survey',
    'Collect bunker delivery receipt',
    'Compile FDA',
  ],
  CREW_CHANGE_ONLY: [
    'Arrange immigration clearance',
    'Coordinate crew transportation',
    'Arrange hotel if needed',
    'Process crew change documentation',
    'Compile FDA',
  ],
  REPAIRS_DRYDOCK: [
    'Coordinate drydock/repair facility',
    'Arrange class surveyor',
    'Monitor repair progress',
    'Obtain certificate of completion',
    'Compile FDA',
  ],
  LAY_UP: [
    'Arrange lay-up berth',
    'Coordinate watchmen',
    'Arrange periodic inspections',
    'Compile monthly FDA',
  ],
  TRANSIT: [
    'Order pilotage',
    'Order towage if required',
    'File transit documents',
    'Compile FDA',
  ],
  SURVEY_INSPECTION: [
    'Coordinate surveyor access',
    'Arrange on-signers/off-signers if required',
    'Obtain survey report',
    'Compile FDA',
  ],
}

// ─── Default Expense Categories per Port Call Type ────────────────────────────
export const DEFAULT_EXPENSE_CATEGORIES_BY_TYPE: Record<PortCallType, ExpenseCategory[]> = {
  DISCHARGE: [
    'PILOTAGE', 'TOWAGE', 'DOCKAGE_WHARFAGE', 'LINE_HANDLERS',
    'CUSTOMS_CBP', 'SURVEYORS', 'LAUNCH_WATER_TAXI', 'AGENCY_FEE',
  ],
  LOAD: [
    'PILOTAGE', 'TOWAGE', 'DOCKAGE_WHARFAGE', 'LINE_HANDLERS',
    'CUSTOMS_CBP', 'SURVEYORS', 'LAUNCH_WATER_TAXI', 'AGENCY_FEE',
  ],
  LOAD_DISCHARGE: [
    'PILOTAGE', 'TOWAGE', 'DOCKAGE_WHARFAGE', 'LINE_HANDLERS',
    'CUSTOMS_CBP', 'SURVEYORS', 'LAUNCH_WATER_TAXI', 'AGENCY_FEE',
  ],
  TRANSSHIPMENT: [
    'PILOTAGE', 'TOWAGE', 'DOCKAGE_WHARFAGE', 'CUSTOMS_CBP', 'AGENCY_FEE',
  ],
  BUNKERING_ONLY: ['PILOTAGE', 'TOWAGE', 'BUNKERS', 'SURVEYORS', 'AGENCY_FEE'],
  CREW_CHANGE_ONLY: ['IMMIGRATION', 'CREW_CHANGE', 'TRANSPORTATION', 'LAUNCH_WATER_TAXI', 'AGENCY_FEE'],
  REPAIRS_DRYDOCK: ['PILOTAGE', 'TOWAGE', 'DOCKAGE_WHARFAGE', 'SURVEYORS', 'AGENCY_FEE'],
  LAY_UP: ['DOCKAGE_WHARFAGE', 'WATCHMEN', 'AGENCY_FEE'],
  TRANSIT: ['PILOTAGE', 'TOWAGE', 'AGENCY_FEE'],
  SURVEY_INSPECTION: ['SURVEYORS', 'LAUNCH_WATER_TAXI', 'AGENCY_FEE'],
}

// ─── Role Permissions ─────────────────────────────────────────────────────────
export const ROLE_CAN_APPROVE_FDA: UserRole[] = ['MANAGER', 'ADMIN']
export const ROLE_CAN_OVERRIDE_LOCKED: UserRole[] = ['MANAGER', 'ADMIN']
export const ROLE_CAN_MANAGE_USERS: UserRole[] = ['ADMIN']
export const ROLE_CAN_VIEW_ANALYTICS: UserRole[] = ['MANAGER', 'ADMIN']
export const ROLE_CAN_BACKWARD_TRANSITION: UserRole[] = ['MANAGER', 'ADMIN']

// ─── Business Rules ───────────────────────────────────────────────────────────
export const SHORT_FUNDING_ALERT_BUFFER_DAYS = 2  // alert if short-funded within 48h of ETA
export const FDA_REMINDER_INTERVAL_DAYS = 3        // remind principal every 3 days
export const PAYMENT_REMINDER_INTERVALS = [30, 60, 90] // days for AR aging alerts
export const MAGIC_LINK_DEFAULT_EXPIRY_HOURS = 72
export const DOCUMENT_RETENTION_YEARS = 7
export const PORT_CALL_ID_PREFIX = 'PC'

// ─── Service Scope Labels ─────────────────────────────────────────────────────
export const SERVICE_SCOPE_LABELS: Record<ServiceScope, string> = {
  FULL_AGENCY: 'Full Agency',
  HUSBANDRY_ONLY: 'Husbandry Only',
  PROTECTING_AGENCY: 'Protecting Agency',
  CUSTOMS_CLEARANCE: 'Customs Clearance',
  CREW_CHANGE: 'Crew Change',
  STORES_PROVISIONS: 'Stores & Provisions',
  MEDICAL: 'Medical',
  CASH_TO_MASTER: 'Cash to Master',
  BUNKER_COORDINATION: 'Bunker Coordination',
  SURVEYOR_COORDINATION: 'Surveyor Coordination',
  STEVEDORING_COORDINATION: 'Stevedoring Coordination',
  LAUNCH_WATER_TAXI: 'Launch / Water Taxi',
  WASTE_REMOVAL: 'Waste Removal',
  IMMIGRATION_SHORE_LEAVE: 'Immigration / Shore Leave',
}

// ─── Expense Category Labels ──────────────────────────────────────────────────
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  PILOTAGE: 'Pilotage',
  TOWAGE: 'Towage',
  DOCKAGE_WHARFAGE: 'Dockage / Wharfage',
  STEVEDORING: 'Stevedoring',
  LAUNCH_WATER_TAXI: 'Launch / Water Taxi',
  PROVISIONS_STORES: 'Provisions & Stores',
  SURVEYORS: 'Surveyors',
  CUSTOMS_CBP: 'Customs / CBP',
  IMMIGRATION: 'Immigration',
  FUMIGATION: 'Fumigation',
  WASTE_REMOVAL: 'Waste Removal',
  LINE_HANDLERS: 'Line Handlers',
  WATCHMEN: 'Watchmen',
  CREW_CHANGE: 'Crew Change',
  MEDICAL: 'Medical',
  CASH_TO_MASTER: 'Cash to Master',
  BUNKERS: 'Bunkers',
  FREIGHT_TAX: 'Freight Tax',
  TONNAGE_TAX: 'Tonnage Tax',
  AGENCY_FEE: 'Agency Fee',
  COMMUNICATION: 'Communication',
  TRANSPORTATION: 'Transportation',
  MISCELLANEOUS: 'Miscellaneous',
}
