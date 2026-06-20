import pg from 'pg';
import { env } from '../config/env.js';

const client = new pg.Client({
  host: env.db.host,
  port: env.db.port,
  database: 'postgres', // connect to the default db just to list others
  user: env.db.user,
  password: env.db.password,
});

await client.connect();
const r = await client.query(`SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`);
console.log('Databases:');
for (const row of r.rows) console.log(' -', JSON.stringify(row.datname));
await client.end();
