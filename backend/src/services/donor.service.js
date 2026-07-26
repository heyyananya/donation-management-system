import { donorRepo, receiptRepo, trustRepo } from '../repositories/index.js';
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

// Parse and validate the trustIds a donor is assigned to. When the request came
// in as multipart form data, an array can arrive as either `trustIds[]` (already
// an array) or a repeated `trustIds` field. Multer coerces to arrays for us.
// `allowedTrustIds` = the acting user's scope (null for admin); if set, the
// caller can only assign to trusts within their own scope.
async function normalizeTrustIds(raw, allowedTrustIds) {
  const arr = Array.isArray(raw)
    ? raw
    : (raw === undefined || raw === null || raw === '' ? [] : [raw]);
  const ids = [...new Set(arr.filter((x) => typeof x === 'string' && x))];
  if (!ids.length) {
    throw new AppError('Select at least one trust for this donor', 400);
  }
  const all = await trustRepo.findAll();
  const valid = new Set(all.map((t) => t.id));
  for (const id of ids) {
    if (!valid.has(id)) throw new AppError(`Trust ${id} does not exist`, 400);
  }
  if (allowedTrustIds) {
    const scope = new Set(allowedTrustIds);
    for (const id of ids) {
      if (!scope.has(id)) throw new AppError('You do not have access to one of the selected trusts', 403);
    }
  }
  return ids;
}

export const donorService = {
  list: (q, opts = {}) => donorRepo.search(q, opts),
  get: async (id, opts = {}) => {
    const d = await donorRepo.findById(id, opts);
    if (!d) throw new AppError('Donor not found', 404);
    return d;
  },
  create: async (input, opts = {}) => {
    const data = sanitize(input);
    assertIdentity(data);
    const trustIds = await normalizeTrustIds(input.trustIds, opts.allowedTrustIds);
    const documents = Array.isArray(input.documents) ? input.documents : [];
    return donorRepo.create({ ...data, trustIds, documents });
  },
  update: async (id, input, opts = {}) => {
    const existing = await donorRepo.findById(id, { trustIds: opts.allowedTrustIds });
    if (!existing) throw new AppError('Donor not found', 404);
    const data = sanitize(input);
    assertIdentity(data);
    const patch = { ...data };
    if (input.trustIds !== undefined) {
      patch.trustIds = await normalizeTrustIds(input.trustIds, opts.allowedTrustIds);
    }
    return donorRepo.update(id, patch);
  },
  remove: async (id, opts = {}) => {
    const existing = await donorRepo.findById(id, { trustIds: opts.allowedTrustIds });
    if (!existing) throw new AppError('Donor not found', 404);
    // Mirror the trust/year rule: a donor referenced by receipts cannot be
    // deleted. This also guarantees existing receipts always resolve the donor
    // name (decoration never encounters a soft-deleted donor).
    const used = await receiptRepo.findAll({ donorId: id });
    if (used.length) throw new AppError('Donor has receipts and cannot be deleted', 400);
    await donorRepo.remove(id);
  },
  attachDocument: async (id, doc, opts = {}) => {
    const d = await donorRepo.findById(id, { trustIds: opts.allowedTrustIds });
    if (!d) throw new AppError('Donor not found', 404);
    if ((d.documents || []).length >= MAX_DOCUMENTS) {
      throw new AppError(`A donor can have at most ${MAX_DOCUMENTS} documents. Remove one before uploading another.`, 400);
    }
    const updated = await donorRepo.appendDocument(id, doc);
    if (!updated) throw new AppError('Donor not found', 404);
    return updated;
  },
  removeDocument: async (id, docId, opts = {}) => {
    const existing = await donorRepo.findById(id, { trustIds: opts.allowedTrustIds });
    if (!existing) throw new AppError('Donor not found', 404);
    const updated = await donorRepo.removeDocumentById(id, docId);
    if (!updated) throw new AppError('Donor not found', 404);
    return updated;
  },
};
