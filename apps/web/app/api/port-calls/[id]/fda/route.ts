// GET /api/port-calls/[id]/fda
//
// Generates a Final Disbursement Account PDF for this port call and returns
// it as a binary download. Routes through the @shipops/services PDF port
// (currently the pdfkit-based mock adapter — see packages/services/src/pdf/).
//
// This is the first vertical slice exercising the ports-and-adapters pattern
// end-to-end (interface → adapter → registry → route → UI button). See
// SESSION_STATE.md's S3 section for context.
//
// No audit_logs entry — this is a read operation that materializes a view of
// existing data, not a mutation. Tenant isolation is enforced via tenantQuery.

import { tenantQuery, tenantQueryOne } from '@shipops/db'
import { NextRequest } from 'next/server'
import { getServices, type ServiceRegistry } from '@shipops/services'
import type {
  PortCall,
  Vessel,
  Organization,
  Expense,
  DisbursementAccount,
} from '@shipops/shared'
import { getTenantId } from '@/lib/api/auth'

// ─── DB row shapes ────────────────────────────────────────────────────────────
// We query each entity directly (rather than spreading a wide JOIN) so the
// marshaling into typed objects is straightforward column-for-column.

interface PortCallRow {
  id: string
  tenant_id: string
  port_call_number: string
  phase: string
  active_sub_status: string | null
  settled_sub_status: string | null
  port_call_type: string
  service_scope: string[]
  vessel_id: string
  principal_id: string
  port_id: string
  terminal_id: string | null
  eta: Date | null
  etd: Date | null
  arrived_at: Date | null
  sailed_at: Date | null
  notes: string | null
  is_locked: boolean
  agent_fee_proforma_cents: number | null
  agent_fee_actual_cents: number | null
  created_at: Date
  updated_at: Date
  created_by: string
  updated_by: string
  deleted_at: Date | null
}

interface VesselRow {
  id: string
  tenant_id: string
  imo_number: string
  mmsi: string | null
  call_sign: string | null
  name: string
  flag_state: string
  vessel_type: string
  loa: number | null
  beam: number | null
  summer_draft: number | null
  gross_tonnage: number | null
  net_tonnage: number | null
  dwt: number | null
  built_year: number | null
  builder: string | null
  owner_id: string | null
  manager_id: string | null
  pi_club: string | null
  class_society: string | null
  created_at: Date
  updated_at: Date
  created_by: string
  updated_by: string
  deleted_at: Date | null
}

interface OrganizationRow {
  id: string
  tenant_id: string
  name: string
  type: string
  tax_id: string | null
  address: string | null
  country: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  banking_details: string | null
  payment_terms_days: number
  // NOTE: live DB no longer has credit_score (replaced with credit_limit_cents).
  // The shared Organization type still has creditScore; we pass null. This is
  // wider Prisma-schema-vs-DB drift, not unique to this route — flag for cleanup.
  created_at: Date
  updated_at: Date
  created_by: string
  updated_by: string
  deleted_at: Date | null
}

interface ExpenseRow {
  id: string
  tenant_id: string
  port_call_id: string
  vendor_id: string | null
  category: string
  description: string
  proforma_amount: number
  actual_amount: number | null
  invoice_amount: number | null
  status: string
  approved_by: string | null
  approved_at: Date | null
  approval_tier: number | null
  invoice_ref: string | null
  is_agency_fee: boolean
  created_at: Date
  updated_at: Date
  created_by: string
  updated_by: string
  deleted_at: Date | null
}

// ─── snake → camel coercion helpers ───────────────────────────────────────────
// One-row, one-call. We don't go through a full ORM because the runtime DB
// layer is pg.Pool by design (see CLAUDE.md, DB runtime). The cost is this
// boring mapping — explicit but trivially auditable.

