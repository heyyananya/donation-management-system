# PostgreSQL schema

Single SQL file ([schema.sql](schema.sql)) defining the six tables the
Donation Management System uses: `trusts`, `donors`, `remarks`, `years`,
`receipts`, and `audit_logs`.

## Apply to your database

You already have a database named `Donation_Receipt`. Run:

```bash
psql -U postgres -d Donation_Receipt -f backend/db/schema.sql
```

The script is idempotent — every `CREATE` uses `IF NOT EXISTS`, so it is
safe to re-run after schema tweaks.

## Tables

| Table         | Purpose                                                                                |
| ------------- | -------------------------------------------------------------------------------------- |
| `trusts`      | Trust Master — registration, header, footer details printed on receipts/letters        |
| `donors`      | Donor Master — identity, contact, document attachments (JSONB)                         |
| `remarks`     | Remark Master — predefined donation purposes                                           |
| `years`       | Year Master — financial years; `is_active = true` accepts new receipts                 |
| `receipts`    | Donation receipts — unique on `(financial_year, trust_id, number)`                     |
| `audit_logs`  | Who-changed-what log; rows are appended by the application layer                       |

Format and integrity rules (PAN regex, mobile/Aadhaar shape, payment-type
enum, `start_date < end_date`, etc.) are enforced as `CHECK` constraints in
SQL so they hold regardless of which client writes to the database.

## Receipt numbering rule

`receipts.number` is unique within each `(financial_year, trust_id)` pair, so
each Trust × FY gets its own independent sequence starting at 1. The
application layer assigns the next number under an in-process mutex; if you
ever load receipts from multiple processes concurrently, wrap the insert in a
`SELECT ... FOR UPDATE` on the matching `(year, trust)` rows or move to a
sequence keyed by `(year, trust)`.

## Audit log

Designed to capture what the requirement asks for — "who changed it, what is
changed, time of change, date of change":

| Column            | What it stores                                                                    |
| ----------------- | --------------------------------------------------------------------------------- |
| `user_name`       | The logged-in user that made the change (taken from the JWT, not the DB role)     |
| `table_name`      | `'donors'`, `'trusts'`, `'remarks'`, `'years'`, or `'receipts'`                    |
| `record_id`       | Primary key of the affected row                                                   |
| `action`          | `'create'`, `'update'`, or `'delete'`                                              |
| `before`          | JSONB snapshot of the row before the change (NULL for `create`)                   |
| `after`           | JSONB snapshot of the row after the change (NULL for `delete`)                    |
| `changed_at_date` | The calendar date the change happened (denormalised for fast date-range queries)  |
| `changed_at_time` | The time of day the change happened                                               |
| `changed_at`      | Full `timestamptz` — the source of truth for sorting                              |

Indices on `(table_name, record_id)`, `(changed_at DESC)`, and `user_name`
cover the three usual access patterns: "history of this row", "what happened
recently", and "what did this user do".

## Wiring it to the Node app

The repository pattern in [`backend/src/repositories/index.js`](../src/repositories/index.js)
already has a postgres slot — when you implement
[`backend/src/repositories/postgres/*Repo.js`](../src/repositories/postgres/)
you can switch by setting `REPO_DRIVER=postgres` in `.env`. The audit log is
populated by the application layer (so `user_name` reflects the logged-in
admin, not the DB role): every postgres repo's `create` / `update` / `remove`
should `INSERT` a corresponding row into `audit_logs` inside the same
transaction.
