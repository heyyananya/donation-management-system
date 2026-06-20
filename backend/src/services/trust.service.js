import { trustRepo, receiptRepo } from '../repositories/index.js';
import { AppError } from '../middleware/error.js';
import { assertString, assertPan, assertDate } from '../utils/validators.js';

function sanitize(input) {
  return {
    name: assertString(input.name, 'Trust Name', { required: true, maxLength: 200 }),
    address: assertString(input.address, 'Trust Address', { maxLength: 500 }),
    area: assertString(input.area, 'Area', { maxLength: 200 }),
    taluka: assertString(input.taluka, 'Taluka', { maxLength: 200 }),
    district: assertString(input.district, 'District', { maxLength: 200 }),
    establishDate: assertDate(input.establishDate, 'Establish Date'),
    contactNumber: assertString(input.contactNumber, 'Contact Number', { maxLength: 30 }),
    trustType: assertString(input.trustType, 'Trust Type', { maxLength: 200 }),
    sanchalan: assertString(input.sanchalan, 'Trust Sanchalan', { maxLength: 200 }),
    registrationNumber: assertString(input.registrationNumber, 'Registration Number', { maxLength: 100 }),
    registrationText: assertString(input.registrationText, 'Registration Text', { maxLength: 500 }),
    unitText: assertString(input.unitText, 'Unit Text', { maxLength: 300 }),
    correspondenceAddress: assertString(input.correspondenceAddress, 'Correspondence Address', { maxLength: 500 }),
    phone: assertString(input.phone, 'Phone', { maxLength: 50 }),
    eightyGText: assertString(input.eightyGText, '80G Information', { maxLength: 300 }),
    pan: assertPan(input.pan, 'Trust PAN'),
    panText: assertString(input.panText, 'PAN Text', { maxLength: 200 }),
    letterAddressLines: Array.isArray(input.letterAddressLines)
      ? input.letterAddressLines.map((l) => String(l)).filter(Boolean).slice(0, 6)
      : [],
    footerInformation: assertString(input.footerInformation, 'Footer Information', { maxLength: 500 }),
    logoFileName: input.logoFileName ? assertString(input.logoFileName, 'Logo', { maxLength: 300 }) : '',
  };
}

export const trustService = {
  list: () => trustRepo.findAll(),
  get: async (id) => {
    const t = await trustRepo.findById(id);
    if (!t) throw new AppError('Trust not found', 404);
    return t;
  },
  create: (input) => trustRepo.create(sanitize(input)),
  update: async (id, input) => {
    if (!(await trustRepo.findById(id))) throw new AppError('Trust not found', 404);
    return trustRepo.update(id, sanitize(input));
  },
  remove: async (id) => {
    if (!(await trustRepo.findById(id))) throw new AppError('Trust not found', 404);
    const used = await receiptRepo.findAll({ trustId: id });
    if (used.length) throw new AppError('Trust has receipts and cannot be deleted', 400);
    await trustRepo.remove(id);
  },
  setLogo: async (id, logoFileName) => {
    const t = await trustRepo.findById(id);
    if (!t) throw new AppError('Trust not found', 404);
    return trustRepo.update(id, { ...t, logoFileName });
  },
  removeLogo: async (id) => {
    const t = await trustRepo.findById(id);
    if (!t) throw new AppError('Trust not found', 404);
    return trustRepo.update(id, { ...t, logoFileName: '' });
  },
};
