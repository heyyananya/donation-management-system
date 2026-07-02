-- =====================================================================
-- Donation Management System -- PostgreSQL schema
-- Database name (per ops): Donation_Receipt
--
-- Apply with:
--   psql -U postgres -d Donation_Receipt -f backend/db/schema.sql
-- =====================================================================

-- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- TRUST MASTER
-- The whole printed header (registration text, unit text, phone, 80G,
-- PAN, etc.) is stored verbatim in `correspondence_address` as
-- multi-line text -- nothing else is needed for the Receipt / Thanks
-- Letter header.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trusts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT        NOT NULL,
  trust_type             TEXT,
  area                   TEXT,
  taluka                 TEXT,
  district               TEXT,
  sanchalan              TEXT,
  establish_date         DATE,
  contact_number         TEXT,
  address                TEXT,
  correspondence_address TEXT,
  logo_file_name         TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trusts_name_idx ON trusts (lower(name));

-- For older installations that had the previous narrowed schema, re-add the
-- Identity columns. These are for record-keeping in Trust Master only — the
-- PDF renderers still use only name, logo, and correspondence_address.
ALTER TABLE trusts
  ADD COLUMN IF NOT EXISTS trust_type     TEXT,
  ADD COLUMN IF NOT EXISTS area           TEXT,
  ADD COLUMN IF NOT EXISTS taluka         TEXT,
  ADD COLUMN IF NOT EXISTS district       TEXT,
  ADD COLUMN IF NOT EXISTS sanchalan      TEXT,
  ADD COLUMN IF NOT EXISTS establish_date DATE,
  ADD COLUMN IF NOT EXISTS contact_number TEXT,
  ADD COLUMN IF NOT EXISTS address        TEXT;

-- Drop genuinely-removed legacy header columns from very old installations.
ALTER TABLE trusts
  DROP CONSTRAINT IF EXISTS trusts_pan_format,
  DROP COLUMN IF EXISTS registration_number,
  DROP COLUMN IF EXISTS registration_text,
  DROP COLUMN IF EXISTS unit_text,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS eighty_g_text,
  DROP COLUMN IF EXISTS pan,
  DROP COLUMN IF EXISTS pan_text,
  DROP COLUMN IF EXISTS letter_address_lines,
  DROP COLUMN IF EXISTS footer_information;

-- ---------------------------------------------------------------------
-- DONOR MASTER
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  mobile      VARCHAR(10) NOT NULL,
  pan         VARCHAR(10),
  aadhaar     VARCHAR(12),
  voter_id    VARCHAR(20),
  passport    TEXT,
  address     TEXT,
  documents   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT donors_mobile_format  CHECK (mobile ~ '^[0-9]{10}$'),
  CONSTRAINT donors_pan_format     CHECK (pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  CONSTRAINT donors_aadhaar_format CHECK (aadhaar IS NULL OR aadhaar ~ '^[0-9]{12}$')
);
CREATE INDEX IF NOT EXISTS donors_name_idx   ON donors (lower(name));
CREATE INDEX IF NOT EXISTS donors_mobile_idx ON donors (mobile);

-- For older installations created before Voter ID was added as a donor
-- identity field.
ALTER TABLE donors ADD COLUMN IF NOT EXISTS voter_id VARCHAR(20);

