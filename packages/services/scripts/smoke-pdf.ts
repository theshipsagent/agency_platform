// Tiny standalone smoke test for the PDF mock adapter.
// Run with: pnpm --filter @shipops/services tsx scripts/smoke-pdf.ts
// Writes two PDFs to /tmp and prints their sizes + magic-byte check.

import { writeFileSync } from 'node:fs'
import { pdfMockAdapter } from '../src/pdf/mock-adapter'
import type {
  PortCall,
  Vessel,
  Organization,
  DisbursementAccount,
  Expense,
  TimelineEvent,
} from '@shipops/shared'

const tenantId = 'tenant-smoke'
const portCallId = 'pc-smoke-001'

const portCall: PortCall = {
  id: portCallId,
  tenantId,
  portCallNumber: 'PC-2026-9999',
  phase: 'PROCESSING_FDA' as PortCall['phase'],
  activeSubStatus: null,
  settledSubStatus: null,
  portCallType: 'LOADING' as PortCall['portCallType'],
  serviceScope: [],
  vesselId: 'v-smoke',
  principalId: 'p-smoke',
  portId: 'port-smoke',
  terminalId: null,
  eta: new Date('2026-05-25T14:00:00Z'),
  etd: new Date('2026-05-29T08:00:00Z'),
  arrivedAt: new Date('2026-05-25T13:42:00Z'),
  sailedAt: new Date('2026-05-29T07:15:00Z'),
  notes: null,
  isLocked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'smoke',
  updatedBy: 'smoke',
  deletedAt: null,
}

const vessel: Vessel = {
  id: 'v-smoke',
  tenantId,
  imoNumber: '9456789',
  mmsi: null,
  callSign: null,
  name: 'MV SMOKE TESTER',
  flagState: 'MH',
  vesselType: 'Bulk Carrier',
  loa: 229,
  beam: 32,
  summerDraft: 14.5,
  grossTonnage: 43000,
  netTonnage: null,
  dwt: 81000,
  builtYear: 2018,
  builder: null,
  ownerId: null,
  managerId: null,
  piClub: null,
  classSociety: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'smoke',
  updatedBy: 'smoke',
  deletedAt: null,
}

const principal: Organization = {
  id: 'p-smoke',
  tenantId,
  name: 'Pacific Basin (Smoke)',
  type: 'PRINCIPAL' as Organization['type'],
  taxId: null,
  address: null,
  country: 'HK',
  contactName: 'A. Captain',
  contactEmail: null,
  contactPhone: null,
  bankingDetails: null,
  paymentTermsDays: 30,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'smoke',
  updatedBy: 'smoke',
  deletedAt: null,
}

const baseExpense = {
  tenantId,
  portCallId,
  vendorId: null,
  invoiceAmount: null,
  status: 'INVOICE_RECEIVED' as Expense['status'],
  approvedBy: null,
  approvedAt: null,
  approvalTier: null,
  invoiceRef: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'smoke',
  updatedBy: 'smoke',
  deletedAt: null,
}

const expenses: Expense[] = [
  {
    ...baseExpense,
    id: 'e1',
    category: 'PILOTAGE' as Expense['category'],
    description: 'NOBRA Pilots — inbound + outbound pilotage Mississippi River',
    proformaAmount: 850000,
    actualAmount: 875000,
  },
  {
    ...baseExpense,
    id: 'e2',
    category: 'TOWAGE' as Expense['category'],
    description: 'Crescent Towing — 2x harbor tugs both shifts',
    proformaAmount: 420000,
    actualAmount: 420000,
  },
  {
    ...baseExpense,
    id: 'e3',
    category: 'PORT_DUES' as Expense['category'],
    description: 'Port of New Orleans wharfage + dockage',
    proformaAmount: 1250000,
    actualAmount: 1187500,
  },
  {
    ...baseExpense,
    id: 'e4',
    category: 'STEVEDORING' as Expense['category'],
    description: 'Associated Terminals — stevedore labor 65,000 mt pet coke',
    proformaAmount: 5200000,
    actualAmount: 5337500,
  },
]

const da: DisbursementAccount = {
  portCallId,
  expenses,
  proformaTotal: 7720000,
  actualTotal: 7820000,
  agencyFee: 350000,
  grandTotal: 8170000,
  fundedAmount: 8000000,
  balance: -170000,
  isShortFunded: true,
}

