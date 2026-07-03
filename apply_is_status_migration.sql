-- =====================================================================
-- Donation Management System Database Migration Script
-- Purpose : Add the is_status column to every master table (1 = active, 0 = deleted)
-- Date    : 2026-07-02
--
-- Instructions:
--   Run this script against your PostgreSQL database using psql or PgAdmin.
--   Example using CLI:
--     psql -U postgres -d Donation_Receipt -f apply_is_status_migration.sql
-- =====================================================================

BEGIN;

-- 1. trusts
ALTER TABLE trusts ADD COLUMN IF NOT EXISTS is_status INTEGER NOT NULL DEFAULT 1;
UPDATE trusts SET is_status = 0 WHERE deleted_at IS NOT NULL AND is_status != 0;

-- 2. donors
ALTER TABLE donors ADD COLUMN IF NOT EXISTS is_status INTEGER NOT NULL DEFAULT 1;
UPDATE donors SET is_status = 0 WHERE deleted_at IS NOT NULL AND is_status != 0;

-- 3. remarks
ALTER TABLE remarks ADD COLUMN IF NOT EXISTS is_status INTEGER NOT NULL DEFAULT 1;
UPDATE remarks SET is_status = 0 WHERE deleted_at IS NOT NULL AND is_status != 0;

-- 4. years
ALTER TABLE years ADD COLUMN IF NOT EXISTS is_status INTEGER NOT NULL DEFAULT 1;
UPDATE years SET is_status = 0 WHERE deleted_at IS NOT NULL AND is_status != 0;

-- 5. receipts
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS is_status INTEGER NOT NULL DEFAULT 1;
UPDATE receipts SET is_status = 0 WHERE deleted_at IS NOT NULL AND is_status != 0;

-- 6. users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_status INTEGER NOT NULL DEFAULT 1;
UPDATE users SET is_status = 0 WHERE deleted_at IS NOT NULL AND is_status != 0;

COMMIT;
