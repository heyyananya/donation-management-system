import { v4 as uuid } from 'uuid';
import { q, tx } from '../../config/db.js';
import { rowToObject } from './_mapper.js';
import { logAudit } from './_audit.js';

const COLS = `id, name, start_date, end_date, is_active, created_at, updated_at, is_status`;

export const yearRepo = {
  async findAll() {
    const r = await q(`SELECT ${COLS} FROM years WHERE deleted_at IS NULL AND is_status = 1 ORDER BY name DESC`);
    return r.rows.map(rowToObject);
  },
  async findById(id) {
    const r = await q(`SELECT ${COLS} FROM years WHERE id = $1 AND deleted_at IS NULL AND is_status = 1`, [id]);
    return rowToObject(r.rows[0]);
  },
  async findByName(name) {
    const r = await q(`SELECT ${COLS} FROM years WHERE name = $1 AND deleted_at IS NULL AND is_status = 1`, [name]);
    return rowToObject(r.rows[0]);
  },
  async create(data) {
    return tx(async (c) => {
      // years.name is a full UNIQUE (receipts.financial_year FK references it),
      // so we can't insert a duplicate alongside a soft-deleted one. If a
      // soft-deleted year with this name exists, revive & refresh it instead.
      const dead = await c.query(
        `SELECT ${COLS} FROM years WHERE name = $1 AND (deleted_at IS NOT NULL OR is_status = 0)`, [data.name]
      );
      if (dead.rows[0]) {
        const revivedId = dead.rows[0].id;
        const r = await c.query(
          `UPDATE years SET deleted_at = NULL, is_status = 1, start_date = $2::date, end_date = $3::date, is_active = $4
           WHERE id = $1 RETURNING ${COLS}`,
          [revivedId, data.startDate, data.endDate, data.isActive ?? true]
        );
        const after = rowToObject(r.rows[0]);
        await logAudit(c, { table: 'years', recordId: revivedId, action: 'update', after });
        return after;
      }
      const id = uuid();
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
  // Soft delete — stamps deleted_at so the row is hidden but preserved.
  async remove(id) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM years WHERE id = $1 AND deleted_at IS NULL AND is_status = 1`, [id]);
      const before = rowToObject(cur.rows[0]);
      if (!before) return false;
      await c.query(`UPDATE years SET deleted_at = now(), is_status = 0 WHERE id = $1`, [id]);
      await logAudit(c, { table: 'years', recordId: id, action: 'delete', before });
      return true;
    });
  },
};
