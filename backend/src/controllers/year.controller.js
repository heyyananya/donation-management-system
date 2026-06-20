import { yearService } from '../services/year.service.js';

export const yearController = {
  list: async (_req, res) => res.json(await yearService.list()),
  get: async (req, res) => res.json(await yearService.get(req.params.id)),
  create: async (req, res) => res.status(201).json(await yearService.create(req.body || {})),
  update: async (req, res) => res.json(await yearService.update(req.params.id, req.body || {})),
  remove: async (req, res) => {
    await yearService.remove(req.params.id);
    res.status(204).end();
  },
};
