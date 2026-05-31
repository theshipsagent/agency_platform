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
  creditScore: null,
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

  writeFileSync('/tmp/shipops-smoke-fda.pdf', fda)
  writeFileSync('/tmp/shipops-smoke-sof.pdf', sof)

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
  console.log('PDFs written to /tmp/shipops-smoke-fda.pdf and /tmp/shipops-smoke-sof.pdf')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
