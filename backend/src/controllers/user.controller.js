import { userService } from '../services/user.service.js';

export const userController = {
  list: async (_req, res) => res.json(await userService.list()),
  get: async (req, res) => res.json(await userService.get(req.params.id)),
  create: async (req, res) => res.status(201).json(await userService.create(req.body || {})),
  update: async (req, res) =>
    res.json(await userService.update(req.params.id, req.body || {}, { actingUsername: req.user?.username })),
  remove: async (req, res) => {
    await userService.remove(req.params.id, { actingUsername: req.user?.username });
    res.status(204).end();
  },
};
