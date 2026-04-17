# Restore Point — Schema v2 Complete
Created: 2026-03-18
Label: schema-v2-complete
Status: Prisma schema validated ✅

## What Changed in This Session (schema additions)
All additions to packages/db/prisma/schema.prisma — schema validated clean.

### New enums added
- FileStatus: ACTIVE | ON_HOLD | CANCELLED
- AccountStatus: ACTIVE | ON_HOLD | WATCH | BLACKLIST
- TerminalType: BULK_DRY | CONTAINER | GENERAL_CARGO | RO_RO | etc.
- VendorServiceCategory: PILOTAGE | TOWAGE | STEVEDORING | etc.
- FeeType: FIXED_LUMP_SUM | PERCENTAGE_OF_DA | PER_UNIT_CARGO | etc.
- CargoGroup: DRY_BULK | BREAK_BULK | TANKER_CLEAN | etc.
- UserRole expanded: AGENT_JUNIOR | AGENT_FULL | ACCOUNTING | FORWARDING | MANAGER | EXECUTIVE | ANALYST | ADMIN | CUSTOMER

### New models added
- Office — branch offices (NOL/HOU/MOB) with tenantId, code, city, contact info
- OfficePort — junction: which ports each office covers (with isPrimary flag)
- PortVendor — preferred vendors per port by service category
- FeeAgreement — agreed fee structures per org/office/port

### Models expanded
- Port: added isForeign, scheduleKCode, cbpCode, lat/lon, notes, officePorts/portVendors relations
- Terminal: added terminalType enum, berthNumbers, maxDraftM, maxLoaM, maxDwt, operator
- Organization: added accountStatus, holdReason, warnNote, kycStatus/reviewedAt/reviewedBy, canBeNominator, notes, creditLimitCents
- PortCall: added officeId, fileStatus, cargoGroup, chartererId, nominatorId, parentPortCallId/isSubFile, anchorageArea, norTenderedAt/norAcceptedAt/allFastAt, voyageNumber, externalRef, charterPartyDate, agencyFeeCents, proforma/actual/fundedTotalCents, fdaRenderedAt/ApprovedAt/By, settledAt, holdReason, assignedAgentId
- User: role default changed to AGENT_FULL, officeId now properly scoped

## Key Architectural Decisions Locked In
- Office → OfficePort → Port cascade: office-scoped port lookups
- Sub-files: parentPortCallId + isSubFile on PortCall (siblings, not nested)
- Ring-fenced voyage finance: proforma/actual/funded cents on PortCall, separate from company accounting
- Storage-agnostic documents: storageKey pointer, swap adapter later
- FeeAgreement: per org/office/port, auto-populates agency fee on new port call
- AuditLog before/after Json: only legitimate Json use — audit snapshots, not business data
- All money in cents (Int), all timestamps UTC

## Next Steps
1. Write migration SQL for new tables/columns
2. Seed offices, office_ports with real data
3. Seed terminals for Gulf Coast ports
4. Seed port_vendors with known Gulf Coast vendors
5. Wire AutoOpenModal to real DB (port/terminal dropdowns from DB)
6. Build port call detail page tabs
