-- ============================================================
-- Datum Maritime Agency — Offices & Users Seed
-- Run: docker exec -i shipops_db psql -U shipops -d shipops < seed_offices_users.sql
-- ============================================================

-- ─── 1. Expand UserRole enum (each statement is its own transaction) ──────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'AGENT_JUNIOR') THEN
    ALTER TYPE "UserRole" ADD VALUE 'AGENT_JUNIOR';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'AGENT_FULL') THEN
    ALTER TYPE "UserRole" ADD VALUE 'AGENT_FULL';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'FORWARDING') THEN
    ALTER TYPE "UserRole" ADD VALUE 'FORWARDING';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'EXECUTIVE') THEN
    ALTER TYPE "UserRole" ADD VALUE 'EXECUTIVE';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'ANALYST') THEN
    ALTER TYPE "UserRole" ADD VALUE 'ANALYST';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'CUSTOMER') THEN
    ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';
  END IF;
END $$;

-- ─── 2. Add missing columns to offices ───────────────────────────────────────

ALTER TABLE offices
  ADD COLUMN IF NOT EXISTS city       TEXT,
  ADD COLUMN IF NOT EXISTS state      TEXT,
  ADD COLUMN IF NOT EXISTS country    TEXT NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS address    TEXT,
  ADD COLUMN IF NOT EXISTS zip        TEXT,
  ADD COLUMN IF NOT EXISTS phone      TEXT,
  ADD COLUMN IF NOT EXISTS email      TEXT,
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── 3. Add missing columns to users ─────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS title        TEXT,
  ADD COLUMN IF NOT EXISTS cell_phone   TEXT,
  ADD COLUMN IF NOT EXISTS direct_email TEXT;

-- ─── 4. Seed offices ─────────────────────────────────────────────────────────

BEGIN;

INSERT INTO offices (id, tenant_id, code, name, address, city, state, zip, phone, email, country, is_active)
VALUES
  ('office-hq-001',  'tenant-gca-001', 'HQ',  'Datum Maritime — Headquarters',
   '1234 Main Street, Suite 100',        'Houston',     'TX', '77002', '(713) 555-0100', 'hq@datummaritime.com',          'US', true),

  ('office-doc-001', 'tenant-gca-001', 'DOC', 'Datum Maritime — Documentation Center',
   '1234 Main Street, Suite 110',        'Houston',     'TX', '77002', '(713) 555-0110', 'docs@datummaritime.com',         'US', true),

  ('office-hou-001', 'tenant-gca-001', 'HOU', 'Datum Maritime — Houston',
   '1234 Houston Blvd, Suite 123',       'Houston',     'TX', '77011', '(713) 555-0200', 'houston@datummaritime.com',      'US', true),

  ('office-nol-001', 'tenant-gca-001', 'NOL', 'Datum Maritime — New Orleans',
   '400 Poydras Street, Suite 800',      'New Orleans', 'LA', '70130', '(504) 555-0300', 'neworleans@datummaritime.com',   'US', true),

  ('office-por-001', 'tenant-gca-001', 'POR', 'Datum Maritime — Portland',
   '1 SW Columbia Street, Suite 400',    'Portland',    'OR', '97258', '(503) 555-0400', 'portland@datummaritime.com',     'US', true),

  ('office-nor-001', 'tenant-gca-001', 'NOR', 'Datum Maritime — Norfolk',
   '101 W. Main Street, Suite 500',      'Norfolk',     'VA', '23510', '(757) 555-0500', 'norfolk@datummaritime.com',      'US', true),

  ('office-mob-001', 'tenant-gca-001', 'MOB', 'Datum Maritime — Mobile',
   '11 N. Water Street, Suite 200',      'Mobile',      'AL', '36602', '(251) 555-0600', 'mobile@datummaritime.com',       'US', true)

ON CONFLICT (tenant_id, code) DO UPDATE SET
  name       = EXCLUDED.name,
  address    = EXCLUDED.address,
  city       = EXCLUDED.city,
  state      = EXCLUDED.state,
  zip        = EXCLUDED.zip,
  phone      = EXCLUDED.phone,
  email      = EXCLUDED.email,
  updated_at = now();

-- ─── 5. Seed users ────────────────────────────────────────────────────────────
-- approval_tier_limit in cents:
--   ADMIN / unlimited = 99999999
--   EXECUTIVE         = 0  (read only)
--   MANAGER           = 1000000  ($10,000)
--   ACCOUNTING        = 500000   ($5,000)
--   AGENT_FULL        = 250000   ($2,500)
--   FORWARDING        = 100000   ($1,000)
--   AGENT_JUNIOR      = 0

INSERT INTO users (id, tenant_id, office_id, clerk_user_id, name, email, direct_email, cell_phone, title, role, approval_tier_limit, created_by, updated_by)
VALUES

