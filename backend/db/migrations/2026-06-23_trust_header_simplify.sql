-- =====================================================================
-- Migration: Simplify trust header storage
-- Date     : 2026-06-23
-- Target   : `trusts` table
--
-- WHAT THIS DOES
--   The whole printed header (registration text, unit text, phone, 80G,
--   PAN, etc.) is now stored verbatim in `correspondence_address` as
--   multi-line text. The dedicated header columns are removed.
--
--   This script is idempotent: safe to run multiple times, and safe on
--   both the original initial-commit schema AND any partially-migrated
--   installation.
--
-- BEFORE RUNNING
--   1. Take a database backup (pg_dump).
--   2. If any production rows still have data in the columns we are
--      about to drop and you want to preserve it inside
--      `correspondence_address`, run the optional MERGE block first
--      (commented out below) -- review it before uncommenting.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- (Optional) Preserve legacy header columns into correspondence_address
-- Uncomment if you want existing data folded into the new single field.
-- ---------------------------------------------------------------------
-- UPDATE trusts SET correspondence_address = TRIM(BOTH E'\n' FROM
--   COALESCE(NULLIF(registration_text, ''), '') ||
--   CASE WHEN COALESCE(unit_text,'')        <> '' THEN E'\n' || unit_text        ELSE '' END ||
--   CASE WHEN COALESCE(correspondence_address,'') <> '' THEN E'\n\n' || correspondence_address ELSE '' END ||
--   CASE WHEN COALESCE(phone,'')            <> '' THEN E'\n\nPhone: ' || phone   ELSE '' END ||
--   CASE WHEN COALESCE(pan_text,'')         <> '' THEN E'\n' || pan_text         ELSE '' END ||
--   CASE WHEN COALESCE(eighty_g_text,'')    <> '' THEN E'\n\n' || eighty_g_text  ELSE '' END
-- )
-- WHERE COALESCE(registration_text,'') <> ''
--    OR COALESCE(unit_text,'')         <> ''
--    OR COALESCE(phone,'')             <> ''
--    OR COALESCE(pan_text,'')          <> ''
--    OR COALESCE(eighty_g_text,'')     <> '';

-- ---------------------------------------------------------------------
-- 1. Re-add Identity columns that some older schemas had dropped.
--    (PDF renderers still use only name, logo, and correspondence_address,
--    but these are kept for record-keeping in Trust Master.)
-- ---------------------------------------------------------------------
ALTER TABLE trusts
  ADD COLUMN IF NOT EXISTS trust_type     TEXT,
  ADD COLUMN IF NOT EXISTS area           TEXT,
  ADD COLUMN IF NOT EXISTS taluka         TEXT,
  ADD COLUMN IF NOT EXISTS district       TEXT,
  ADD COLUMN IF NOT EXISTS sanchalan      TEXT,
  ADD COLUMN IF NOT EXISTS establish_date DATE,
  ADD COLUMN IF NOT EXISTS contact_number TEXT,
  ADD COLUMN IF NOT EXISTS address        TEXT;

-- ---------------------------------------------------------------------
-- 2. Drop the legacy header columns and the PAN-format constraint.
-- ---------------------------------------------------------------------
ALTER TABLE trusts
  DROP CONSTRAINT IF EXISTS trusts_pan_format,
  DROP COLUMN     IF EXISTS registration_number,
  DROP COLUMN     IF EXISTS registration_text,
  DROP COLUMN     IF EXISTS unit_text,
  DROP COLUMN     IF EXISTS phone,
  DROP COLUMN     IF EXISTS eighty_g_text,
  DROP COLUMN     IF EXISTS pan,
  DROP COLUMN     IF EXISTS pan_text,
  DROP COLUMN     IF EXISTS letter_address_lines,
  DROP COLUMN     IF EXISTS footer_information;

-- ---------------------------------------------------------------------
-- 3. Verify the resulting column set.
--    Expected columns:
--      id, name, trust_type, area, taluka, district, sanchalan,
--      establish_date, contact_number, address, correspondence_address,
--      logo_file_name, created_at, updated_at
-- ---------------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'trusts' ORDER BY ordinal_position;

COMMIT;
