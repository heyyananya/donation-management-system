import path from 'node:path';
import fs from 'node:fs';
import { donorRepo, trustRepo, receiptRepo, remarkRepo } from '../repositories/index.js';
import { AppError } from '../middleware/error.js';
import { env } from '../config/env.js';
import { amountToWords } from '../utils/amountToWords.js';

function splitAddress(address) {
  if (!address) return [];
  return String(address)
    .split(/\r?\n|,(?=\s)/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

// Verbatim split — keep blank lines and original spacing so PDF output matches
// the textarea character-for-character.
function splitVerbatim(text) {
  if (!text) return [];
  return String(text).replace(/\r\n/g, '\n').split('\n');
}

export async function buildRenderContext(receiptId) {
  const receipt = await receiptRepo.findById(receiptId);
  if (!receipt) throw new AppError('Receipt not found', 404);
  const [trust, donor, remark] = await Promise.all([
    trustRepo.findById(receipt.trustId),
    donorRepo.findById(receipt.donorId),
    receipt.remarkId ? remarkRepo.findById(receipt.remarkId) : Promise.resolve(null),
  ]);
  if (!trust) throw new AppError('Trust not found for this receipt', 404);
  if (!donor) throw new AppError('Donor not found for this receipt', 404);

  const logoPath = trust.logoFileName
    ? path.join(env.uploadsDir, 'trust-logos', trust.logoFileName)
    : '';

  return {
    trust: {
      id: trust.id,
      name: trust.name || '',
      // The full printed header textarea — one entry per line, blanks kept.
      correspondenceAddressLines: splitVerbatim(trust.correspondenceAddress),
      logoPath: logoPath && fs.existsSync(logoPath) ? logoPath : '',
    },
    donor: {
      id: donor.id,
      name: donor.name || '',
      addressLines: splitAddress(donor.address),
      mobile: donor.mobile || '',
      pan: donor.pan || '',
      aadhaar: donor.aadhaar || '',
      passport: donor.passport || '',
    },
    receipt: {
      id: receipt.id,
      number: receipt.number,
      financialYear: receipt.financialYear,
      date: receipt.date,
      amount: Number(receipt.amount || 0),
      amountInWords: amountToWords(receipt.amount),
      paymentType: receipt.paymentType,
      transactionOrChequeNo: receipt.transactionNumber || receipt.chequeNumber || '',
      transactionOrChequeDate: receipt.transactionDate || receipt.chequeDate || receipt.date,
      bankName: receipt.bankName || '',
      purpose: remark?.name || receipt.remarks || '',
      remarks: receipt.remarks || '',
    },
  };
}
