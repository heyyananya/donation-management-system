import { v4 as uuid } from 'uuid';
import { q, tx } from '../../config/db.js';
import { rowToObject } from './_mapper.js';
import { logAudit } from './_audit.js';

const COLS = `id, name, mobile, pan, aadhaar, voter_id, passport, address, documents,
              created_at, updated_at`;

function decode(row) {
  if (!row) return null;
  const obj = rowToObject(row);
  // documents column is JSONB; pg already parses it. Guarantee an array shape.
  obj.documents = Array.isArray(obj.documents) ? obj.documents : (obj.documents || []);
  return obj;
}

export const donorRepo = {
  async findAll() {
    const r = await q(`SELECT ${COLS} FROM donors ORDER BY lower(name)`);
    return r.rows.map(decode);
  },
  async findById(id) {
    const r = await q(`SELECT ${COLS} FROM donors WHERE id = $1`, [id]);
    return decode(r.rows[0]);
  },
  async search(term) {
    if (!term) return donorRepo.findAll();
    const t = `%${term.toLowerCase()}%`;
    const r = await q(
      `SELECT ${COLS} FROM donors
       WHERE lower(name) LIKE $1
          OR mobile LIKE $1
          OR lower(coalesce(pan,'')) LIKE $1
          OR coalesce(aadhaar,'') LIKE $1
          OR lower(coalesce(voter_id,'')) LIKE $1
          OR lower(coalesce(passport,'')) LIKE $1
          OR lower(coalesce(address,'')) LIKE $1
       ORDER BY lower(name)`,
      [t]
    );
    return r.rows.map(decode);
  },
  async create(data) {
    const id = uuid();
    return tx(async (c) => {
      const r = await c.query(
        `INSERT INTO donors (id, name, mobile, pan, aadhaar, voter_id, passport, address, documents)
         VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,''),NULLIF($6,''),NULLIF($7,''),$8,$9::jsonb)
         RETURNING ${COLS}`,
        [
          id, data.name, data.mobile, data.pan || '', data.aadhaar || '', data.voterId || '',
          data.passport || '', data.address || '', JSON.stringify(data.documents || []),
        ]
      );
      const after = decode(r.rows[0]);
      await logAudit(c, { table: 'donors', recordId: id, action: 'create', after });
      return after;
    });
  },
  async update(id, patch) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM donors WHERE id = $1`, [id]);
      const before = decode(cur.rows[0]);
      if (!before) return null;
      const r = await c.query(
        `UPDATE donors SET
            name = $2,
            mobile = $3,
            pan = NULLIF($4,''),
            aadhaar = NULLIF($5,''),
            voter_id = NULLIF($6,''),
            passport = NULLIF($7,''),
            address = $8,
            documents = $9::jsonb
         WHERE id = $1
         RETURNING ${COLS}`,
        [
          id,
          patch.name ?? before.name,
          patch.mobile ?? before.mobile,
          patch.pan ?? before.pan ?? '',
          patch.aadhaar ?? before.aadhaar ?? '',
          patch.voterId ?? before.voterId ?? '',
          patch.passport ?? before.passport ?? '',
          patch.address ?? before.address ?? '',
          JSON.stringify(patch.documents ?? before.documents ?? []),
        ]
      );
      const after = decode(r.rows[0]);
      await logAudit(c, { table: 'donors', recordId: id, action: 'update', before, after });
      return after;
    });
  },
  async remove(id) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM donors WHERE id = $1`, [id]);
      const before = decode(cur.rows[0]);
      if (!before) return false;
      await c.query(`DELETE FROM donors WHERE id = $1`, [id]);
      await logAudit(c, { table: 'donors', recordId: id, action: 'delete', before });
      return true;
    });
  },
  // Uploading two documents back-to-back fires two of these close together.
  // `SELECT ... FOR UPDATE` locks the row for the rest of the transaction, so
  // a second concurrent call blocks until the first commits and then reads
  // the up-to-date array — instead of both reading the same stale array and
  // one write clobbering the other's document.
  async appendDocument(id, doc) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM donors WHERE id = $1 FOR UPDATE`, [id]);
      const before = decode(cur.rows[0]);
      if (!before) return null;
      const documents = [...(before.documents || []), doc];
      const r = await c.query(
        `UPDATE donors SET documents = $2::jsonb WHERE id = $1 RETURNING ${COLS}`,
        [id, JSON.stringify(documents)]
      );
      const after = decode(r.rows[0]);
      await logAudit(c, { table: 'donors', recordId: id, action: 'update', before, after });
      return after;
    });
  },
  async removeDocumentById(id, docId) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM donors WHERE id = $1 FOR UPDATE`, [id]);
      const before = decode(cur.rows[0]);
      if (!before) return null;
      const documents = (before.documents || []).filter((x) => x.id !== docId);
      const r = await c.query(
        `UPDATE donors SET documents = $2::jsonb WHERE id = $1 RETURNING ${COLS}`,
        [id, JSON.stringify(documents)]
      );
      const after = decode(r.rows[0]);
      await logAudit(c, { table: 'donors', recordId: id, action: 'update', before, after });
      return after;
    });
  },
};
