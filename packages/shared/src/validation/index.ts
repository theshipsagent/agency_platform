import { z } from 'zod'
import {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const centsAmount = z.number().int().nonnegative()
const uuid = z.string().uuid()

// ─── Port Call ────────────────────────────────────────────────────────────────
export const CreatePortCallSchema = z.object({
  portCallType: z.nativeEnum(PortCallType),
  serviceScope: z.array(z.nativeEnum(ServiceScope)).min(1),
  vesselId: uuid,
  principalId: uuid,
  portId: uuid,
  terminalId: uuid.optional(),
  eta: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
})
export type CreatePortCallInput = z.infer<typeof CreatePortCallSchema>

export const UpdatePortCallSchema = CreatePortCallSchema.partial().extend({
  etd: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
})
export type UpdatePortCallInput = z.infer<typeof UpdatePortCallSchema>

export const PhaseTransitionSchema = z.object({
  portCallId: uuid,
  targetPhase: z.nativeEnum(PortCallPhase),
  subStatus: z.union([
    z.nativeEnum(ActiveSubStatus),
    z.nativeEnum(SettledSubStatus),
  ]).optional(),
  notes: z.string().max(1000).optional(),
})
export type PhaseTransitionInput = z.infer<typeof PhaseTransitionSchema>

// ─── Vessel ───────────────────────────────────────────────────────────────────
export const CreateVesselSchema = z.object({
  imoNumber: z.string().regex(/^\d{7}$/, 'IMO must be 7 digits'),
  mmsi: z.string().regex(/^\d{9}$/).optional(),
  callSign: z.string().max(10).optional(),
  name: z.string().min(1).max(100),
  flagState: z.string().length(2), // ISO 3166-1 alpha-2
  vesselType: z.string().min(1).max(50),
  loa: z.number().positive().optional(),
  beam: z.number().positive().optional(),
  summerDraft: z.number().positive().optional(),
  grossTonnage: z.number().int().positive().optional(),
  netTonnage: z.number().int().positive().optional(),
  dwt: z.number().int().positive().optional(),
  builtYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  builder: z.string().max(100).optional(),
  ownerId: uuid.optional(),
  managerId: uuid.optional(),
  piClub: z.string().max(100).optional(),
  classSociety: z.string().max(100).optional(),
})
export type CreateVesselInput = z.infer<typeof CreateVesselSchema>

// ─── Organization ─────────────────────────────────────────────────────────────
export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.nativeEnum(OrgType),
  taxId: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  country: z.string().length(2).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(30).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
})
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>

// ─── Cargo Line ───────────────────────────────────────────────────────────────
export const CreateCargoLineSchema = z.object({
  portCallId: uuid,
  commodity: z.string().min(1).max(100),
  cargoType: z.nativeEnum(CargoType),
  quantity: z.number().positive(),
  unit: z.string().max(20),
  shipperId: uuid.optional(),
  receiverId: uuid.optional(),
  billOfLadingNumber: z.string().max(50).optional(),
  hazmatClass: z.string().max(20).optional(),
})
export type CreateCargoLineInput = z.infer<typeof CreateCargoLineSchema>

// ─── Timeline Event ───────────────────────────────────────────────────────────
export const CreateTimelineEventSchema = z.object({
  portCallId: uuid,
  eventType: z.nativeEnum(TimelineEventType),
  customLabel: z.string().max(100).optional(),
  occurredAt: z.coerce.date(),
  source: z.string().max(100).default('manual'),
  isConfirmed: z.boolean().default(true),
  notes: z.string().max(500).optional(),
})
export type CreateTimelineEventInput = z.infer<typeof CreateTimelineEventSchema>

// ─── Expense ──────────────────────────────────────────────────────────────────
export const CreateExpenseSchema = z.object({
  portCallId: uuid,
  vendorId: uuid.optional(),
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().min(1).max(200),
  proformaAmount: centsAmount,
})
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>

export const UpdateExpenseSchema = z.object({
  actualAmount: centsAmount.optional(),
  invoiceAmount: centsAmount.optional(),
  status: z.nativeEnum(ExpenseStatus).optional(),
  invoiceRef: z.string().max(100).optional(),
  description: z.string().max(200).optional(),
})
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>