const events: TimelineEvent[] = [
  {
    id: 't1',
    tenantId,
    portCallId,
    eventType: 'NOR_TENDERED' as TimelineEvent['eventType'],
    customLabel: null,
    occurredAt: new Date('2026-05-25T13:42:00Z'),
    source: 'AGENT',
    isConfirmed: true,
    notes: 'NOR tendered on arrival pilot station',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'smoke',
    updatedBy: 'smoke',
    deletedAt: null,
  },
  {
    id: 't2',
    tenantId,
    portCallId,
    eventType: 'PILOT_ON_BOARD' as TimelineEvent['eventType'],
    customLabel: null,
    occurredAt: new Date('2026-05-25T14:18:00Z'),
    source: 'AGENT',
    isConfirmed: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'smoke',
    updatedBy: 'smoke',
    deletedAt: null,
  },
  {
    id: 't3',
    tenantId,
    portCallId,
    eventType: 'ALL_FAST' as TimelineEvent['eventType'],
    customLabel: null,
    occurredAt: new Date('2026-05-25T16:55:00Z'),
    source: 'TERMINAL',
    isConfirmed: true,
    notes: 'Berthed at Nashville Ave starboard side to',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'smoke',
    updatedBy: 'smoke',
    deletedAt: null,
  },
]

async function main() {
  const fda = await pdfMockAdapter.generateFDA({
    portCall,
    vessel,
    principal,
    da,
    agencyName: 'Gulf Coast Agency (Smoke Test)',
  })
  const sof = await pdfMockAdapter.generateSOF({
    portCall,
    vessel,
    events,
    agencyName: 'Gulf Coast Agency (Smoke Test)',
  })
  const bol = await pdfMockAdapter.generateBillOfLading({
    billType: 'CONGENBILL',
    blNumber: 'NOLA-2026-0042',
    referenceNo: 'PC-2026-9999',
    shipper: { name: 'Oxbow Carbon LLC', address: '1601 Forum Place, West Palm Beach, FL 33401, USA' },
    consignee: { name: 'To order of Shanghai Pudong Development Bank' },
    notifyAddress: { name: 'Sinochem International (Overseas) Pte Ltd', address: '1 Temasek Avenue, Singapore 039192' },
    vesselName: 'MV SMOKE TESTER',
    portOfLoading: 'New Orleans, LA (Nashville Avenue Terminal)',
    portOfDischarge: 'Qingdao, China',
    descriptionOfGoods: '65,000 metric tons green delayed petroleum coke in bulk',
    grossWeight: '65,000.000 MT',
    freightPayableAs: 'per Charter Party',
    charterPartyDate: '2026-05-10',
    placeAndDateOfIssue: 'New Orleans, 29 May 2026',
    numberOfOriginals: '3 (three)',
    dateShippedOnBoard: '29 May 2026',
    signedBy: 'Agent',
    agentName: 'Gulf Coast Agency',
    agencyName: 'Gulf Coast Agency (Smoke Test)',
  })

  writeFileSync('/tmp/shipops-smoke-fda.pdf', fda)
  writeFileSync('/tmp/shipops-smoke-sof.pdf', sof)
  writeFileSync('/tmp/shipops-smoke-bol.pdf', bol)

  // PDF magic bytes are %PDF (0x25 0x50 0x44 0x46)
  const checkMagic = (label: string, buf: Buffer) => {
    const magic = buf.subarray(0, 4).toString('ascii')
    const ok = magic === '%PDF'
    console.log(
      `${ok ? '✓' : '✗'} ${label}: ${buf.byteLength.toLocaleString()} bytes, magic=${JSON.stringify(magic)}`
    )
    if (!ok) process.exit(1)
  }

  checkMagic('FDA', fda)
  checkMagic('SOF', sof)
  checkMagic('B/L (CONGENBILL)', bol)

  // B/L must be exactly 2 pages (page-1 grid + page-2 conditions).
  const pageCount = (bol.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
  console.log(`${pageCount === 2 ? '✓' : '✗'} B/L page count: ${pageCount} (expected 2)`)
  if (pageCount !== 2) process.exit(1)

  console.log('PDFs written to /tmp/shipops-smoke-{fda,sof,bol}.pdf')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
