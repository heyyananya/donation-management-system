import { v4 as uuid } from 'uuid';
import { q, tx } from '../../config/db.js';
import { rowToObject } from './_mapper.js';
import { logAudit } from './_audit.js';

const COLS = `id, name, address, area, taluka, district, establish_date,
              contact_number, trust_type, sanchalan, registration_number,
              registration_text, unit_text, correspondence_address, phone,
              eighty_g_text, pan, pan_text, letter_address_lines,
              footer_information, logo_file_name, created_at, updated_at`;

function decode(row) {
  if (!row) return null;
  const obj = rowToObject(row);
  obj.letterAddressLines = obj.letterAddressLines || [];
  return obj;
}

function snapshot(p, fallback = {}) {
  return {
    name: p.name ?? fallback.name ?? '',
    address: p.address ?? fallback.address ?? '',
    area: p.area ?? fallback.area ?? '',
    taluka: p.taluka ?? fallback.taluka ?? '',
    district: p.district ?? fallback.district ?? '',
    establishDate: p.establishDate ?? fallback.establishDate ?? null,
    contactNumber: p.contactNumber ?? fallback.contactNumber ?? '',
    trustType: p.trustType ?? fallback.trustType ?? '',
    sanchalan: p.sanchalan ?? fallback.sanchalan ?? '',
    registrationNumber: p.registrationNumber ?? fallback.registrationNumber ?? '',
    registrationText: p.registrationText ?? fallback.registrationText ?? '',
    unitText: p.unitText ?? fallback.unitText ?? '',
    correspondenceAddress: p.correspondenceAddress ?? fallback.correspondenceAddress ?? '',
    phone: p.phone ?? fallback.phone ?? '',
    eightyGText: p.eightyGText ?? fallback.eightyGText ?? '',
    pan: p.pan ?? fallback.pan ?? '',
    panText: p.panText ?? fallback.panText ?? '',
    letterAddressLines: p.letterAddressLines ?? fallback.letterAddressLines ?? [],
    footerInformation: p.footerInformation ?? fallback.footerInformation ?? '',
    logoFileName: p.logoFileName ?? fallback.logoFileName ?? '',
  };
}

function writeQuery(id, s) {
  return [
    id, s.name, s.address, s.area, s.taluka, s.district, s.establishDate || null,
    s.contactNumber, s.trustType, s.sanchalan, s.registrationNumber,
    s.registrationText, s.unitText, s.correspondenceAddress, s.phone,
    s.eightyGText, s.pan || null, s.panText, s.letterAddressLines,
    s.footerInformation, s.logoFileName,
  ];
}

const INSERT_SQL = `
  INSERT INTO trusts (
    id, name, address, area, taluka, district, establish_date,
    contact_number, trust_type, sanchalan, registration_number,
    registration_text, unit_text, correspondence_address, phone,
    eighty_g_text, pan, pan_text, letter_address_lines,
    footer_information, logo_file_name
  ) VALUES (
    $1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
  )
  RETURNING ${COLS}
`;

const UPDATE_SQL = `
  UPDATE trusts SET
    name = $2, address = $3, area = $4, taluka = $5, district = $6,
    establish_date = $7::date, contact_number = $8, trust_type = $9,
    sanchalan = $10, registration_number = $11, registration_text = $12,
    unit_text = $13, correspondence_address = $14, phone = $15,
    eighty_g_text = $16, pan = $17, pan_text = $18,
    letter_address_lines = $19, footer_information = $20, logo_file_name = $21
  WHERE id = $1
  RETURNING ${COLS}
`;

export const trustRepo = {
  async findAll() {
    const r = await q(`SELECT ${COLS} FROM trusts ORDER BY lower(name)`);
    return r.rows.map(decode);
  },
  async findById(id) {
    const r = await q(`SELECT ${COLS} FROM trusts WHERE id = $1`, [id]);
    return decode(r.rows[0]);
  },
  async create(data) {
    const id = uuid();
    const s = snapshot(data);
    return tx(async (c) => {
      const r = await c.query(INSERT_SQL, writeQuery(id, s));
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
      const r = await c.query(UPDATE_SQL, writeQuery(id, s));
      const after = decode(r.rows[0]);
      await logAudit(c, { table: 'trusts', recordId: id, action: 'update', before, after });
      return after;
    });
  },
  async remove(id) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM trusts WHERE id = $1`, [id]);
      const before = decode(cur.rows[0]);
      if (!before) return false;
      await c.query(`DELETE FROM trusts WHERE id = $1`, [id]);
      await logAudit(c, { table: 'trusts', recordId: id, action: 'delete', before });
      return true;
    });
  },
};
