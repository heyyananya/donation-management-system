import { trustRepo, receiptRepo } from '../repositories/index.js';
import { AppError } from '../middleware/error.js';
import { assertString, assertDate } from '../utils/validators.js';

function sanitize(input) {
  return {
    name: assertString(input.name, 'Trust Name', { required: true, maxLength: 200 }),
    // Identity fields — stored for record-keeping. Not printed on documents.
    trustType: assertString(input.trustType, 'Trust Type', { maxLength: 200 }),
    area: assertString(input.area, 'Area', { maxLength: 200 }),
    taluka: assertString(input.taluka, 'Taluka', { maxLength: 200 }),
    district: assertString(input.district, 'District', { maxLength: 200 }),
    sanchalan: assertString(input.sanchalan, 'Trust Sanchalan', { maxLength: 200 }),
    establishDate: assertDate(input.establishDate, 'Establish Date'),
    contactNumber: assertString(input.contactNumber, 'Contact Number', { maxLength: 30 }),
    address: assertString(input.address, 'Trust Address', { maxLength: 1000 }),
    // Printed on Receipt & Thanks Letter, verbatim.
    correspondenceAddress: assertString(input.correspondenceAddress, 'Correspondence Address', { maxLength: 4000 }),
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