-- HQ ──────────────────────────────────────────────────────────────────────────
  ('user-hq-ceo', 'tenant-gca-001', 'office-hq-001', 'seed_hq_ceo',
   'Robert Datum',   'r.datum@datummaritime.com',    'r.datum@datummaritime.com',    '(713) 555-0101',
   'Chief Executive Officer',   'ADMIN',     99999999, 'system', 'system'),

  ('user-hq-coo', 'tenant-gca-001', 'office-hq-001', 'seed_hq_coo',
   'Sandra Marlowe', 's.marlowe@datummaritime.com',  's.marlowe@datummaritime.com',  '(713) 555-0102',
   'Chief Operating Officer',   'EXECUTIVE', 0,        'system', 'system'),

  ('user-hq-cfo', 'tenant-gca-001', 'office-hq-001', 'seed_hq_cfo',
   'James Okafor',   'j.okafor@datummaritime.com',   'j.okafor@datummaritime.com',   '(713) 555-0103',
   'Chief Financial Officer',   'EXECUTIVE', 0,        'system', 'system'),

  ('user-hq-ana', 'tenant-gca-001', 'office-hq-001', 'seed_hq_ana',
   'Maria Chen',     'm.chen@datummaritime.com',      'm.chen@datummaritime.com',      '(713) 555-0104',
   'Senior Analyst',            'ANALYST',   0,        'system', 'system'),

-- Documentation Center ────────────────────────────────────────────────────────
  ('user-doc-mgr', 'tenant-gca-001', 'office-doc-001', 'seed_doc_mgr',
   'Patricia Nguyen','p.nguyen@datummaritime.com',   'p.nguyen@datummaritime.com',   '(713) 555-0111',
   'Documentation Manager',     'MANAGER',   1000000,  'system', 'system'),

  ('user-doc-001', 'tenant-gca-001', 'office-doc-001', 'seed_doc_001',
   'Kevin Broussard','k.broussard@datummaritime.com','k.broussard@datummaritime.com','(713) 555-0112',
   'Documentation Specialist',  'ACCOUNTING',500000,   'system', 'system'),

  ('user-doc-002', 'tenant-gca-001', 'office-doc-001', 'seed_doc_002',
   'Alicia Tran',    'a.tran@datummaritime.com',      'a.tran@datummaritime.com',      '(713) 555-0113',
   'Forwarding Coordinator',    'FORWARDING',100000,   'system', 'system'),

-- Houston ─────────────────────────────────────────────────────────────────────
  ('user-hou-mgr', 'tenant-gca-001', 'office-hou-001', 'seed_hou_mgr',
   'David Harrington','d.harrington@datummaritime.com','d.harrington@datummaritime.com','(713) 555-0201',
   'Operations Manager',        'MANAGER',   1000000,  'system', 'system'),

  ('user-hou-ag1', 'tenant-gca-001', 'office-hou-001', 'seed_hou_ag1',
   'Carlos Mendez',  'c.mendez@datummaritime.com',   'c.mendez@datummaritime.com',   '(713) 555-0202',
   'Port Agent',                'AGENT_FULL',250000,   'system', 'system'),

  ('user-hou-ag2', 'tenant-gca-001', 'office-hou-001', 'seed_hou_ag2',
   'Rachel Kim',     'r.kim@datummaritime.com',       'r.kim@datummaritime.com',       '(713) 555-0203',
   'Port Agent',                'AGENT_FULL',250000,   'system', 'system'),

  ('user-hou-ag3', 'tenant-gca-001', 'office-hou-001', 'seed_hou_ag3',
   'Tyler Fontenot', 't.fontenot@datummaritime.com', 't.fontenot@datummaritime.com', '(713) 555-0204',
   'Junior Port Agent',         'AGENT_JUNIOR',0,      'system', 'system'),

-- New Orleans ─────────────────────────────────────────────────────────────────
  ('user-nol-mgr', 'tenant-gca-001', 'office-nol-001', 'seed_nol_mgr',
   'William Davis',  'w.davis@datummaritime.com',    'w.davis@datummaritime.com',    '(504) 555-0301',
   'Operations Manager',        'MANAGER',   1000000,  'system', 'system'),

  ('user-nol-ag1', 'tenant-gca-001', 'office-nol-001', 'seed_nol_ag1',
   'Michelle Tureaud','m.tureaud@datummaritime.com', 'm.tureaud@datummaritime.com', '(504) 555-0302',
   'Port Agent',                'AGENT_FULL',250000,   'system', 'system'),

  ('user-nol-ag2', 'tenant-gca-001', 'office-nol-001', 'seed_nol_ag2',
   'Brandon LeBlanc','b.leblanc@datummaritime.com',  'b.leblanc@datummaritime.com',  '(504) 555-0303',
   'Port Agent',                'AGENT_FULL',250000,   'system', 'system'),

  ('user-nol-ag3', 'tenant-gca-001', 'office-nol-001', 'seed_nol_ag3',
   'Jasmine Boudreaux','j.boudreaux@datummaritime.com','j.boudreaux@datummaritime.com','(504) 555-0304',
   'Junior Port Agent',         'AGENT_JUNIOR',0,      'system', 'system'),

