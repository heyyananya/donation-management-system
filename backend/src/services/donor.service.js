import { donorRepo, receiptRepo } from '../repositories/index.js';
import { AppError } from '../middleware/error.js';
import {
  assertString,
  assertMobile,
  assertPan,
  assertAadhaar,
} from '../utils/validators.js';

// Note: `documents` is deliberately NOT handled here. Documents are managed
// only through the dedicated upload/remove endpoints (attachDocument /
// removeDocument). If sanitize returned `documents` for the update path — where
// the edit form submits no documents — it would overwrite the column with an
// empty array and wipe every uploaded file. create() adds documents explicitly.
function sanitize(input) {
  return {
    name: assertString(input.name, 'Name', { required: true, maxLength: 200 }),
    mobile: assertMobile(input.mobile, 'Mobile', { required: true }),
    pan: assertPan(input.pan, 'PAN'),
    aadhaar: assertAadhaar(input.aadhaar, 'Aadhaar'),
    voterId: assertString(input.voterId, 'Voter ID', { maxLength: 20 }),
    passport: assertString(input.passport, 'Passport', { maxLength: 30 }),
    address: assertString(input.address, 'Address', { maxLength: 1000 }),
  };
}

// A donor may hold at most this many identity documents.
export const MAX_DOCUMENTS = 2;

// At least one identity number must be on file, on both create and update.
function assertIdentity(data) {
  if (!data.pan && !data.aadhaar && !data.voterId) {
    throw new AppError('At least one of PAN, Aadhaar, or Voter ID is required', 400);
  }
}

export const donorService = {
  list: (q) => donorRepo.search(q),
  get: async (id) => {
    const d = await donorRepo.findById(id);
    if (!d) throw new AppError('Donor not found', 404);
    return d;
  },
  create: (input) => {
    const data = sanitize(input);
    assertIdentity(data);
    const documents = Array.isArray(input.documents) ? input.documents : [];
    return donorRepo.create({ ...data, documents });
  },
  update: async (id, input) => {
    if (!(await donorRepo.findById(id))) throw new AppError('Donor not found', 404);
    const data = sanitize(input);
    assertIdentity(data);
    // No `documents` in the patch → the repos preserve the existing array.
    return donorRepo.update(id, data);
  },
  remove: async (id) => {
    if (!(await donorRepo.findById(id))) throw new AppError('Donor not found', 404);
    // Mirror the trust/year rule: a donor referenced by receipts cannot be
    // deleted. This also guarantees existing receipts always resolve the donor
    // name (decoration never encounters a soft-deleted donor).
    const used = await receiptRepo.findAll({ donorId: id });
    if (used.length) throw new AppError('Donor has receipts and cannot be deleted', 400);
    await donorRepo.remove(id);
  },
  attachDocument: async (id, doc) => {
    const d = await donorRepo.findById(id);
    if (!d) throw new AppError('Donor not found', 404);
    if ((d.documents || []).length >= MAX_DOCUMENTS) {
      throw new AppError(`A donor can have at most ${MAX_DOCUMENTS} documents. Remove one before uploading another.`, 400);
    }
    const updated = await donorRepo.appendDocument(id, doc);
    if (!updated) throw new AppError('Donor not found', 404);
    return updated;
  },
  removeDocument: async (id, docId) => {
    const updated = await donorRepo.removeDocumentById(id, docId);
    if (!updated) throw new AppError('Donor not found', 404);
    return updated;
  },
};
