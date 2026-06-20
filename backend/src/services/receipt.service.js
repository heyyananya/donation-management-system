import { Mutex } from 'async-mutex';
import {
  receiptRepo,
  trustRepo,
  donorRepo,
  remarkRepo,
  yearRepo,
} from '../repositories/index.js';
import { AppError } from '../middleware/error.js';
import { isValidFinancialYear, currentFinancialYear } from '../utils/financialYear.js';
import {
  assertString,
  assertAmount,
  assertDate,
} from '../utils/validators.js';
import { amountToWords } from '../utils/amountToWords.js';

const CHEQUE = new Set(['Cheque', 'Demand Draft']);
const ONLINE = new Set(['NEFT', 'RTGS', 'IMPS', 'UPI', 'Bank Transfer']);
const PAYMENT_TYPES = new Set(['Cash', ...CHEQUE, ...ONLINE]);

const locks = new Map();
function lockFor(fy, trustId) {
  const key = `${fy}::${trustId}`;
  let m = locks.get(key);
  if (!m) {
    m = new Mutex();
    locks.set(key, m);
  }
  return m;
}

async function sanitize(input, { allowNumber = false } = {}) {
  const fy = assertString(input.financialYear, 'Financial Year', { required: true, maxLength: 10 });
  if (!isValidFinancialYear(fy)) throw new AppError('Financial Year format invalid (YYYY-YY)', 400);

  const trustId = assertString(input.trustId, 'Trust', { required: true });
  if (!(await trustRepo.findById(trustId))) throw new AppError('Trust not found', 400);

  const donorId = assertString(input.donorId, 'Donor', { required: true });
  if (!(await donorRepo.findById(donorId))) throw new AppError('Donor not found', 400);

  const date = assertDate(input.date, 'Date', { required: true });
  const amount = assertAmount(input.amount, 'Amount');

  const paymentType = assertString(input.paymentType, 'Payment Type', { required: true });
  if (!PAYMENT_TYPES.has(paymentType)) throw new AppError('Unsupported payment type', 400);

  const remarkId = input.remarkId
    ? assertString(input.remarkId, 'Remark', { required: true })
    : '';
  if (remarkId && !(await remarkRepo.findById(remarkId))) throw new AppError('Remark not found', 400);

  const out = {
    financialYear: fy,
    trustId,
    donorId,
    date,
    amount,
    paymentType,
    remarkId,
    remarks: assertString(input.remarks, 'Remarks', { maxLength: 1000 }),
    chequeNumber: '',
    chequeDate: '',
    bankName: '',
    transactionNumber: '',
    transactionDate: '',
  };

  if (CHEQUE.has(paymentType)) {
    out.chequeNumber = assertString(input.chequeNumber, 'Cheque/DD Number', { required: true, maxLength: 50 });
    out.chequeDate = assertDate(input.chequeDate, 'Cheque/DD Date', { required: true });
    out.bankName = assertString(input.bankName, 'Bank Name', { required: true, maxLength: 200 });
  } else if (ONLINE.has(paymentType)) {
    out.transactionNumber = assertString(input.transactionNumber, 'Transaction Number', { required: true, maxLength: 60 });
    out.transactionDate = assertDate(input.transactionDate, 'Transaction Date', { required: true });
    out.bankName = assertString(input.bankName, 'Bank Name', { required: true, maxLength: 200 });
  }

  if (allowNumber && input.number != null) {
    const n = Number(input.number);
    if (!Number.isInteger(n) || n <= 0) throw new AppError('Receipt Number must be a positive integer', 400);
    out.number = n;
  }

  return out;
}

export const receiptService = {
  list: async (filters) => {
    const rows = await receiptRepo.findAll(filters || {});
    return Promise.all(rows.map(decorate));
  },
  get: async (id) => {
    const r = await receiptRepo.findById(id);
    if (!r) throw new AppError('Receipt not found', 404);
    return decorate(r);
  },
  raw: async (id) => {
    const r = await receiptRepo.findById(id);
    if (!r) throw new AppError('Receipt not found', 404);
    return r;
  },
  peekNextNumber: async (fy, trustId) => {
    if (!isValidFinancialYear(fy) || !trustId) return 1;
    return (await receiptRepo.findMaxNumber(fy, trustId)) + 1;
  },
  async create(input) {
    const data = await sanitize(input);
    const year = await yearRepo.findByName(data.financialYear);
    if (!year) {
      throw new AppError(
        `Financial Year "${data.financialYear}" is not configured. Add it under Year Master first.`,
        400
      );
    }
    if (!year.isActive) {
      throw new AppError(
        `Financial Year "${data.financialYear}" is inactive. New receipts can only be issued in an active year.`,
        400
      );
    }
    const release = await lockFor(data.financialYear, data.trustId).acquire();
    try {
      const number = (await receiptRepo.findMaxNumber(data.financialYear, data.trustId)) + 1;
      const created = await receiptRepo.create({ ...data, number });
      return decorate(created);
    } finally {
      release();
    }
  },
  async update(id, input) {
    const existing = await receiptRepo.findById(id);
    if (!existing) throw new AppError('Receipt not found', 404);
    const data = await sanitize(input);
    if (data.financialYear !== existing.financialYear || data.trustId !== existing.trustId) {
      throw new AppError(
        'Financial Year and Trust cannot be changed after the receipt is issued.',
        400
      );
    }
    if (!(await yearRepo.findByName(data.financialYear))) {
      throw new AppError(`Financial Year "${data.financialYear}" no longer exists`, 400);
    }
    const updated = await receiptRepo.update(id, data);
    return decorate(updated);
  },
  async remove(id) {
    if (!(await receiptRepo.findById(id))) throw new AppError('Receipt not found', 404);
    await receiptRepo.remove(id);
  },
  currentFinancialYear,
  paymentTypes: () => Array.from(PAYMENT_TYPES),
};

async function decorate(r) {
  if (!r) return r;
  const [donor, trust, remark] = await Promise.all([
    donorRepo.findById(r.donorId),
    trustRepo.findById(r.trustId),
    r.remarkId ? remarkRepo.findById(r.remarkId) : Promise.resolve(null),
  ]);
  return {
    ...r,
    amountInWords: amountToWords(r.amount),
    donorName: donor?.name || '',
    donorMobile: donor?.mobile || '',
    trustName: trust?.name || '',
    remarkName: remark?.name || '',
  };
}
