import { v4 as uuid } from 'uuid';
import { q, tx } from '../../config/db.js';
import { rowToObject } from './_mapper.js';
import { logAudit } from './_audit.js';

const COLS = `id, name, start_date, end_date, is_active, created_at, updated_at`;

export const yearRepo = {
  async findAll() {
    const r = await q(`SELECT ${COLS} FROM years ORDER BY name DESC`);
    return r.rows.map(rowToObject);
  },
  async findById(id) {
    const r = await q(`SELECT ${COLS} FROM years WHERE id = $1`, [id]);
    return rowToObject(r.rows[0]);
  },
  async findByName(name) {
    const r = await q(`SELECT ${COLS} FROM years WHERE name = $1`, [name]);
    return rowToObject(r.rows[0]);
  },
  async create(data) {
    const id = uuid();
    return tx(async (c) => {
      const r = await c.query(
        `INSERT INTO years (id, name, start_date, end_date, is_active)
         VALUES ($1, $2, $3::date, $4::date, $5)
         RETURNING ${COLS}`,
        [id, data.name, data.startDate, data.endDate, data.isActive ?? true]
      );
      const after = rowToObject(r.rows[0]);
      await logAudit(c, { table: 'years', recordId: id, action: 'create', after });
      return after;
    });
  },
  async update(id, patch) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM years WHERE id = $1`, [id]);
      const before = rowToObject(cur.rows[0]);
      if (!before) return null;
      const r = await c.query(
        `UPDATE years SET
            name = $2,
            start_date = $3::date,
            end_date = $4::date,
            is_active = $5
         WHERE id = $1
         RETURNING ${COLS}`,
        [
          id,
          patch.name ?? before.name,
          patch.startDate ?? before.startDate,
          patch.endDate ?? before.endDate,
          patch.isActive ?? before.isActive,
        ]
      );
      const after = rowToObject(r.rows[0]);
      await logAudit(c, { table: 'years', recordId: id, action: 'update', before, after });
      return after;
    });
  },
  async remove(id) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM years WHERE id = $1`, [id]);
      const before = rowToObject(cur.rows[0]);
      if (!before) return false;
      await c.query(`DELETE FROM years WHERE id = $1`, [id]);
      await logAudit(c, { table: 'years', recordId: id, action: 'delete', before });
      return true;
    });
  },
};
