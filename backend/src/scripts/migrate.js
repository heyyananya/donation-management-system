import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../../db/schema.sql');

if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found: ${schemaPath}`);
  process.exit(1);
}

console.log(`[migrate] target: ${env.db.user}@${env.db.host}:${env.db.port}/${env.db.database}`);

// Step 1: ensure the target database exists. Connect to the default `postgres`
// admin db and CREATE DATABASE if needed. Identifier is quoted to preserve case.
const admin = new pg.Client({
  host: env.db.host,
  port: env.db.port,
  database: 'postgres',
  user: env.db.user,
  password: env.db.password,
});

try {
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [env.db.database]);
  if (exists.rowCount === 0) {
    console.log(`[migrate] database "${env.db.database}" not found — creating it.`);
    // pg parameterised queries don't substitute identifiers; quote+escape manually.
    const safe = env.db.database.replace(/"/g, '""');
    await admin.query(`CREATE DATABASE "${safe}"`);
    console.log(`[migrate] database created.`);
  } else {
    console.log(`[migrate] database already exists.`);
  }
} catch (err) {
  console.error('[migrate] FAILED while preparing database:', err.message);
  await admin.end();
  process.exit(1);
}
await admin.end();

// Step 2: apply schema.sql to the target database.
const target = new pg.Client({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
});

const sql = fs.readFileSync(schemaPath, 'utf8');

try {
  await target.connect();
  console.log(`[migrate] applying ${path.basename(schemaPath)}`);
  await target.query(sql);
  console.log('[migrate] schema applied successfully.');
} catch (err) {
  console.error('[migrate] FAILED while applying schema:', err.message);
  process.exitCode = 1;
} finally {
  await target.end();
}
