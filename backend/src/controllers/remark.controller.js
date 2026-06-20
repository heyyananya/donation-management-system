import { remarkService } from '../services/remark.service.js';

export const remarkController = {
  list: async (_req, res) => res.json(await remarkService.list()),
  get: async (req, res) => res.json(await remarkService.get(req.params.id)),
  create: async (req, res) => res.status(201).json(await remarkService.create(req.body || {})),
  update: async (req, res) => res.json(await remarkService.update(req.params.id, req.body || {})),
  remove: async (req, res) => {
    await remarkService.remove(req.params.id);
    res.status(204).end();
  },
};
