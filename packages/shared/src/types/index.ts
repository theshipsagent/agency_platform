import type {
  PortCallPhase,
  PortCallType,
  CargoType,
  ActiveSubStatus,
  SettledSubStatus,
  ExpenseStatus,
  ExpenseCategory,
  FundingStatus,
  TaskStatus,
  DocumentType,
  DocumentSource,
  UserRole,
  OrgType,
  ServiceScope,
  TimelineEventType,
} from '../enums'

// ─── Base ─────────────────────────────────────────────────────────────────────
export interface BaseEntity {
  id: string
  tenantId: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  deletedAt: Date | null
}

// ─── Tenant (Agency) ──────────────────────────────────────────────────────────
export interface Tenant {
  id: string
  name: string
  slug: string
  clerkOrgId: string
  logoUrl: string | null
  primaryColor: string | null
  subscriptionTier: 'starter' | 'professional' | 'enterprise'
  createdAt: Date
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User extends BaseEntity {
  clerkUserId: string
  email: string
  name: string
  role: UserRole
  officeId: string | null
  approvalTierLimit: number // cents — max expense they can approve
}

// ─── Port ─────────────────────────────────────────────────────────────────────
export interface Port {
  id: string
  name: string
  unLocode: string // e.g. "USNOL"
  country: string
  region: string | null
  timeZone: string
}

export interface Terminal {
  id: string
  portId: string
  name: string
  type: string
  maxDraft: number | null // meters
}

// ─── Vessel ───────────────────────────────────────────────────────────────────
export interface Vessel extends BaseEntity {
  imoNumber: string
  mmsi: string | null
  callSign: string | null
  name: string
  flagState: string
  vesselType: string
  loa: number | null        // meters
  beam: number | null       // meters
  summerDraft: number | null // meters
  grossTonnage: number | null
  netTonnage: number | null
  dwt: number | null
  builtYear: number | null
  builder: string | null
  ownerId: string | null
  managerId: string | null
  piClub: string | null
  classSociety: string | null
}

// ─── Organization ─────────────────────────────────────────────────────────────
export interface Organization extends BaseEntity {
  name: string
  type: OrgType
  taxId: string | null
  address: string | null
  country: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  bankingDetails: string | null // encrypted
  paymentTermsDays: number
  creditScore: number | null   // 0-100, auto-calculated
}

// ─── Port Call ────────────────────────────────────────────────────────────────
export interface PortCall extends BaseEntity {
  portCallNumber: string       // PC-2024-0001
  phase: PortCallPhase
  activeSubStatus: ActiveSubStatus | null
  settledSubStatus: SettledSubStatus | null
  portCallType: PortCallType
  serviceScope: ServiceScope[]
  vesselId: string
  principalId: string
  portId: string
  terminalId: string | null
  eta: Date | null
  etd: Date | null
  arrivedAt: Date | null
  sailedAt: Date | null
  notes: string | null
  isLocked: boolean
}

// ─── Cargo Line ───────────────────────────────────────────────────────────────
export interface CargoLine extends BaseEntity {
  portCallId: string
  commodity: string
  cargoType: CargoType
  quantity: number
  unit: string
  actualQuantity: number | null
  shipperId: string | null
  receiverId: string | null
  billOfLadingNumber: string | null
  hazmatClass: string | null
}

// ─── Timeline Event (Statement of Facts) ─────────────────────────────────────
export interface TimelineEvent extends BaseEntity {
  portCallId: string
  eventType: TimelineEventType
  customLabel: string | null
  occurredAt: Date
  source: string
  isConfirmed: boolean
  notes: string | null
}

// ─── Expense (DA Line Item) ───────────────────────────────────────────────────
export interface Expense extends BaseEntity {
  portCallId: string
  vendorId: string | null
  category: ExpenseCategory
  description: string
  proformaAmount: number   // cents
  actualAmount: number | null  // cents
  invoiceAmount: number | null // cents
  status: ExpenseStatus
  approvedBy: string | null
  approvedAt: Date | null
  approvalTier: number | null
  invoiceRef: string | null
}

// ─── Funding Record ───────────────────────────────────────────────────────────
export interface FundingRecord extends BaseEntity {
  portCallId: string
  principalId: string
  amount: number    // cents
  status: FundingStatus
  requestedAt: Date
  receivedAt: Date | null
  wireReference: string | null
  notes: string | null
}

// ─── Document ─────────────────────────────────────────────────────────────────
export interface Document extends BaseEntity {
  portCallId: string
  documentType: DocumentType
  source: DocumentSource
  fileName: string
  storageKey: string
  mimeType: string
  sizeBytes: number
  ocrText: string | null
  version: number
  previousVersionId: string | null
}

// ─── Task ─────────────────────────────────────────────────────────────────────
export interface Task extends BaseEntity {
  portCallId: string
  templateId: string | null
  description: string
  assigneeId: string | null
  dueAt: Date | null
  status: TaskStatus
  dependsOnTaskId: string | null
  completedAt: Date | null
}

// ─── Magic Link Token ─────────────────────────────────────────────────────────
export interface MagicLinkToken {
  id: string
  token: string
  resourceType: 'document' | 'expense' | 'portcall'
  resourceId: string
  allowedActions: string[]   // ['view', 'approve', 'reject', 'comment']
  requestedEmail: string
  verifiedAt: Date | null
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string
  tenantId: string
  userId: string
  action: string       // 'CREATE' | 'UPDATE' | 'DELETE' | 'PHASE_TRANSITION'
  resourceType: string
  resourceId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  createdAt: Date
}

// ─── Computed / View Types ────────────────────────────────────────────────────
export interface PortCallSummary {
  portCall: PortCall
  vessel: Pick<Vessel, 'id' | 'name' | 'imoNumber' | 'vesselType' | 'flagState'>
  principal: Pick<Organization, 'id' | 'name'>
  port: Pick<Port, 'id' | 'name' | 'unLocode'>
  terminal: Pick<Terminal, 'id' | 'name'> | null
  proformaTotal: number     // cents
  actualTotal: number | null // cents
  fundedAmount: number      // cents
  balance: number           // cents (funded - actual)
  openTaskCount: number
  pendingExpenseCount: number
}

export interface DisbursementAccount {
  portCallId: string
  expenses: Expense[]
  proformaTotal: number
  actualTotal: number
  agencyFee: number
  grandTotal: number
  fundedAmount: number
  balance: number
  isShortFunded: boolean
}