-- Portland ────────────────────────────────────────────────────────────────────
  ('user-por-mgr', 'tenant-gca-001', 'office-por-001', 'seed_por_mgr',
   'Nancy Erikson',  'n.erikson@datummaritime.com',  'n.erikson@datummaritime.com',  '(503) 555-0401',
   'Operations Manager',        'MANAGER',   1000000,  'system', 'system'),

  ('user-por-ag1', 'tenant-gca-001', 'office-por-001', 'seed_por_ag1',
   'Derek Walsh',    'd.walsh@datummaritime.com',     'd.walsh@datummaritime.com',     '(503) 555-0402',
   'Port Agent',                'AGENT_FULL',250000,   'system', 'system'),

  ('user-por-ag2', 'tenant-gca-001', 'office-por-001', 'seed_por_ag2',
   'Stephanie Yamamoto','s.yamamoto@datummaritime.com','s.yamamoto@datummaritime.com','(503) 555-0403',
   'Port Agent',                'AGENT_FULL',250000,   'system', 'system'),

  ('user-por-ag3', 'tenant-gca-001', 'office-por-001', 'seed_por_ag3',
   'Marcus Webb',    'm.webb@datummaritime.com',      'm.webb@datummaritime.com',      '(503) 555-0404',
   'Junior Port Agent',         'AGENT_JUNIOR',0,      'system', 'system'),

-- Norfolk ─────────────────────────────────────────────────────────────────────
  ('user-nor-mgr', 'tenant-gca-001', 'office-nor-001', 'seed_nor_mgr',
   'Thomas Whitfield','t.whitfield@datummaritime.com','t.whitfield@datummaritime.com','(757) 555-0501',
   'Operations Manager',        'MANAGER',   1000000,  'system', 'system'),

  ('user-nor-ag1', 'tenant-gca-001', 'office-nor-001', 'seed_nor_ag1',
   'Denise Cartwright','d.cartwright@datummaritime.com','d.cartwright@datummaritime.com','(757) 555-0502',
   'Port Agent',                'AGENT_FULL',250000,   'system', 'system'),

  ('user-nor-ag2', 'tenant-gca-001', 'office-nor-001', 'seed_nor_ag2',
   'Jonah Perez',    'j.perez@datummaritime.com',     'j.perez@datummaritime.com',     '(757) 555-0503',
   'Port Agent',                'AGENT_FULL',250000,   'system', 'system'),

  ('user-nor-ag3', 'tenant-gca-001', 'office-nor-001', 'seed_nor_ag3',
   'Amber Kowalski', 'a.kowalski@datummaritime.com',  'a.kowalski@datummaritime.com',  '(757) 555-0504',
   'Junior Port Agent',         'AGENT_JUNIOR',0,      'system', 'system'),

-- Mobile ──────────────────────────────────────────────────────────────────────
  ('user-mob-mgr', 'tenant-gca-001', 'office-mob-001', 'seed_mob_mgr',
   'Gregory Simmons','g.simmons@datummaritime.com',  'g.simmons@datummaritime.com',  '(251) 555-0601',
   'Operations Manager',        'MANAGER',   1000000,  'system', 'system'),

  ('user-mob-ag1', 'tenant-gca-001', 'office-mob-001', 'seed_mob_ag1',
   'Latoya Marshall','l.marshall@datummaritime.com',  'l.marshall@datummaritime.com',  '(251) 555-0602',
   'Port Agent',                'AGENT_FULL',250000,   'system', 'system'),

  ('user-mob-ag2', 'tenant-gca-001', 'office-mob-001', 'seed_mob_ag2',
   'Patrick Delacroix','p.delacroix@datummaritime.com','p.delacroix@datummaritime.com','(251) 555-0603',
   'Port Agent',                'AGENT_FULL',250000,   'system', 'system'),

  ('user-mob-ag3', 'tenant-gca-001', 'office-mob-001', 'seed_mob_ag3',
   'Courtney Odom',  'c.odom@datummaritime.com',      'c.odom@datummaritime.com',      '(251) 555-0604',
   'Junior Port Agent',         'AGENT_JUNIOR',0,      'system', 'system')

ON CONFLICT (id) DO UPDATE SET
  name                = EXCLUDED.name,
  title               = EXCLUDED.title,
  role                = EXCLUDED.role,
  cell_phone          = EXCLUDED.cell_phone,
  direct_email        = EXCLUDED.direct_email,
  approval_tier_limit = EXCLUDED.approval_tier_limit,
  updated_by          = 'system';

COMMIT;
