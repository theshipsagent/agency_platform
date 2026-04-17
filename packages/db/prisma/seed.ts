import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding ShipOps demo data...')

  // ─── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'gulf-coast-agency' },
    update: {},
    create: {
      id: 'tenant-gca-001',
      name: 'Gulf Coast Agency Services',
      slug: 'gulf-coast-agency',
      clerkOrgId: 'org_demo_gca',
      subscriptionTier: 'professional',
    },
  })
  console.log('✓ Tenant:', tenant.name)

  // ─── Users ────────────────────────────────────────────────────────────────
  const SYSTEM = 'seed'

  const users = await Promise.all([
    prisma.user.upsert({
      where: { clerkUserId: 'user_demo_operator' },
      update: {},
      create: {
        id: 'user-op-001',
        tenantId: tenant.id,
        clerkUserId: 'user_demo_operator',
        email: 'james.thibodaux@gulfcoastagency.com',
        name: 'James Thibodaux',
        role: 'AGENT_FULL',
        approvalTierLimit: 500000, // $5,000
        createdBy: SYSTEM,
        updatedBy: SYSTEM,
      },
    }),
    prisma.user.upsert({
      where: { clerkUserId: 'user_demo_accounting' },
      update: {},
      create: {
        id: 'user-ac-001',
        tenantId: tenant.id,
        clerkUserId: 'user_demo_accounting',
        email: 'marie.fontenot@gulfcoastagency.com',
        name: 'Marie Fontenot',
        role: 'ACCOUNTING',
        approvalTierLimit: 1000000, // $10,000
        createdBy: SYSTEM,
        updatedBy: SYSTEM,
      },
    }),
    prisma.user.upsert({
      where: { clerkUserId: 'user_demo_manager' },
      update: {},
      create: {
        id: 'user-mg-001',
        tenantId: tenant.id,
        clerkUserId: 'user_demo_manager',
        email: 'randy.boudreaux@gulfcoastagency.com',
        name: 'Randy Boudreaux',
        role: 'MANAGER',
        approvalTierLimit: 50000000, // $500,000
        createdBy: SYSTEM,
        updatedBy: SYSTEM,
      },
    }),
  ])
  console.log('✓ Users:', users.length)

  // ─── Offices ──────────────────────────────────────────────────────────────
  // Every port call must belong to an office (schema requires officeId)
  const officeNOL = await prisma.office.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'NOL' } },
    update: {},
    create: {
      id: 'office-nol-001', tenantId: tenant.id,
      code: 'NOL', name: 'Gulf Coast Agency — New Orleans',
      city: 'New Orleans', state: 'LA', country: 'US',
    },
  })
  const officeHOU = await prisma.office.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'HOU' } },
    update: {},
    create: {
      id: 'office-hou-001', tenantId: tenant.id,
      code: 'HOU', name: 'Gulf Coast Agency — Houston',
      city: 'Houston', state: 'TX', country: 'US',
    },
  })
  const officeMOB = await prisma.office.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MOB' } },
    update: {},
    create: {
      id: 'office-mob-001', tenantId: tenant.id,
      code: 'MOB', name: 'Gulf Coast Agency — Mobile',
      city: 'Mobile', state: 'AL', country: 'US',
    },
  })
  console.log('✓ Offices: 3 (NOL, HOU, MOB)')

  // ─── Ports & Terminals ────────────────────────────────────────────────────
  const portNOLA = await prisma.port.upsert({
    where: { id: 'port-nola-001' },
    update: {},
    create: {
      id: 'port-nola-001',
      tenantId: tenant.id,
      name: 'New Orleans',
      unLocode: 'USNOL',
      country: 'US',
      region: 'Gulf Coast',
      timeZone: 'America/Chicago',
    },
  })

  const portHOU = await prisma.port.upsert({
    where: { id: 'port-hou-001' },
    update: {},
    create: {
      id: 'port-hou-001',
      tenantId: tenant.id,
      name: 'Houston',
      unLocode: 'USHOU',
      country: 'US',
      region: 'Gulf Coast',
      timeZone: 'America/Chicago',
    },
  })

  const portMOB = await prisma.port.upsert({
    where: { id: 'port-mob-001' },
    update: {},
    create: {
      id: 'port-mob-001',
      tenantId: tenant.id,
      name: 'Mobile',
      unLocode: 'USMOB',
      country: 'US',
      region: 'Gulf Coast',
      timeZone: 'America/Chicago',
    },
  })

  const terminals = await Promise.all([
    prisma.terminal.upsert({
      where: { id: 'term-nola-nashville' },
      update: {},
      create: { id: 'term-nola-nashville', portId: portNOLA.id, name: 'Nashville Avenue Wharf', terminalType: 'GENERAL_CARGO', maxDraftM: 11.0 },
    }),
    prisma.terminal.upsert({
      where: { id: 'term-nola-burnside' },
      update: {},
      create: { id: 'term-nola-burnside', portId: portNOLA.id, name: 'Burnside Terminal', terminalType: 'BULK_DRY', maxDraftM: 13.5 },
    }),
    prisma.terminal.upsert({
      where: { id: 'term-hou-barbours' },
      update: {},
      create: { id: 'term-hou-barbours', portId: portHOU.id, name: 'Barbours Cut Terminal', terminalType: 'CONTAINER', maxDraftM: 14.0 },
    }),
    prisma.terminal.upsert({
      where: { id: 'term-mob-mcduffie' },
      update: {},
      create: { id: 'term-mob-mcduffie', portId: portMOB.id, name: 'McDuffie Coal Terminal', terminalType: 'BULK_DRY', maxDraftM: 13.0 },
    }),
    prisma.terminal.upsert({
      where: { id: 'term-mob-aldocks' },
      update: {},
      create: { id: 'term-mob-aldocks', portId: portMOB.id, name: 'Alabama State Docks', terminalType: 'MULTI_PURPOSE', maxDraftM: 11.5 },
    }),
  ])

  // ─── Office ↔ Port links ──────────────────────────────────────────────────
  await Promise.all([
    prisma.officePort.upsert({
      where: { officeId_portId: { officeId: officeNOL.id, portId: portNOLA.id } },
      update: {}, create: { officeId: officeNOL.id, portId: portNOLA.id, isPrimary: true },
    }),
    prisma.officePort.upsert({
      where: { officeId_portId: { officeId: officeHOU.id, portId: portHOU.id } },
      update: {}, create: { officeId: officeHOU.id, portId: portHOU.id, isPrimary: true },
    }),
    prisma.officePort.upsert({
      where: { officeId_portId: { officeId: officeMOB.id, portId: portMOB.id } },
      update: {}, create: { officeId: officeMOB.id, portId: portMOB.id, isPrimary: true },
    }),
  ])
  console.log('✓ Ports:', 3, '| Terminals:', terminals.length, '| Office-port links: 3')

  // ─── Vessels ──────────────────────────────────────────────────────────────
  const vessels = await Promise.all([
    prisma.vessel.upsert({
      where: { id: 'vessel-001' },
      update: {},
      create: {
        id: 'vessel-001', tenantId: tenant.id,
        imoNumber: '9387000', mmsi: '477123456', callSign: 'VROX4',
        name: 'MV PACIFIC HARMONY', flagState: 'HK', vesselType: 'Bulk Carrier',
        loa: 189.9, beam: 32.3, summerDraft: 12.8, grossTonnage: 32847, dwt: 57000,
        builtYear: 2008, classSociety: 'Lloyd\'s Register',
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.vessel.upsert({
      where: { id: 'vessel-002' },
      update: {},
      create: {
        id: 'vessel-002', tenantId: tenant.id,
        imoNumber: '9412388', mmsi: '636014521', callSign: '5LBA3',
        name: 'MV OLDENDORFF NAVIGATOR', flagState: 'LR', vesselType: 'Bulk Carrier',
        loa: 229.0, beam: 38.0, summerDraft: 14.5, grossTonnage: 43900, dwt: 81000,
        builtYear: 2012, classSociety: 'DNV',
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.vessel.upsert({
      where: { id: 'vessel-003' },
      update: {},
      create: {
        id: 'vessel-003', tenantId: tenant.id,
        imoNumber: '9550742', mmsi: '566123789', callSign: '9V3214',
        name: 'MV KLAVENESS CHALLENGER', flagState: 'SG', vesselType: 'Bulk Carrier',
        loa: 199.9, beam: 32.3, summerDraft: 13.2, grossTonnage: 35867, dwt: 63500,
        builtYear: 2010, classSociety: 'Bureau Veritas',
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.vessel.upsert({
      where: { id: 'vessel-004' },
      update: {},
      create: {
        id: 'vessel-004', tenantId: tenant.id,
        imoNumber: '9680321', mmsi: '352123654', callSign: 'H3MX',
        name: 'MV NORDEN PACIFIC', flagState: 'PA', vesselType: 'Bulk Carrier',
        loa: 179.9, beam: 30.0, summerDraft: 11.5, grossTonnage: 24891, dwt: 38500,
        builtYear: 2014, classSociety: 'Class NK',
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.vessel.upsert({
      where: { id: 'vessel-005' },
      update: {},
      create: {
        id: 'vessel-005', tenantId: tenant.id,
        imoNumber: '9321455', mmsi: '538007432', callSign: 'V7QR2',
        name: 'MV GENCO THUNDER', flagState: 'MH', vesselType: 'Bulk Carrier',
        loa: 224.9, beam: 36.0, summerDraft: 14.2, grossTonnage: 40162, dwt: 74500,
        builtYear: 2009, classSociety: 'American Bureau of Shipping',
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
  ])
  console.log('✓ Vessels:', vessels.length)

  // ─── Organizations ────────────────────────────────────────────────────────
  const orgs = await Promise.all([
    // Principals
    prisma.organization.upsert({
      where: { id: 'org-pacbasin' },
      update: {},
      create: {
        id: 'org-pacbasin', tenantId: tenant.id,
        name: 'Pacific Basin Shipping', type: 'PRINCIPAL_CHARTERER',
        country: 'HK', contactEmail: 'ops@pacificbasin.com',
        paymentTermsDays: 15,
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.organization.upsert({
      where: { id: 'org-oldendorff' },
      update: {},
      create: {
        id: 'org-oldendorff', tenantId: tenant.id,
        name: 'Oldendorff Carriers', type: 'PRINCIPAL_OWNER',
        country: 'DE', contactEmail: 'agency@oldendorff.com',
        paymentTermsDays: 10,
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.organization.upsert({
      where: { id: 'org-klaveness' },
      update: {},
      create: {
        id: 'org-klaveness', tenantId: tenant.id,
        name: 'Klaveness Combination Carriers', type: 'PRINCIPAL_CHARTERER',
        country: 'NO', contactEmail: 'operations@klaveness.com',
        paymentTermsDays: 14,
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.organization.upsert({
      where: { id: 'org-norden' },
      update: {},
      create: {
        id: 'org-norden', tenantId: tenant.id,
        name: 'Norden Bulk', type: 'PRINCIPAL_CHARTERER',
        country: 'DK', contactEmail: 'agency.ops@norden.com',
        paymentTermsDays: 14,
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.organization.upsert({
      where: { id: 'org-genco' },
      update: {},
      create: {
        id: 'org-genco', tenantId: tenant.id,
        name: 'Genco Shipping & Trading', type: 'PRINCIPAL_OWNER',
        country: 'US', contactEmail: 'chartering@gencoshipping.com',
        paymentTermsDays: 20,
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    // Vendors
    prisma.organization.upsert({
      where: { id: 'org-crescent' },
      update: {},
      create: {
        id: 'org-crescent', tenantId: tenant.id,
        name: 'Crescent Towing', type: 'VENDOR',
        country: 'US', contactEmail: 'dispatch@crescenttowing.com',
        paymentTermsDays: 30,
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.organization.upsert({
      where: { id: 'org-nobra' },
      update: {},
      create: {
        id: 'org-nobra', tenantId: tenant.id,
        name: 'NOBRA Bar Pilots', type: 'VENDOR',
        country: 'US', contactEmail: 'billing@nobra.com',
        paymentTermsDays: 30,
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.organization.upsert({
      where: { id: 'org-assoc-term' },
      update: {},
      create: {
        id: 'org-assoc-term', tenantId: tenant.id,
        name: 'Associated Terminals', type: 'TERMINAL_OPERATOR',
        country: 'US', contactEmail: 'ops@associatedterminals.com',
        paymentTermsDays: 15,
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.organization.upsert({
      where: { id: 'org-lafleur' },
      update: {},
      create: {
        id: 'org-lafleur', tenantId: tenant.id,
        name: 'LaFleur Launch Service', type: 'VENDOR',
        country: 'US',
        paymentTermsDays: 30,
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
    prisma.organization.upsert({
      where: { id: 'org-port-nola' },
      update: {},
      create: {
        id: 'org-port-nola', tenantId: tenant.id,
        name: 'Port of New Orleans', type: 'GOVERNMENT_AGENCY',
        country: 'US',
        paymentTermsDays: 30,
        createdBy: SYSTEM, updatedBy: SYSTEM,
      },
    }),
  ])
  console.log('✓ Organizations:', orgs.length)

  // ─── Port Calls — one per phase ───────────────────────────────────────────
  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000)
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000)

  const portCallsData = [
    // Phase 1 — Proforma Estimated
    {
      id: 'pc-001', portCallNumber: 'PC-2026-0001',
      phase: 'PROFORMA_ESTIMATED' as const,
      portCallType: 'DISCHARGE' as const,
      serviceScope: ['FULL_AGENCY', 'CUSTOMS_CLEARANCE'] as const,
      vesselId: 'vessel-004', principalId: 'org-norden',
      portId: portNOLA.id, terminalId: 'term-nola-nashville', officeId: officeNOL.id,
      eta: daysFromNow(14), notes: 'Pet coke discharge, ~38,000 MT',
    },
    // Phase 2 — Awaiting Appointment
    {
      id: 'pc-002', portCallNumber: 'PC-2026-0002',
      phase: 'AWAITING_APPOINTMENT' as const,
      portCallType: 'LOAD' as const,
      serviceScope: ['FULL_AGENCY'] as const,
      vesselId: 'vessel-003', principalId: 'org-klaveness',
      portId: portMOB.id, terminalId: 'term-mob-mcduffie', officeId: officeMOB.id,
      eta: daysFromNow(10), notes: 'Coal load to Rotterdam, 63,000 MT',
    },
    // Phase 3 — Appointed
    {
      id: 'pc-003', portCallNumber: 'PC-2026-0003',
      phase: 'APPOINTED' as const,
      portCallType: 'DISCHARGE' as const,
      serviceScope: ['FULL_AGENCY', 'CUSTOMS_CLEARANCE', 'SURVEYOR_COORDINATION'] as const,
      vesselId: 'vessel-001', principalId: 'org-pacbasin',
      portId: portNOLA.id, terminalId: 'term-nola-burnside', officeId: officeNOL.id,
      eta: daysFromNow(5), notes: 'Alumina discharge, 57,000 MT. Draft survey required.',
    },
    // Phase 4 Active — At Anchor
    {
      id: 'pc-004', portCallNumber: 'PC-2026-0004',
      phase: 'ACTIVE' as const,
      activeSubStatus: 'AT_ANCHOR' as const,
      portCallType: 'DISCHARGE' as const,
      serviceScope: ['FULL_AGENCY', 'CUSTOMS_CLEARANCE'] as const,
      vesselId: 'vessel-002', principalId: 'org-oldendorff',
      portId: portNOLA.id, terminalId: 'term-nola-burnside', officeId: officeNOL.id,
      eta: daysAgo(1), arrivedAt: daysAgo(0),
      notes: 'Waiting for Burnside berth. NOR tendered.',
    },
    // Phase 4 Active — Working Cargo
    {
      id: 'pc-005', portCallNumber: 'PC-2026-0005',
      phase: 'ACTIVE' as const,
      activeSubStatus: 'WORKING_CARGO' as const,
      portCallType: 'LOAD_DISCHARGE' as const,
      serviceScope: ['FULL_AGENCY', 'SURVEYOR_COORDINATION', 'STEVEDORING_COORDINATION'] as const,
      vesselId: 'vessel-005', principalId: 'org-genco',
      portId: portHOU.id, terminalId: 'term-hou-barbours', officeId: officeHOU.id,
      eta: daysAgo(3), arrivedAt: daysAgo(3),
      notes: 'Steel coils discharge / grain load. Day 3 of cargo ops.',
    },
    // Phase 5 — Sailed
    {
      id: 'pc-006', portCallNumber: 'PC-2026-0006',
      phase: 'SAILED' as const,
      portCallType: 'DISCHARGE' as const,
      serviceScope: ['FULL_AGENCY', 'CUSTOMS_CLEARANCE'] as const,
      vesselId: 'vessel-004', principalId: 'org-norden',
      portId: portMOB.id, terminalId: 'term-mob-aldocks', officeId: officeMOB.id,
      eta: daysAgo(12), arrivedAt: daysAgo(11), sailedAt: daysAgo(2),
      notes: 'Iron ore discharge complete. Chasing 3 outstanding invoices.',
    },
    // Phase 6 — Completed
    {
      id: 'pc-007', portCallNumber: 'PC-2026-0007',
      phase: 'COMPLETED' as const,
      portCallType: 'DISCHARGE' as const,
      serviceScope: ['FULL_AGENCY'] as const,
      vesselId: 'vessel-001', principalId: 'org-pacbasin',
      portId: portHOU.id, terminalId: 'term-hou-barbours', officeId: officeHOU.id,
      eta: daysAgo(22), arrivedAt: daysAgo(21), sailedAt: daysAgo(15),
      notes: 'All invoices received and verified. FDA ready for render.',
    },
    // Phase 7 — Processing FDA
    {
      id: 'pc-008', portCallNumber: 'PC-2026-0008',
      phase: 'PROCESSING_FDA' as const,
      portCallType: 'LOAD' as const,
      serviceScope: ['FULL_AGENCY', 'CUSTOMS_CLEARANCE'] as const,
      vesselId: 'vessel-003', principalId: 'org-klaveness',
      portId: portNOLA.id, terminalId: 'term-nola-nashville', officeId: officeNOL.id,
      eta: daysAgo(35), arrivedAt: daysAgo(34), sailedAt: daysAgo(28),
      notes: 'FDA sent to principal. Awaiting approval. Dockage line item under query.',
    },
    // Phase 8 — Awaiting Payment
    {
      id: 'pc-009', portCallNumber: 'PC-2026-0009',
      phase: 'AWAITING_PAYMENT' as const,
      portCallType: 'DISCHARGE' as const,
      serviceScope: ['FULL_AGENCY'] as const,
      vesselId: 'vessel-002', principalId: 'org-oldendorff',
      portId: portMOB.id, terminalId: 'term-mob-mcduffie', officeId: officeMOB.id,
      eta: daysAgo(50), arrivedAt: daysAgo(49), sailedAt: daysAgo(44),
      notes: 'FDA approved. Balance $32,450 due. 28 days outstanding.',
    },
    // Phase 9 — Settled
    {
      id: 'pc-010', portCallNumber: 'PC-2026-0010',
      phase: 'SETTLED' as const,
      settledSubStatus: 'FULLY_SETTLED' as const,
      portCallType: 'LOAD' as const,
      serviceScope: ['FULL_AGENCY', 'CREW_CHANGE'] as const,
      vesselId: 'vessel-005', principalId: 'org-genco',
      portId: portNOLA.id, terminalId: 'term-nola-burnside', officeId: officeNOL.id,
      eta: daysAgo(65), arrivedAt: daysAgo(64), sailedAt: daysAgo(58),
      isLocked: true,
      notes: 'Fully settled. All vendors paid.',
    },
  ]

  for (const pc of portCallsData) {
    await prisma.portCall.upsert({
      where: { id: pc.id },
      update: {},
      create: {
        id: pc.id,
        tenantId: tenant.id,
        officeId: pc.officeId,
        portCallNumber: pc.portCallNumber,
        phase: pc.phase,
        activeSubStatus: (pc as { activeSubStatus?: string }).activeSubStatus ?? null,
        settledSubStatus: (pc as { settledSubStatus?: string }).settledSubStatus ?? null,
        portCallType: pc.portCallType,
        serviceScope: [...pc.serviceScope],
        vesselId: pc.vesselId,
        principalId: pc.principalId,
        portId: pc.portId,
        terminalId: pc.terminalId ?? null,
        eta: (pc as { eta?: Date }).eta ?? null,
        arrivedAt: (pc as { arrivedAt?: Date }).arrivedAt ?? null,
        sailedAt: (pc as { sailedAt?: Date }).sailedAt ?? null,
        isLocked: (pc as { isLocked?: boolean }).isLocked ?? false,
        notes: pc.notes,
        createdBy: SYSTEM,
        updatedBy: SYSTEM,
      },
    })
  }
  console.log('✓ Port Calls:', portCallsData.length, '(one per phase)')

  // ─── Expenses for active port call (pc-005, Working Cargo) ────────────────
  const expenses = [
    { category: 'PILOTAGE', description: 'Inbound pilotage — Bar Pilots', proformaAmount: 485000, actualAmount: 485000, status: 'VERIFIED', vendorId: 'org-nobra' },
    { category: 'TOWAGE', description: 'Inbound towage — 2 tugs', proformaAmount: 620000, actualAmount: 620000, status: 'INVOICE_RECEIVED', vendorId: 'org-crescent' },
    { category: 'DOCKAGE_WHARFAGE', description: 'Dockage — Barbours Cut, per diem × 5 days est.', proformaAmount: 1250000, status: 'ACCRUED' },
    { category: 'STEVEDORING', description: 'Stevedoring — discharge 4,200 MT steel coils', proformaAmount: 7350000, status: 'ACCRUED' },
    { category: 'SURVEYORS', description: 'Draft survey pre/post', proformaAmount: 185000, status: 'ESTIMATED' },
    { category: 'CUSTOMS_CBP', description: 'CBP formal entry + ISF filing', proformaAmount: 165000, actualAmount: 165000, status: 'APPROVED' },
    { category: 'LAUNCH_WATER_TAXI', description: 'Launch service', proformaAmount: 95000, status: 'ESTIMATED' },
    { category: 'AGENCY_FEE', description: 'Agency fee', proformaAmount: 750000, status: 'ESTIMATED' },
  ] as const

  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i]!
    await prisma.expense.upsert({
      where: { id: `exp-pc005-${i + 1}` },
      update: {},
      create: {
        id: `exp-pc005-${i + 1}`,
        tenantId: tenant.id,
        portCallId: 'pc-005',
        vendorId: ('vendorId' in e ? e.vendorId : null) ?? null,
        category: e.category,
        description: e.description,
        proformaAmount: e.proformaAmount,
        actualAmount: ('actualAmount' in e ? e.actualAmount : null) ?? null,
        status: e.status,
        createdBy: SYSTEM,
        updatedBy: SYSTEM,
      },
    })
  }
  console.log('✓ Expenses: 8 (for pc-005)')

  // ─── Funding for active port call ─────────────────────────────────────────
  await prisma.fundingRecord.upsert({
    where: { id: 'fund-pc005-001' },
    update: {},
    create: {
      id: 'fund-pc005-001',
      tenantId: tenant.id,
      portCallId: 'pc-005',
      principalId: 'org-genco',
      amount: 8500000, // $85,000
      status: 'RECEIVED',
      requestedAt: daysAgo(5),
      receivedAt: daysAgo(4),
      wireReference: 'WIRE-GS-20260308',
      createdBy: SYSTEM,
      updatedBy: SYSTEM,
    },
  })
  console.log('✓ Funding records: 1')

  // ─── Timeline events for active port call ─────────────────────────────────
  const tlEvents = [
    { eventType: 'ETA_RECEIVED', occurredAt: daysAgo(8), notes: 'ETA received from master via email' },
    { eventType: 'ARRIVED_PILOT_STATION', occurredAt: daysAgo(3) },
    { eventType: 'NOR_TENDERED', occurredAt: daysAgo(3), notes: 'NOR tendered 14:30 LT' },
    { eventType: 'NOR_ACCEPTED', occurredAt: daysAgo(3), notes: 'NOR accepted 16:00 LT' },
    { eventType: 'FREE_PRATIQUE', occurredAt: daysAgo(3) },
    { eventType: 'ALL_FAST', occurredAt: daysAgo(3), notes: 'Berth 7, Barbours Cut' },
    { eventType: 'COMMENCED_CARGO', occurredAt: daysAgo(2), notes: 'Discharge commenced 08:00 LT' },
  ] as const

  for (let i = 0; i < tlEvents.length; i++) {
    const ev = tlEvents[i]!
    await prisma.timelineEvent.upsert({
      where: { id: `tl-pc005-${i + 1}` },
      update: {},
      create: {
        id: `tl-pc005-${i + 1}`,
        tenantId: tenant.id,
        portCallId: 'pc-005',
        eventType: ev.eventType,
        occurredAt: ev.occurredAt,
        notes: ('notes' in ev ? ev.notes : null) ?? null,
        source: 'manual',
        isConfirmed: true,
        createdBy: SYSTEM,
        updatedBy: SYSTEM,
      },
    })
  }
  console.log('✓ Timeline events: 7 (for pc-005)')

  // ─── Tasks for appointed port call ────────────────────────────────────────
  const tasks = [
    { description: 'Order inbound pilotage — NOBRA Bar Pilots', status: 'DONE' },
    { description: 'Order inbound towage — Crescent Towing (2 tugs)', status: 'DONE' },
    { description: 'Coordinate berth at Burnside Terminal', status: 'IN_PROGRESS' },
    { description: 'File CBP advance notice of arrival', status: 'PENDING' },
    { description: 'Request crew list from master', status: 'PENDING' },
    { description: 'Send funding request to Pacific Basin', status: 'IN_PROGRESS' },
    { description: 'Coordinate draft survey — pre-discharge', status: 'PENDING' },
  ] as const

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]!
    await prisma.task.upsert({
      where: { id: `task-pc003-${i + 1}` },
      update: {},
      create: {
        id: `task-pc003-${i + 1}`,
        tenantId: tenant.id,
        portCallId: 'pc-003',
        description: t.description,
        status: t.status,
        assigneeId: 'user-op-001',
        createdBy: SYSTEM,
        updatedBy: SYSTEM,
      },
    })
  }
  console.log('✓ Tasks: 7 (for pc-003)')

  console.log('\n✅ Seed complete — 10 port calls across all 9 phases')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
