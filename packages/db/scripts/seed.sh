#!/usr/bin/env bash
# seed.sh — Seed ShipOps demo data via Docker (works around Prisma P1010 bug)
# Usage: bash packages/db/scripts/seed.sh  (from monorepo root)
#        or: pnpm db:seed  (from packages/db/)
set -e

CONTAINER="shipops_db"
DB="shipops"
USER="shipops"

echo "🌱 Seeding ShipOps demo data via Docker..."

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "❌ Docker container '${CONTAINER}' is not running."
  echo "   Run: docker compose up -d"
  exit 1
fi

docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" << 'SQL'
-- ─── Tenant ──────────────────────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, clerk_org_id, subscription_tier, created_at, updated_at)
VALUES (
  'tenant-gca-001', 'Gulf Coast Agency Services', 'gulf-coast-agency',
  'org_demo_gca', 'professional', NOW(), NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- ─── Users ───────────────────────────────────────────────────────────────────
INSERT INTO users (id, clerk_user_id, email, first_name, last_name, default_tenant_id, created_at, updated_at)
VALUES
  ('user-op-001', 'user_demo_operator', 'ops@gulfcoastagency.com', 'James', 'Broussard', 'tenant-gca-001', NOW(), NOW()),
  ('user-mgr-001', 'user_demo_manager', 'mgr@gulfcoastagency.com', 'Sandra', 'Thibodaux', 'tenant-gca-001', NOW(), NOW())
ON CONFLICT (clerk_user_id) DO NOTHING;

-- ─── Ports ───────────────────────────────────────────────────────────────────
INSERT INTO ports (id, tenant_id, name, un_locode, country, state, created_at, updated_at)
VALUES
  ('port-mob-001', 'tenant-gca-001', 'Port of Mobile', 'USMOB', 'US', 'AL', NOW(), NOW()),
  ('port-nos-001', 'tenant-gca-001', 'Port of New Orleans', 'USNOL', 'US', 'LA', NOW(), NOW()),
  ('port-hrs-001', 'tenant-gca-001', 'Port of Houston', 'USHOU', 'US', 'TX', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ─── Terminals ───────────────────────────────────────────────────────────────
INSERT INTO terminals (id, tenant_id, port_id, name, created_at, updated_at)
VALUES
  ('term-mob-01', 'tenant-gca-001', 'port-mob-001', 'Alabama State Docks T-1', NOW(), NOW()),
  ('term-nos-01', 'tenant-gca-001', 'port-nos-001', 'Violet Terminal', NOW(), NOW()),
  ('term-hrs-01', 'tenant-gca-001', 'port-hrs-001', 'Barbours Cut Terminal', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ─── Principals ──────────────────────────────────────────────────────────────
INSERT INTO organizations (id, tenant_id, name, type, country, created_at, updated_at)
VALUES
  ('org-gmc-001', 'tenant-gca-001', 'Global Maritime Commodities Ltd', 'PRINCIPAL', 'GB', NOW(), NOW()),
  ('org-abt-001', 'tenant-gca-001', 'Atlantic Bulk Traders Inc', 'PRINCIPAL', 'US', NOW(), NOW()),
  ('org-psc-001', 'tenant-gca-001', 'Pacific Soybean Corp', 'PRINCIPAL', 'US', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ─── Vessels ─────────────────────────────────────────────────────────────────
INSERT INTO vessels (id, tenant_id, name, imo, mmsi, vessel_type, flag_state, dwt, gross_tonnage, created_at, updated_at)
VALUES
  ('ves-001', 'tenant-gca-001', 'MV Gulf Trader', '9234567', '338123456', 'BULK_CARRIER', 'US', 45000, 28000, NOW(), NOW()),
  ('ves-002', 'tenant-gca-001', 'MV Delta Spirit', '9345678', '338234567', 'BULK_CARRIER', 'MH', 72000, 40000, NOW(), NOW()),
  ('ves-003', 'tenant-gca-001', 'MV Southern Cross', '9456789', '538345678', 'GENERAL_CARGO', 'PA', 18000, 12000, NOW(), NOW()),
  ('ves-004', 'tenant-gca-001', 'MV Bayou Star', '9567890', '338456789', 'BULK_CARRIER', 'US', 55000, 32000, NOW(), NOW()),
  ('ves-005', 'tenant-gca-001', 'MV Mississippi Pride', '9678901', '338567890', 'BULK_CARRIER', 'MH', 63000, 37000, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ─── Port Calls (10 across all 9 phases) ─────────────────────────────────────
INSERT INTO port_calls (id, tenant_id, port_call_number, vessel_id, principal_id, port_id, terminal_id,
  phase, port_call_type, cargo_type, eta, etd, arrived_at, sailed_at, created_at, updated_at, created_by)
VALUES
  -- Phase 1: Proforma Estimated
  ('pc-001', 'tenant-gca-001', 'PC-2025-0001', 'ves-001', 'org-gmc-001', 'port-mob-001', 'term-mob-01',
   'PROFORMA_ESTIMATED', 'DISCHARGE', 'DRY_BULK',
   NOW() + INTERVAL '14 days', NOW() + INTERVAL '16 days', NULL, NULL, NOW(), NOW(), 'user-op-001'),
  -- Phase 2: Awaiting Appointment
  ('pc-002', 'tenant-gca-001', 'PC-2025-0002', 'ves-002', 'org-abt-001', 'port-nos-001', 'term-nos-01',
   'AWAITING_APPOINTMENT', 'LOAD', 'DRY_BULK',
   NOW() + INTERVAL '7 days', NOW() + INTERVAL '9 days', NULL, NULL, NOW(), NOW(), 'user-op-001'),
  -- Phase 3: Appointed
  ('pc-003', 'tenant-gca-001', 'PC-2025-0003', 'ves-003', 'org-psc-001', 'port-hrs-001', 'term-hrs-01',
   'APPOINTED', 'LOAD_DISCHARGE', 'DRY_BULK',
   NOW() + INTERVAL '3 days', NOW() + INTERVAL '5 days', NULL, NULL, NOW(), NOW(), 'user-op-001'),
  -- Phase 4a: Active
  ('pc-004', 'tenant-gca-001', 'PC-2025-0004', 'ves-004', 'org-gmc-001', 'port-mob-001', 'term-mob-01',
   'ACTIVE', 'DISCHARGE', 'DRY_BULK',
   NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day', NOW() - INTERVAL '2 days', NULL, NOW(), NOW(), 'user-op-001'),
  -- Phase 4b: Active
  ('pc-005', 'tenant-gca-001', 'PC-2025-0005', 'ves-005', 'org-abt-001', 'port-nos-001', 'term-nos-01',
   'ACTIVE', 'LOAD', 'DRY_BULK',
   NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', NOW() - INTERVAL '1 day', NULL, NOW(), NOW(), 'user-op-001'),
  -- Phase 5: Sailed
  ('pc-006', 'tenant-gca-001', 'PC-2025-0006', 'ves-001', 'org-psc-001', 'port-hrs-001', 'term-hrs-01',
   'SAILED', 'LOAD', 'DRY_BULK',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days', NOW(), NOW(), 'user-op-001'),
  -- Phase 6: Completed
  ('pc-007', 'tenant-gca-001', 'PC-2025-0007', 'ves-002', 'org-gmc-001', 'port-mob-001', 'term-mob-01',
   'COMPLETED', 'DISCHARGE', 'DRY_BULK',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '17 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '17 days', NOW(), NOW(), 'user-mgr-001'),
  -- Phase 7: Processing FDA
  ('pc-008', 'tenant-gca-001', 'PC-2025-0008', 'ves-003', 'org-abt-001', 'port-nos-001', 'term-nos-01',
   'PROCESSING_FDA', 'LOAD', 'DRY_BULK',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '27 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '27 days', NOW(), NOW(), 'user-mgr-001'),
  -- Phase 8: Awaiting Payment
  ('pc-009', 'tenant-gca-001', 'PC-2025-0009', 'ves-004', 'org-psc-001', 'port-hrs-001', 'term-hrs-01',
   'AWAITING_PAYMENT', 'DISCHARGE', 'DRY_BULK',
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '42 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '42 days', NOW(), NOW(), 'user-mgr-001'),
  -- Phase 9: Settled
  ('pc-010', 'tenant-gca-001', 'PC-2025-0010', 'ves-005', 'org-gmc-001', 'port-mob-001', 'term-mob-01',
   'SETTLED', 'LOAD', 'DRY_BULK',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '57 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '57 days', NOW(), NOW(), 'user-mgr-001')

ON CONFLICT DO NOTHING;

SELECT 'Seed complete: ' || COUNT(*)::text || ' port calls' AS result FROM port_calls WHERE tenant_id = 'tenant-gca-001';
SQL

echo "✅ Seed complete!"
