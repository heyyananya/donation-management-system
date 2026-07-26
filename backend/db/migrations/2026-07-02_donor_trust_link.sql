-- =====================================================================
-- Migration: Donor ↔ Trust access link
-- Date     : 2026-07-02
-- Target   : new `donor_trusts` join table + backfill from receipts
--
-- WHAT THIS DOES
--   1. Creates `donor_trusts (donor_id, trust_id)` — the trusts each donor
--      belongs to. Many-to-many; a donor can belong to multiple trusts.
--   2. Backfills existing donors by linking them to every trust they have
--      already issued a receipt under. Without this, existing donors
--      would appear "unassigned" and become invisible to trust-scoped
--      users after the app enforces the new visibility rule.
--
--   Idempotent: safe to re-run.
--
-- BEFORE RUNNING
--   1. Take a database backup (pg_dump).
--   2. Ensure you are connected to the correct database (Donation_Receipt).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. New join table (mirrors the shape of user_trusts).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donor_trusts (
  donor_id   UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  trust_id   UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (donor_id, trust_id)
);

CREATE INDEX IF NOT EXISTS donor_trusts_trust_idx ON donor_trusts (trust_id);

-- ---------------------------------------------------------------------
-- 2. Backfill from receipts. Every donor gets linked to each trust
--    they've historically issued a receipt under. Skips soft-deleted
--    receipts. Safe to re-run — the PK stops duplicate rows.
-- ---------------------------------------------------------------------
INSERT INTO donor_trusts (donor_id, trust_id)
SELECT DISTINCT r.donor_id, r.trust_id
FROM receipts r
WHERE r.deleted_at IS NULL
  AND r.is_status  = 1
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Sanity check (optional — comment out if running via psql -f).
--    Shows row counts so you can verify the backfill actually ran.
-- ---------------------------------------------------------------------
-- SELECT
--   (SELECT COUNT(*) FROM donors)       AS total_donors,
--   (SELECT COUNT(*) FROM donor_trusts) AS donor_trust_links,
--   (SELECT COUNT(DISTINCT donor_id) FROM donor_trusts) AS donors_linked;

COMMIT;
