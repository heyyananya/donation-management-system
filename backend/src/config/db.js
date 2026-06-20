import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { env } from './env.js';

// DATE (1082) — keep raw YYYY-MM-DD string instead of pg's default Date-at-midnight.
pg.types.setTypeParser(1082, (v) => v);
// TIMESTAMPTZ (1184) — surface as ISO string so the API matches the JSON-driver shape.
pg.types.setTypeParser(1184, (v) => (v ? new Date(v).toISOString() : v));
// NUMERIC (1700) — parse to JS number; receipts.amount fits well under 2^53.
pg.types.setTypeParser(1700, (v) => (v == null ? v : Number(v)));

export const pool = new pg.Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => console.error('[pg pool error]', err));

// Request-scoped context, populated by the auth middleware with the logged-in
// admin's username so the postgres repos can attribute audit_log rows to a
// real user instead of the DB role.
export const requestContext = new AsyncLocalStorage();

export function currentUserName() {
  return requestContext.getStore()?.userName || 'system';
}

export async function q(text, params) {
  return pool.query(text, params);
}

// Run a function inside a transaction. The function receives a pg client and
// must use it (not the pool) for every query within the transaction.
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}
