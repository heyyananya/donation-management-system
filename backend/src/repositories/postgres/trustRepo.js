import { v4 as uuid } from 'uuid';
import { q, tx } from '../../config/db.js';
import { rowToObject } from './_mapper.js';
import { logAudit } from './_audit.js';

const COLS = `id, name, trust_type, area, taluka, district, sanchalan,
              establish_date, contact_number, address, correspondence_address,
              logo_file_name, created_at, updated_at, is_status`;

function decode(row) {
  if (!row) return null;
  return rowToObject(row);
}

function snapshot(p, fallback = {}) {
  return {
    name: p.name ?? fallback.name ?? '',
    trustType: p.trustType ?? fallback.trustType ?? '',
    area: p.area ?? fallback.area ?? '',
    taluka: p.taluka ?? fallback.taluka ?? '',
    district: p.district ?? fallback.district ?? '',
    sanchalan: p.sanchalan ?? fallback.sanchalan ?? '',
    establishDate: p.establishDate ?? fallback.establishDate ?? null,
    contactNumber: p.contactNumber ?? fallback.contactNumber ?? '',
    address: p.address ?? fallback.address ?? '',
    correspondenceAddress: p.correspondenceAddress ?? fallback.correspondenceAddress ?? '',
    logoFileName: p.logoFileName ?? fallback.logoFileName ?? '',
  };
}

function writeArgs(id, s) {
  return [
    id, s.name, s.trustType, s.area, s.taluka, s.district, s.sanchalan,
    s.establishDate || null, s.contactNumber, s.address,
    s.correspondenceAddress, s.logoFileName,
  ];
}

const INSERT_SQL = `
  INSERT INTO trusts (
    id, name, trust_type, area, taluka, district, sanchalan,
    establish_date, contact_number, address, correspondence_address, logo_file_name
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, $11, $12)
  RETURNING ${COLS}
`;

const UPDATE_SQL = `
  UPDATE trusts SET
    name = $2,
    trust_type = $3,
    area = $4,
    taluka = $5,
    district = $6,
    sanchalan = $7,
    establish_date = $8::date,
    contact_number = $9,
    address = $10,
    correspondence_address = $11,
    logo_file_name = $12
  WHERE id = $1
  RETURNING ${COLS}
`;

export const trustRepo = {
  async findAll() {
    const r = await q(`SELECT ${COLS} FROM trusts WHERE deleted_at IS NULL AND is_status = 1 ORDER BY lower(name)`);
    return r.rows.map(decode);
  },
  async findById(id) {
    const r = await q(`SELECT ${COLS} FROM trusts WHERE id = $1 AND deleted_at IS NULL AND is_status = 1`, [id]);
    return decode(r.rows[0]);
  },
  async create(data) {
    const id = uuid();
    const s = snapshot(data);
    return tx(async (c) => {
      const r = await c.query(INSERT_SQL, writeArgs(id, s));
      const after = decode(r.rows[0]);
      await logAudit(c, { table: 'trusts', recordId: id, action: 'create', after });
      return after;
    });
  },
  async update(id, patch) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM trusts WHERE id = $1`, [id]);
      const before = decode(cur.rows[0]);
      if (!before) return null;
      const s = snapshot(patch, before);
      const r = await c.query(UPDATE_SQL, writeArgs(id, s));
      const after = decode(r.rows[0]);
      await logAudit(c, { table: 'trusts', recordId: id, action: 'update', before, after });
      return after;
    });
  },
  // Soft delete — stamps deleted_at so the row is hidden but preserved.
  async remove(id) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM trusts WHERE id = $1 AND deleted_at IS NULL AND is_status = 1`, [id]);
      const before = decode(cur.rows[0]);
      if (!before) return false;
      await c.query(`UPDATE trusts SET deleted_at = now(), is_status = 0 WHERE id = $1`, [id]);
      await logAudit(c, { table: 'trusts', recordId: id, action: 'delete', before });
      return true;
    });
  },
};
