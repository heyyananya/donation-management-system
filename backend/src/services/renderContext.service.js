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
    .slice(0, 6);
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
      registrationText: trust.registrationText || '',
      unitText: trust.unitText || '',
      correspondenceAddress: trust.correspondenceAddress || '',
      phone: trust.phone || '',
      eightyGText: trust.eightyGText || '',
      panText: trust.panText || (trust.pan ? `PAN : ${trust.pan}` : ''),
      letterAddressLines: (trust.letterAddressLines && trust.letterAddressLines.length
        ? trust.letterAddressLines
        : splitAddress(trust.address)).slice(0, 6),
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
