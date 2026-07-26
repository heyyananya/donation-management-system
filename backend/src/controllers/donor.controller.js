import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuid } from 'uuid';
import { donorService, MAX_DOCUMENTS } from '../services/donor.service.js';
import { env } from '../config/env.js';

const docTypes = ['pan', 'aadhaar', 'voterId', 'passport', 'other'];

// Maps the create-form's file field names to the identity document type they
// represent. At least one of these three must be present for a donor to be
// created — see donorController.create.
const IDENTITY_DOC_FIELDS = [
  ['aadhaarDoc', 'aadhaar'],
  ['voterIdDoc', 'voterId'],
  ['panDoc', 'pan'],
];

function cleanupUploads(req) {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) for (const arr of Object.values(req.files)) files.push(...arr);
  for (const f of files) {
    try { if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch { /* best effort */ }
  }
}

function fileToDocument(file, type, label) {
  return {
    id: uuid(),
    type,
    label: label || file.originalname,
    fileName: file.filename,
    originalName: file.originalname,
    mime: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    url: `/api/files/donor-docs/${file.filename}`,
  };
}

// Normalize scope options threaded into service calls. `allowedTrustIds` is
// null for admin (unrestricted); an array (possibly empty) for a scoped user.
function scopeOpts(req) {
  return { allowedTrustIds: req.allowedTrustIds };
}

// Multipart-form field values arrive as strings. `trustIds` may appear as a
// repeated field (→ array) or a single value (→ string). Normalize to array.
function readTrustIdsFromBody(body) {
  if (!body) return undefined;
  if (body.trustIds !== undefined) {
    return Array.isArray(body.trustIds) ? body.trustIds : [body.trustIds];
  }
  if (body['trustIds[]'] !== undefined) {
    const v = body['trustIds[]'];
    return Array.isArray(v) ? v : [v];
  }
  return undefined;
}

export const donorController = {
  list: async (req, res) => {
    const listOpts = {
      trustIds: req.allowedTrustIds,
      trustId: req.query.trustId || undefined,
    };
    res.json(await donorService.list(req.query.q, listOpts));
  },
  get: async (req, res) => res.json(await donorService.get(req.params.id, { trustIds: req.allowedTrustIds })),
  create: async (req, res) => {
    try {
      const files = req.files || {};
      const documents = IDENTITY_DOC_FIELDS
        .filter(([field]) => files[field]?.[0])
        .map(([field, type]) => fileToDocument(files[field][0], type));
      if (!documents.length) {
        cleanupUploads(req);
        return res.status(400).json({
          message: 'Upload at least one identity document (Aadhaar Card, Voter ID, or PAN Card) to create a donor.',
        });
      }
      if (documents.length > MAX_DOCUMENTS) {
        cleanupUploads(req);
        return res.status(400).json({ message: `A donor can have at most ${MAX_DOCUMENTS} documents.` });
      }
      const trustIds = readTrustIdsFromBody(req.body);
      const created = await donorService.create({ ...req.body, trustIds, documents }, scopeOpts(req));
      return res.status(201).json(created);
    } catch (err) {
      cleanupUploads(req);
      throw err;
    }
  },
  update: async (req, res) => {
    const body = { ...(req.body || {}) };
    const trustIds = readTrustIdsFromBody(req.body);
    if (trustIds !== undefined) body.trustIds = trustIds;
    res.json(await donorService.update(req.params.id, body, scopeOpts(req)));
  },
  remove: async (req, res) => {
    await donorService.remove(req.params.id, scopeOpts(req));
    res.status(204).end();
  },
  uploadDocument: async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    try {
      const type = docTypes.includes(req.body.type) ? req.body.type : 'other';
      const doc = fileToDocument(req.file, type, req.body.label);
      res.status(201).json(await donorService.attachDocument(req.params.id, doc, scopeOpts(req)));
    } catch (err) {
      cleanupUploads(req);
      throw err;
    }
  },
  removeDocument: async (req, res) => {
    const donor = await donorService.get(req.params.id, { trustIds: req.allowedTrustIds });
    const doc = (donor.documents || []).find((d) => d.id === req.params.docId);
    if (doc) {
      const p = path.join(env.uploadsDir, 'donor-docs', doc.fileName);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    res.json(await donorService.removeDocument(req.params.id, req.params.docId, scopeOpts(req)));
  },
};
