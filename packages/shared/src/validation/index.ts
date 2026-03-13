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
