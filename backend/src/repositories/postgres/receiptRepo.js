import { v4 as uuid } from 'uuid';
import { q, tx } from '../../config/db.js';
import { rowToObject } from './_mapper.js';
import { logAudit } from './_audit.js';

const COLS = `id, financial_year, trust_id, donor_id, remark_id, number, date,
              amount, payment_type, remarks, cheque_number, cheque_date,
              bank_name, transaction_number, transaction_date,
              created_at, updated_at`;

function decode(row) {
  if (!row) return null;
  return rowToObject(row);
}

function args(id, d) {
  return [
    id, d.financialYear, d.trustId, d.donorId, d.remarkId || null, d.number,
    d.date, d.amount, d.paymentType, d.remarks || '',
    d.chequeNumber || null, d.chequeDate || null, d.bankName || '',
    d.transactionNumber || null, d.transactionDate || null,
  ];
}

const INSERT_SQL = `
  INSERT INTO receipts (
    id, financial_year, trust_id, donor_id, remark_id, number, date,
    amount, payment_type, remarks, cheque_number, cheque_date, bank_name,
    transaction_number, transaction_date
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8::numeric,$9,$10,
          $11,$12::date,$13,$14,$15::date)
  RETURNING ${COLS}
`;

const UPDATE_SQL = `
  UPDATE receipts SET
    financial_year = $2, trust_id = $3, donor_id = $4, remark_id = $5,
    number = $6, date = $7::date, amount = $8::numeric, payment_type = $9,
    remarks = $10, cheque_number = $11, cheque_date = $12::date,
    bank_name = $13, transaction_number = $14, transaction_date = $15::date
  WHERE id = $1
  RETURNING ${COLS}
`;

export const receiptRepo = {
  async findAll(filters = {}) {
    const where = [];
    const vals = [];
    let i = 1;
    if (filters.financialYear) { where.push(`financial_year = $${i++}`); vals.push(filters.financialYear); }
    if (filters.trustId) { where.push(`trust_id = $${i++}`); vals.push(filters.trustId); }
    if (filters.donorId) { where.push(`donor_id = $${i++}`); vals.push(filters.donorId); }
    if (filters.paymentType) { where.push(`payment_type = $${i++}`); vals.push(filters.paymentType); }
    if (filters.dateFrom) { where.push(`date >= $${i++}::date`); vals.push(filters.dateFrom); }
    if (filters.dateTo) { where.push(`date <= $${i++}::date`); vals.push(filters.dateTo); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const r = await q(`SELECT ${COLS} FROM receipts ${clause} ORDER BY date DESC, number DESC`, vals);
    return r.rows.map(decode);
  },
  async findById(id) {
    const r = await q(`SELECT ${COLS} FROM receipts WHERE id = $1`, [id]);
    return decode(r.rows[0]);
  },
  async findMaxNumber(fy, trustId) {
    const r = await q(
      `SELECT COALESCE(MAX(number), 0) AS max FROM receipts WHERE financial_year = $1 AND trust_id = $2`,
      [fy, trustId]
    );
    return Number(r.rows[0].max) || 0;
  },
  async create(data) {
    const id = uuid();
    return tx(async (c) => {
      const r = await c.query(INSERT_SQL, args(id, data));
      const after = decode(r.rows[0]);
      await logAudit(c, { table: 'receipts', recordId: id, action: 'create', after });
      return after;
    });
  },
  async update(id, patch) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM receipts WHERE id = $1`, [id]);
      const before = decode(cur.rows[0]);
      if (!before) return null;
      const merged = {
        financialYear: patch.financialYear ?? before.financialYear,
        trustId: patch.trustId ?? before.trustId,
        donorId: patch.donorId ?? before.donorId,
        remarkId: patch.remarkId ?? before.remarkId,
        number: patch.number ?? before.number,
        date: patch.date ?? before.date,
        amount: patch.amount ?? before.amount,
        paymentType: patch.paymentType ?? before.paymentType,
        remarks: patch.remarks ?? before.remarks,
        chequeNumber: patch.chequeNumber ?? before.chequeNumber,
        chequeDate: patch.chequeDate ?? before.chequeDate,
        bankName: patch.bankName ?? before.bankName,
        transactionNumber: patch.transactionNumber ?? before.transactionNumber,
        transactionDate: patch.transactionDate ?? before.transactionDate,
      };
      const r = await c.query(UPDATE_SQL, args(id, merged));
      const after = decode(r.rows[0]);
      await logAudit(c, { table: 'receipts', recordId: id, action: 'update', before, after });
      return after;
    });
  },
  async remove(id) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM receipts WHERE id = $1`, [id]);
      const before = decode(cur.rows[0]);
      if (!before) return false;
      await c.query(`DELETE FROM receipts WHERE id = $1`, [id]);
      await logAudit(c, { table: 'receipts', recordId: id, action: 'delete', before });
      return true;
    });
  },
  async countAll() {
    const r = await q(`SELECT COUNT(*)::int AS n FROM receipts`);
    return r.rows[0].n;
  },
  async recent(limit = 5) {
    const r = await q(`SELECT ${COLS} FROM receipts ORDER BY created_at DESC LIMIT $1`, [limit]);
    return r.rows.map(decode);
  },
};
