-- =====================================================================
-- Migration: User Master + per-trust access
-- Date     : 2026-06-29
-- Target   : `users` table, new `user_trusts` join table
--
-- WHAT THIS DOES
--   1. Adds an `email` column on users (optional, recorded in User Master).
--   2. Widens the role CHECK so users.role can be 'admin' OR 'user'.
--      ('admin' = unrestricted; 'user' = restricted by user_trusts.)
--   3. Creates `user_trusts (user_id, trust_id)` — the trusts a regular
--      user is allowed to see and operate on.
--
--   Idempotent: safe to re-run.
-- =====================================================================

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_ok;
ALTER TABLE users
  ADD CONSTRAINT users_role_ok CHECK (role IN ('admin','user'));

CREATE TABLE IF NOT EXISTS user_trusts (
  user_id    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  trust_id   UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, trust_id)
);
CREATE INDEX IF NOT EXISTS user_trusts_trust_idx ON user_trusts (trust_id);

COMMIT;
