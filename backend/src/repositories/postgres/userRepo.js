import { v4 as uuid } from 'uuid';
import { q, tx } from '../../config/db.js';
import { rowToObject } from './_mapper.js';
import { logAudit } from './_audit.js';

const COLS = `id, username, password_hash, display_name, email, role, is_active,
              created_at, updated_at, is_status`;

function safeSnapshot(row) {
  if (!row) return null;
  const { passwordHash, ...rest } = row;
  void passwordHash;
  return rest;
}

async function loadTrustIds(client, userId) {
  const r = await client.query(
    `SELECT ut.trust_id 
     FROM user_trusts ut
     JOIN trusts t ON ut.trust_id = t.id
     WHERE ut.user_id = $1 AND t.deleted_at IS NULL AND t.is_status = 1`,
    [userId]
  );
  return r.rows.map((row) => row.trust_id);
}

async function replaceTrustIds(client, userId, trustIds) {
  await client.query(`DELETE FROM user_trusts WHERE user_id = $1`, [userId]);
  if (!trustIds || trustIds.length === 0) return;
  const values = trustIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  await client.query(
    `INSERT INTO user_trusts (user_id, trust_id) VALUES ${values}`,
    [userId, ...trustIds]
  );
}

async function decorate(row, client) {
  if (!row) return null;
  const obj = rowToObject(row);
  const runner = client
    ? (sql, params) => client.query(sql, params)
    : (sql, params) => q(sql, params);
  const r = await runner(
    `SELECT ut.trust_id 
     FROM user_trusts ut
     JOIN trusts t ON ut.trust_id = t.id
     WHERE ut.user_id = $1 AND t.deleted_at IS NULL AND t.is_status = 1
     ORDER BY ut.trust_id`,
    [obj.id]
  );
  obj.trustIds = r.rows.map((tr) => tr.trust_id);
  return obj;
}

export const userRepo = {
  async findAll() {
    const r = await q(`SELECT ${COLS} FROM users WHERE deleted_at IS NULL AND is_status = 1 ORDER BY lower(username)`);
    return Promise.all(r.rows.map((row) => decorate(row)));
  },
  async findById(id) {
    const r = await q(`SELECT ${COLS} FROM users WHERE id = $1 AND deleted_at IS NULL AND is_status = 1`, [id]);
    if (!r.rows[0]) return null;
    return decorate(r.rows[0]);
  },
  async findByUsername(username) {
    // Excludes soft-deleted users, so a deleted account can no longer log in.
    const r = await q(`SELECT ${COLS} FROM users WHERE lower(username) = lower($1) AND deleted_at IS NULL AND is_status = 1`, [username]);
    if (!r.rows[0]) return null;
    return decorate(r.rows[0]);
  },
  async findTrustIdsForUser(id) {
    const r = await q(
      `SELECT ut.trust_id 
       FROM user_trusts ut
       JOIN trusts t ON ut.trust_id = t.id
       WHERE ut.user_id = $1 AND t.deleted_at IS NULL AND t.is_status = 1`,
      [id]
    );
    return r.rows.map((row) => row.trust_id);
  },
  async create({
    username,
    passwordHash,
    displayName = null,
    email = null,
    role = 'admin',
    isActive = true,
    trustIds = [],
  }) {
    const id = uuid();
    return tx(async (c) => {
      const r = await c.query(
        `INSERT INTO users (id, username, password_hash, display_name, email, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${COLS}`,
        [id, username, passwordHash, displayName, email, role, isActive]
      );
      await replaceTrustIds(c, id, role === 'admin' ? [] : trustIds);
      const after = await decorate(r.rows[0], c);
      await logAudit(c, { table: 'users', recordId: id, action: 'create', after: safeSnapshot(after) });
      return after;
    });
  },
  async update(id, patch) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM users WHERE id = $1`, [id]);
      const beforeRow = cur.rows[0];
      if (!beforeRow) return null;
      const beforeTrustIds = await loadTrustIds(c, id);
      const before = { ...rowToObject(beforeRow), trustIds: beforeTrustIds };
      const r = await c.query(
        `UPDATE users SET
           username = $2,
           password_hash = $3,
           display_name = $4,
           email = $5,
           role = $6,
           is_active = $7
         WHERE id = $1
         RETURNING ${COLS}`,
        [
          id,
          patch.username ?? before.username,
          patch.passwordHash ?? before.passwordHash,
          patch.displayName ?? before.displayName,
          patch.email ?? before.email,
          patch.role ?? before.role,
          patch.isActive ?? before.isActive,
        ]
      );
      const nextRole = patch.role ?? before.role;
      const nextTrustIds = patch.trustIds !== undefined ? patch.trustIds : before.trustIds;
      await replaceTrustIds(c, id, nextRole === 'admin' ? [] : nextTrustIds);
      const after = await decorate(r.rows[0], c);
      await logAudit(c, {
        table: 'users', recordId: id, action: 'update',
        before: safeSnapshot(before), after: safeSnapshot(after),
      });
      return after;
    });
  },
  // Soft delete — stamps deleted_at so the row is hidden but preserved. The
  // user_trusts rows are left in place (harmless; the user can no longer log in).
  async remove(id) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM users WHERE id = $1 AND deleted_at IS NULL AND is_status = 1`, [id]);
      const beforeRow = cur.rows[0];
      if (!beforeRow) return false;
      const beforeTrustIds = await loadTrustIds(c, id);
      const before = { ...rowToObject(beforeRow), trustIds: beforeTrustIds };
      await c.query(`UPDATE users SET deleted_at = now(), is_status = 0 WHERE id = $1`, [id]);
      await logAudit(c, { table: 'users', recordId: id, action: 'delete', before: safeSnapshot(before) });
      return true;
    });
  },
};
