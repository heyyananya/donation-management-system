import path from 'node:path';
import fs from 'node:fs';
import { trustService } from '../services/trust.service.js';
import { env } from '../config/env.js';
import { ensurePdfFriendlyLogo } from '../utils/logoConverter.js';

export const trustController = {
  list: async (_req, res) => res.json(await trustService.list()),
  get: async (req, res) => res.json(await trustService.get(req.params.id)),
  create: async (req, res) => res.status(201).json(await trustService.create(req.body || {})),
  update: async (req, res) => res.json(await trustService.update(req.params.id, req.body || {})),
  remove: async (req, res) => {
    await trustService.remove(req.params.id);
    res.status(204).end();
  },
  uploadLogo: async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      const trust = await trustService.get(req.params.id);
      if (trust.logoFileName) {
        const old = path.join(env.uploadsDir, 'trust-logos', trust.logoFileName);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      const finalName = await ensurePdfFriendlyLogo(req.file);
      res.json(await trustService.setLogo(req.params.id, finalName));
    } catch (err) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      throw err;
    }
  },
  removeLogo: async (req, res) => {
    const trust = await trustService.get(req.params.id);
    if (trust.logoFileName) {
      const p = path.join(env.uploadsDir, 'trust-logos', trust.logoFileName);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    res.json(await trustService.removeLogo(req.params.id));
  },
};