-- ---------------------------------------------------------------------
-- REMARK MASTER
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS remarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- YEAR MASTER
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS years (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(10) NOT NULL UNIQUE,    -- "2025-26"
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT years_name_format CHECK (name ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT years_date_order  CHECK (start_date < end_date)
);

-- ---------------------------------------------------------------------
-- DONATION RECEIPT
--
-- (financial_year, trust_id, number) is the business identity — receipt
-- numbers restart at 1 for every (FY, Trust) pair.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receipts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_year      VARCHAR(10)    NOT NULL REFERENCES years(name)    ON UPDATE CASCADE,
  trust_id            UUID           NOT NULL REFERENCES trusts(id)     ON DELETE RESTRICT,
  donor_id            UUID           NOT NULL REFERENCES donors(id)     ON DELETE RESTRICT,
  remark_id           UUID                    REFERENCES remarks(id)    ON DELETE SET NULL,
  number              INTEGER        NOT NULL,
  date                DATE           NOT NULL,
  amount              NUMERIC(14,2)  NOT NULL,
  payment_type        TEXT           NOT NULL,
  remarks             TEXT,
  cheque_number       TEXT,
  cheque_date         DATE,
  bank_name           TEXT,
  transaction_number  TEXT,
  transaction_date    DATE,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT receipts_amount_positive  CHECK (amount > 0),
  CONSTRAINT receipts_number_positive  CHECK (number > 0),
  CONSTRAINT receipts_payment_type_ok  CHECK (payment_type IN ('Cash','Cheque','NEFT','RTGS','IMPS','UPI','Bank Transfer','Demand Draft')),
  CONSTRAINT receipts_unique_sequence  UNIQUE (financial_year, trust_id, number)
);
CREATE INDEX IF NOT EXISTS receipts_donor_idx ON receipts (donor_id);
CREATE INDEX IF NOT EXISTS receipts_trust_idx ON receipts (trust_id);
CREATE INDEX IF NOT EXISTS receipts_year_idx  ON receipts (financial_year);
CREATE INDEX IF NOT EXISTS receipts_date_idx  ON receipts (date DESC);

-- ---------------------------------------------------------------------
-- USERS (logins)
--
-- Password is stored as a bcrypt hash, never the plaintext. Authentication
-- looks the row up by `username` and verifies the hash with bcryptjs.
--
-- role: 'admin' has unrestricted access (including User Master). 'user' is
-- a regular operator whose trust visibility is gated by the `user_trusts`
-- join below.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  display_name  TEXT,
  email         TEXT,
  role          TEXT        NOT NULL DEFAULT 'admin',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_role_ok CHECK (role IN ('admin','user'))
);
CREATE INDEX IF NOT EXISTS users_username_idx ON users (lower(username));

-- Older installations may still have the legacy single-value role check.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_ok;
ALTER TABLE users
  ADD CONSTRAINT users_role_ok CHECK (role IN ('admin','user'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

-- ---------------------------------------------------------------------
-- USER ↔ TRUST ACCESS
--
-- For role='user' rows, list the trusts they may see / operate on. An admin
-- is unrestricted regardless of what's in here.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_trusts (
  user_id    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  trust_id   UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, trust_id)
);
CREATE INDEX IF NOT EXISTS user_trusts_trust_idx ON user_trusts (trust_id);

-- ---------------------------------------------------------------------
-- AUDIT LOG
--
-- One row per business mutation. Populated by the application layer so the
-- user_name is the actual logged-in user, not the database role.
--
--   user_name       who made the change
--   table_name      which entity (e.g. 'donors', 'receipts', 'trusts', 'years', 'remarks')
--   record_id       the affected row's id
--   action          'create' | 'update' | 'delete'
--   before / after  JSON snapshots; for 'create', before is NULL;
--                   for 'delete', after is NULL; for 'update', both populated
--   changed_at_date date the change happened
--   changed_at_time time of day the change happened
--   changed_at      full timestamp (timezone-aware) — source of truth for sorting
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name        TEXT        NOT NULL,
  table_name       TEXT        NOT NULL,
  record_id        UUID,
  action           TEXT        NOT NULL,
  before           JSONB,
  after            JSONB,
  changed_at_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  changed_at_time  TIME        NOT NULL DEFAULT CURRENT_TIME,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_action_ok CHECK (action IN ('create','update','delete'))
);
CREATE INDEX IF NOT EXISTS audit_logs_table_record_idx ON audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS audit_logs_changed_at_idx   ON audit_logs (changed_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx         ON audit_logs (user_name);

-- ---------------------------------------------------------------------
-- updated_at touch-trigger -- keeps updated_at honest on every UPDATE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['trusts','donors','remarks','years','receipts','users']) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I_touch_updated_at ON %I;
       CREATE TRIGGER %I_touch_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION touch_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;
