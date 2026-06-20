import { pool } from '../config/db.js';

const counts = await pool.query(`
  SELECT table_name, action, COUNT(*)::int AS n
  FROM audit_logs
  GROUP BY table_name, action
  ORDER BY table_name, action
`);
console.log('--- audit_logs grouped by (table, action) ---');
for (const row of counts.rows) console.log(`  ${row.table_name.padEnd(10)} ${row.action.padEnd(8)} ${row.n}`);

const sample = await pool.query(`
  SELECT user_name, table_name, action, record_id,
         changed_at_date, changed_at_time,
         (after->>'name') AS after_name,
         (before->>'name') AS before_name
  FROM audit_logs
  ORDER BY changed_at DESC
  LIMIT 6
`);
console.log('\n--- 6 most recent audit_log entries ---');
for (const r of sample.rows) {
  const label = r.after_name || r.before_name || '(no name field)';
  console.log(`  ${r.changed_at_date} ${r.changed_at_time} | ${r.user_name} | ${r.action} ${r.table_name} -> ${label}`);
}
await pool.end();