// ─── Funding ──────────────────────────────────────────────────────────────────
export const CreateFundingSchema = z.object({
  portCallId: uuid,
  principalId: uuid,
  amount: centsAmount,
  status: z.nativeEnum(FundingStatus).default('REQUESTED'),
  wireReference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})
export type CreateFundingInput = z.infer<typeof CreateFundingSchema>

// ─── Task ─────────────────────────────────────────────────────────────────────
export const CreateTaskSchema = z.object({
  portCallId: uuid,
  description: z.string().min(1).max(200),
  assigneeId: uuid.optional(),
  dueAt: z.coerce.date().optional(),
  dependsOnTaskId: uuid.optional(),
})
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>

export const UpdateTaskSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: uuid.optional(),
  dueAt: z.coerce.date().optional(),
  description: z.string().max(200).optional(),
})
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>

// ─── Document Upload ──────────────────────────────────────────────────────────
export const CreateDocumentSchema = z.object({
  portCallId: uuid,
  documentType: z.nativeEnum(DocumentType),
  source: z.nativeEnum(DocumentSource),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(100),
  sizeBytes: z.number().int().positive(),
})
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>

// ─── Magic Link ───────────────────────────────────────────────────────────────
export const CreateMagicLinkSchema = z.object({
  resourceType: z.enum(['document', 'expense', 'portcall']),
  resourceId: uuid,
  allowedActions: z.array(z.enum(['view', 'approve', 'reject', 'comment'])).min(1),
  recipientEmail: z.string().email(),
  expiresInHours: z.number().int().min(1).max(168).default(72),
})
export type CreateMagicLinkInput = z.infer<typeof CreateMagicLinkSchema>

// ─── Pagination ───────────────────────────────────────────────────────────────
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
export type PaginationInput = z.infer<typeof PaginationSchema>

// ─── Port Call Filter ─────────────────────────────────────────────────────────
export const PortCallFilterSchema = PaginationSchema.extend({
  phase: z.nativeEnum(PortCallPhase).optional(),
  portId: uuid.optional(),
  principalId: uuid.optional(),
  vesselId: uuid.optional(),
  search: z.string().max(100).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
})
export type PortCallFilterInput = z.infer<typeof PortCallFilterSchema>

// ═════════════════════════════════════════════════════════════════════════════
// ROUTE BODY SCHEMAS (S2.5)
// ─────────────────────────────────────────────────────────────────────────────
// These schemas match the actual current shape of the API route bodies, in
// contrast to the more comprehensive (aspirational) schemas above. They live
// alongside rather than replace because the routes diverged from the original
// design and frontends depend on the current shape — collapsing the two would
// break working clients. A future API redesign can migrate routes toward the
// canonical schemas above when both sides can move together.
//
// All BodySchemas are .strict() so unknown fields are rejected — catches
// client-side typos like { portCallTpye: ... } that would otherwise silently
// drop into a default value. Combined with S1 (tenant) and S2 (audit), this is
// the third "no silent surprises" layer.
// ═════════════════════════════════════════════════════════════════════════════

// ─── POST /api/vessels (body) ─────────────────────────────────────────────────
// Tenant registers a vessel by IMO; route looks the rest up from ships_register.
export const CreateVesselBodySchema = z.object({
  imo: z.string().regex(/^\d{7}$/, 'IMO must be 7 digits'),
}).strict()
export type CreateVesselBody = z.infer<typeof CreateVesselBodySchema>

// ─── POST /api/ports (body) ───────────────────────────────────────────────────
// Either cbpCode (US port via CBP Schedule D) or scheduleKCode (foreign via
// Schedule K). At least one must be present — runtime check stays in the route
// for now since z.union on two-optional-string is awkward; route returns 400
// when both are missing.
export const RegisterPortBodySchema = z.object({
  cbpCode: z.string().min(1).max(10).optional(),
  scheduleKCode: z.string().min(1).max(10).optional(),
}).strict()
export type RegisterPortBody = z.infer<typeof RegisterPortBodySchema>