function toPortCall(r: PortCallRow): PortCall {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    portCallNumber: r.port_call_number,
    phase: r.phase as PortCall['phase'],
    activeSubStatus: r.active_sub_status as PortCall['activeSubStatus'],
    settledSubStatus: r.settled_sub_status as PortCall['settledSubStatus'],
    portCallType: r.port_call_type as PortCall['portCallType'],
    serviceScope: r.service_scope as PortCall['serviceScope'],
    vesselId: r.vessel_id,
    principalId: r.principal_id,
    portId: r.port_id,
    terminalId: r.terminal_id,
    eta: r.eta,
    etd: r.etd,
    arrivedAt: r.arrived_at,
    sailedAt: r.sailed_at,
    notes: r.notes,
    isLocked: r.is_locked,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    deletedAt: r.deleted_at,
  }
}

function toVessel(r: VesselRow): Vessel {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    imoNumber: r.imo_number,
    mmsi: r.mmsi,
    callSign: r.call_sign,
    name: r.name,
    flagState: r.flag_state,
    vesselType: r.vessel_type,
    loa: r.loa,
    beam: r.beam,
    summerDraft: r.summer_draft,
    grossTonnage: r.gross_tonnage,
    netTonnage: r.net_tonnage,
    dwt: r.dwt,
    builtYear: r.built_year,
    builder: r.builder,
    ownerId: r.owner_id,
    managerId: r.manager_id,
    piClub: r.pi_club,
    classSociety: r.class_society,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    deletedAt: r.deleted_at,
  }
}

function toOrganization(r: OrganizationRow): Organization {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    type: r.type as Organization['type'],
    taxId: r.tax_id,
    address: r.address,
    country: r.country,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    bankingDetails: r.banking_details,
    paymentTermsDays: r.payment_terms_days,
    creditScore: null, // see OrganizationRow note above
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    deletedAt: r.deleted_at,
  }
}

function toExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    portCallId: r.port_call_id,
    vendorId: r.vendor_id,
    category: r.category as Expense['category'],
    description: r.description,
    proformaAmount: r.proforma_amount,
    actualAmount: r.actual_amount,
    invoiceAmount: r.invoice_amount,
    status: r.status as Expense['status'],
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    approvalTier: r.approval_tier,
    invoiceRef: r.invoice_ref,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    deletedAt: r.deleted_at,
  }
}

// ─── DA aggregator ────────────────────────────────────────────────────────────
// Mirrors the shape in @shipops/shared/types/index.ts:DisbursementAccount.
// Agency fee is taken from port_calls.agent_fee_{actual,proforma}_cents (and
// we exclude any expense rows flagged is_agency_fee=true to avoid double-counting).
function buildDA(
  portCallId: string,
  allExpenses: Expense[],
  agencyFeeCents: number,
  fundedCents: number
): DisbursementAccount {
  const proformaTotal = allExpenses.reduce((s, e) => s + e.proformaAmount, 0)
  const actualTotal = allExpenses.reduce((s, e) => s + (e.actualAmount ?? 0), 0)
  const grandTotal = actualTotal + agencyFeeCents
  const balance = fundedCents - grandTotal
  return {
    portCallId,
    expenses: allExpenses,
    proformaTotal,
    actualTotal,
    agencyFee: agencyFeeCents,
    grandTotal,
    fundedAmount: fundedCents,
    balance,
    isShortFunded: balance < 0,
  }
}

