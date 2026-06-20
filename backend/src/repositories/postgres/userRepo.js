import { v4 as uuid } from 'uuid';
import { q, tx } from '../../config/db.js';
import { rowToObject } from './_mapper.js';
import { logAudit } from './_audit.js';

const COLS = `id, username, password_hash, display_name, role, is_active,
              created_at, updated_at`;

// Strip the password hash from audit-log snapshots so the secret never leaves
// the users table. Identity columns are kept for context.
function safeSnapshot(row) {
  if (!row) return null;
  const { passwordHash, ...rest } = row;
  void passwordHash;
  return rest;
}

export const userRepo = {
  async findAll() {
    const r = await q(`SELECT ${COLS} FROM users ORDER BY lower(username)`);
    return r.rows.map(rowToObject);
  },
  async findById(id) {
    const r = await q(`SELECT ${COLS} FROM users WHERE id = $1`, [id]);
    return rowToObject(r.rows[0]);
  },
  async findByUsername(username) {
    const r = await q(`SELECT ${COLS} FROM users WHERE lower(username) = lower($1)`, [username]);
    return rowToObject(r.rows[0]);
  },
  async create({ username, passwordHash, displayName = null, role = 'admin', isActive = true }) {
    const id = uuid();
    return tx(async (c) => {
      const r = await c.query(
        `INSERT INTO users (id, username, password_hash, display_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${COLS}`,
        [id, username, passwordHash, displayName, role, isActive]
      );
      const after = rowToObject(r.rows[0]);
      await logAudit(c, { table: 'users', recordId: id, action: 'create', after: safeSnapshot(after) });
      return after;
    });
  },
  async update(id, patch) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM users WHERE id = $1`, [id]);
      const before = rowToObject(cur.rows[0]);
      if (!before) return null;
      const r = await c.query(
        `UPDATE users SET
           username = $2,
           password_hash = $3,
           display_name = $4,
           role = $5,
           is_active = $6
         WHERE id = $1
         RETURNING ${COLS}`,
        [
          id,
          patch.username ?? before.username,
          patch.passwordHash ?? before.passwordHash,
          patch.displayName ?? before.displayName,
          patch.role ?? before.role,
          patch.isActive ?? before.isActive,
        ]
      );
      const after = rowToObject(r.rows[0]);
      await logAudit(c, {
        table: 'users', recordId: id, action: 'update',
        before: safeSnapshot(before), after: safeSnapshot(after),
      });
      return after;
    });
  },
  async remove(id) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM users WHERE id = $1`, [id]);
      const before = rowToObject(cur.rows[0]);
      if (!before) return false;
      await c.query(`DELETE FROM users WHERE id = $1`, [id]);
      await logAudit(c, { table: 'users', recordId: id, action: 'delete', before: safeSnapshot(before) });
      return true;
    });
  },
};
