import { v4 as uuid } from 'uuid';
import { q, tx } from '../../config/db.js';
import { rowToObject } from './_mapper.js';
import { logAudit } from './_audit.js';

const COLS = `id, name, created_at, updated_at, is_status`;

export const remarkRepo = {
  async findAll() {
    const r = await q(`SELECT ${COLS} FROM remarks WHERE deleted_at IS NULL AND is_status = 1 ORDER BY lower(name)`);
    return r.rows.map(rowToObject);
  },
  async findById(id) {
    const r = await q(`SELECT ${COLS} FROM remarks WHERE id = $1 AND deleted_at IS NULL AND is_status = 1`, [id]);
    return rowToObject(r.rows[0]);
  },
  async create(data) {
    const id = uuid();
    return tx(async (c) => {
      const r = await c.query(
        `INSERT INTO remarks (id, name) VALUES ($1, $2) RETURNING ${COLS}`,
        [id, data.name]
      );
      const after = rowToObject(r.rows[0]);
      await logAudit(c, { table: 'remarks', recordId: id, action: 'create', after });
      return after;
    });
  },
  async update(id, patch) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM remarks WHERE id = $1`, [id]);
      const before = rowToObject(cur.rows[0]);
      if (!before) return null;
      const r = await c.query(
        `UPDATE remarks SET name = $2 WHERE id = $1 RETURNING ${COLS}`,
        [id, patch.name ?? before.name]
      );
      const after = rowToObject(r.rows[0]);
      await logAudit(c, { table: 'remarks', recordId: id, action: 'update', before, after });
      return after;
    });
  },
  // Soft delete — stamps deleted_at so the row is hidden but preserved.
  async remove(id) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM remarks WHERE id = $1 AND deleted_at IS NULL AND is_status = 1`, [id]);
      const before = rowToObject(cur.rows[0]);
      if (!before) return false;
      await c.query(`UPDATE remarks SET deleted_at = now(), is_status = 0 WHERE id = $1`, [id]);
      await logAudit(c, { table: 'remarks', recordId: id, action: 'delete', before });
      return true;
    });
  },
};
