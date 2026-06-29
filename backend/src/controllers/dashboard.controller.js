import { dashboardService } from '../services/dashboard.service.js';

export const dashboardController = {
  summary: async (req, res) =>
    res.json(await dashboardService.summary({ allowedTrustIds: req.allowedTrustIds })),
};
