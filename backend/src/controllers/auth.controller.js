import { authService } from '../services/auth.service.js';

export const authController = {
  login: async (req, res) => res.json(await authService.login(req.body || {})),
  me: async (req, res) => res.json(await authService.me(req)),
};