// ─── Module-level service cache ───────────────────────────────────────────────
// getServices() memoizes internally — pulling it once here just avoids the
// allocation on every request.
let servicesPromise: Promise<ServiceRegistry> | null = null
function services(): Promise<ServiceRegistry> {
  if (!servicesPromise) servicesPromise = getServices()
  return servicesPromise
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const tenantId = await getTenantId()

  // 1. Port call core row.
  const pcRow = await tenantQueryOne<PortCallRow>(
    tenantId,
    `SELECT id, tenant_id, port_call_number,
            phase::text AS phase,
            active_sub_status::text AS active_sub_status,
            settled_sub_status::text AS settled_sub_status,
            port_call_type::text AS port_call_type,
            service_scope::text[] AS service_scope,
            vessel_id, principal_id, port_id, terminal_id,
            eta, etd, arrived_at, sailed_at, notes, is_locked,
            agent_fee_proforma_cents, agent_fee_actual_cents,
            created_at, updated_at, created_by, updated_by, deleted_at
     FROM port_calls
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [params.id, tenantId]
  )
  if (!pcRow) {
    return Response.json({ error: 'Port call not found' }, { status: 404 })
  }

  // 2. Vessel + principal (separate queries for clarity over one wide JOIN —
  // see CLAUDE.md note about pg.Pool runtime + auditable mappings).
  const [vesselRow, principalRow] = await Promise.all([
    tenantQueryOne<VesselRow>(
      tenantId,
      `SELECT id, tenant_id, imo_number, mmsi, call_sign, name, flag_state,
              vessel_type, loa, beam, summer_draft, gross_tonnage, net_tonnage,
              dwt, built_year, builder, owner_id, manager_id, pi_club,
              class_society, created_at, updated_at, created_by, updated_by,
              deleted_at
       FROM vessels
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [pcRow.vessel_id, tenantId]
    ),
    tenantQueryOne<OrganizationRow>(
      tenantId,
      `SELECT id, tenant_id, name, type::text AS type, tax_id, address, country,
              contact_name, contact_email, contact_phone, banking_details,
              payment_terms_days, created_at, updated_at,
              created_by, updated_by, deleted_at
       FROM organizations
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [pcRow.principal_id, tenantId]
    ),
  ])

  if (!vesselRow || !principalRow) {
    return Response.json(
      { error: 'Vessel or principal record missing for this port call' },
      { status: 500 }
    )
  }

  // 3. Expenses (excluding rows flagged as the agency fee itself — that's
  // accounted for separately from port_calls.agent_fee_actual_cents).
  const expenseRows = await tenantQuery<ExpenseRow>(
    tenantId,
    `SELECT id, tenant_id, port_call_id, vendor_id,
            category::text AS category,
            description, proforma_amount, actual_amount, invoice_amount,
            status::text AS status,
            approved_by, approved_at, approval_tier, invoice_ref,
            is_agency_fee,
            created_at, updated_at, created_by, updated_by, deleted_at
     FROM expenses
     WHERE port_call_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       AND is_agency_fee = false
     ORDER BY category::text, description`,
    [params.id, tenantId]
  )

  // 4. Funding total (received, not just requested).
  const fundingRow = await tenantQueryOne<{ total: string | null }>(
    tenantId,
    `SELECT COALESCE(SUM(amount), 0)::text AS total
     FROM funding_records
     WHERE port_call_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       AND received_at IS NOT NULL`,
    [params.id, tenantId]
  )
  const fundedCents = fundingRow ? Number(fundingRow.total ?? 0) : 0
  // Prefer actual agency fee; fall back to proforma if not yet finalized.
  const agencyFeeCents =
    pcRow.agent_fee_actual_cents ?? pcRow.agent_fee_proforma_cents ?? 0

  // 5. Marshal + render.
  const portCall = toPortCall(pcRow)
  const vessel = toVessel(vesselRow)
  const principal = toOrganization(principalRow)
  const expenses = expenseRows.map(toExpense)
  const da = buildDA(portCall.id, expenses, agencyFeeCents, fundedCents)

  // TODO(multi-office): pull agency name from the office record when this
  // route accepts an office-scoped session. Hard-coded for the first slice.
  const agencyName = 'Gulf Coast Agency'

  const svc = await services()
  const pdfBuffer = await svc.pdf.generateFDA({
    portCall,
    vessel,
    principal,
    da,
    agencyName,
  })

  // 6. Stream the buffer back as a download.
  // pdfBuffer is a Node Buffer; convert to Uint8Array for the Response body
  // (Next.js Response expects BodyInit which doesn't include Node Buffer).
  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="FDA-${portCall.portCallNumber}.pdf"`,
      'Cache-Control': 'no-store',
      'Content-Length': pdfBuffer.byteLength.toString(),
    },
  })
}
