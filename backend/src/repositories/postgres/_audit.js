import { currentUserName } from '../../config/db.js';

// Append a row to audit_logs within an existing transaction client. Pass the
// camelCase snapshots so the JSONB columns stay consistent with the API shape.
export async function logAudit(client, { table, recordId, action, before, after }) {
  await client.query(
    `INSERT INTO audit_logs (user_name, table_name, record_id, action, before, after)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      currentUserName(),
      table,
      recordId,
      action,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
    ]
  );
}
