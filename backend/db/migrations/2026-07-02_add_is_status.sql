-- =====================================================================
-- Migration: Add is_status column to all primary tables
-- Date     : 2026-07-02
-- Target   : trusts, donors, remarks, years, receipts, users tables
--
-- WHAT THIS DOES
--   Adds is_status column to: trusts, donors, remarks, years, receipts, users
--   If a row is deleted (deleted_at IS NOT NULL), sets is_status to 0.
--   If a row is active (deleted_at IS NULL), sets is_status to 1 (default).
--
--   Idempotent: safe to re-run.
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
