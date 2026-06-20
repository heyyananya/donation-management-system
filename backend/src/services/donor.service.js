import { donorRepo } from '../repositories/index.js';
import { AppError } from '../middleware/error.js';
import {
  assertString,
  assertMobile,
  assertPan,
  assertAadhaar,
} from '../utils/validators.js';

function sanitize(input) {
  return {
    name: assertString(input.name, 'Name', { required: true, maxLength: 200 }),
    mobile: assertMobile(input.mobile, 'Mobile', { required: true }),
    pan: assertPan(input.pan, 'PAN'),
    aadhaar: assertAadhaar(input.aadhaar, 'Aadhaar'),
    passport: assertString(input.passport, 'Passport', { maxLength: 30 }),
    address: assertString(input.address, 'Address', { maxLength: 1000 }),
    documents: Array.isArray(input.documents) ? input.documents : [],
  };
}

export const donorService = {
  list: (q) => donorRepo.search(q),
  get: async (id) => {
    const d = await donorRepo.findById(id);
    if (!d) throw new AppError('Donor not found', 404);
    return d;
  },
  create: (input) => donorRepo.create(sanitize(input)),
  update: async (id, input) => {
    if (!(await donorRepo.findById(id))) throw new AppError('Donor not found', 404);
    return donorRepo.update(id, sanitize(input));
  },
  remove: async (id) => {
    if (!(await donorRepo.findById(id))) throw new AppError('Donor not found', 404);
    await donorRepo.remove(id);
  },
  attachDocument: async (id, doc) => {
    const d = await donorRepo.findById(id);
    if (!d) throw new AppError('Donor not found', 404);
    const documents = [...(d.documents || []), doc];
    return donorRepo.update(id, { ...d, documents });
  },
  removeDocument: async (id, docId) => {
    const d = await donorRepo.findById(id);
    if (!d) throw new AppError('Donor not found', 404);
    const documents = (d.documents || []).filter((x) => x.id !== docId);
    return donorRepo.update(id, { ...d, documents });
  },
};