// ─── POST /api/port-calls (body) ──────────────────────────────────────────────
// Nominates a new port call. Differs from CreatePortCallSchema above by adding
// charterer, office, cargo group, last/next port, ETD, laycan window, voyage
// metadata, and an embedded cargo line. Reflects the route handler at
// apps/web/app/api/port-calls/route.ts as of S2.5.
const CargoLineBodySchema = z.object({
  commodity: z.string().min(1).max(100),
  cargoType: z.nativeEnum(CargoType).optional(),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().min(1).max(20),
}).strict()

export const CreatePortCallBodySchema = z.object({
  portCallType: z.nativeEnum(PortCallType),
  serviceScope: z.array(z.nativeEnum(ServiceScope)).min(1),
  vesselId: uuid,
  principalId: uuid,
  chartererId: uuid.optional(),
  portId: uuid,
  terminalId: uuid.optional(),
  officeId: uuid,
  cargoGroup: z.string().max(50).optional(),
  lastPort: z.string().max(100).optional(),
  nextPort: z.string().max(100).optional(),
  eta: z.coerce.date().optional(),
  etd: z.coerce.date().optional(),
  laycanOpen: z.coerce.date().optional(),
  laycanClose: z.coerce.date().optional(),
  voyageNumber: z.string().max(50).optional(),
  principalRef: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  cargo: CargoLineBodySchema.optional(),
}).strict()
export type CreatePortCallBody = z.infer<typeof CreatePortCallBodySchema>

// ─── PATCH /api/port-calls/[id] (body) ────────────────────────────────────────
// File-status flip only. The wider port-call edit surface is intentionally
// out of scope for now — this matches the current route's narrow contract.
export const UpdatePortCallFileStatusBodySchema = z.object({
  fileStatus: z.enum(['ACTIVE', 'ON_HOLD', 'CANCELLED']),
}).strict()
export type UpdatePortCallFileStatusBody = z.infer<typeof UpdatePortCallFileStatusBodySchema>

// ─── PATCH /api/port-calls/[id]/phase (body) ──────────────────────────────────
// Phase transition. portCallId comes from the URL param, not the body.
// `userRole` is a soft-override hint accepted today — kept optional and free-form
// for now; will tighten when RBAC pulls role from the session instead.
export const PhaseTransitionBodySchema = z.object({
  phase: z.nativeEnum(PortCallPhase),
  userRole: z.string().max(50).optional(),
}).strict()
export type PhaseTransitionBody = z.infer<typeof PhaseTransitionBodySchema>

// ─── PATCH /api/port-calls/[id]/sub-status (body) ─────────────────────────────
// Exactly one of activeSubStatus or settledSubStatus must be provided. The
// .refine() XOR enforces "exactly one" at the schema layer — used to be a
// runtime branch in the route, now structural.
export const UpdateSubStatusBodySchema = z.object({
  activeSubStatus: z.nativeEnum(ActiveSubStatus).optional(),
  settledSubStatus: z.nativeEnum(SettledSubStatus).optional(),
}).strict().refine(
  (data) => Boolean(data.activeSubStatus) !== Boolean(data.settledSubStatus),
  { message: 'Provide exactly one of activeSubStatus or settledSubStatus' },
)
export type UpdateSubStatusBody = z.infer<typeof UpdateSubStatusBodySchema>

// ─── POST /api/port-calls/[id]/documents (multipart metadata) ─────────────────
// The file itself is a multipart Blob — validated separately in the route
// (MIME allowlist, size cap). This schema covers the *metadata* fields the
// client sends alongside the file:
//   - documentType: classification picked by the user (defaults to OTHER if
//     omitted, since for v1 the upload UX is "drop file, classify later").
// portCallId comes from the URL param, not the body.
export const UploadDocumentMetadataSchema = z.object({
  documentType: z.nativeEnum(DocumentType).optional(),
}).strict()
export type UploadDocumentMetadata = z.infer<typeof UploadDocumentMetadataSchema>

// ─── Inbox Triage ───────────────────────────────────────────────────────────
// Link an ingested communication to a port call. The communication id comes
// from the URL param; the body carries the operator's chosen target port call
// (often pre-filled from the AI's suggested portCallNumber, but the operator
// can override — the AI suggestion is advice, not authority).
export const LinkCommunicationBodySchema = z.object({
  portCallId: z.string().min(1, 'portCallId is required'),
}).strict()
export type LinkCommunicationBody = z.infer<typeof LinkCommunicationBodySchema>
