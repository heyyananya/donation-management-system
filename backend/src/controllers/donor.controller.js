import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuid } from 'uuid';
import { donorService } from '../services/donor.service.js';
import { env } from '../config/env.js';

const docTypes = ['pan', 'aadhaar', 'passport', 'other'];

export const donorController = {
  list: async (req, res) => res.json(await donorService.list(req.query.q)),
  get: async (req, res) => res.json(await donorService.get(req.params.id)),
  create: async (req, res) => res.status(201).json(await donorService.create(req.body || {})),
  update: async (req, res) => res.json(await donorService.update(req.params.id, req.body || {})),
  remove: async (req, res) => {
    await donorService.remove(req.params.id);
    res.status(204).end();
  },
  uploadDocument: async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const type = docTypes.includes(req.body.type) ? req.body.type : 'other';
    const doc = {
      id: uuid(),
      type,
      label: req.body.label || req.file.originalname,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      url: `/api/files/donor-docs/${req.file.filename}`,
    };
    res.status(201).json(await donorService.attachDocument(req.params.id, doc));
  },
  removeDocument: async (req, res) => {
    const donor = await donorService.get(req.params.id);
    const doc = (donor.documents || []).find((d) => d.id === req.params.docId);
    if (doc) {
      const p = path.join(env.uploadsDir, 'donor-docs', doc.fileName);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    res.json(await donorService.removeDocument(req.params.id, req.params.docId));
  },
};
