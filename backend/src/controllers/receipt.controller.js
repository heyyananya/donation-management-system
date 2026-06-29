import { receiptService } from '../services/receipt.service.js';
import { trustIsAllowed } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';

function applyTrustScopeToQuery(req) {
  const q = { ...req.query };
  if (!req.allowedTrustIds) return q;
  if (q.trustId) {
    if (!trustIsAllowed(req, q.trustId)) {
      // No access to the requested trust: force an empty result via the
      // `trustIds: []` sentinel below, which the repo translates to WHERE FALSE.
      delete q.trustId;
      q.trustIds = [];
      return q;
    }
    return q;
  }
  // No trust filter from the client — restrict to the user's trusts. An empty
  // array is honored by the repo (no rows).
  q.trustIds = req.allowedTrustIds;
  return q;
}

export const receiptController = {
  list: async (req, res) => res.json(await receiptService.list(applyTrustScopeToQuery(req))),
  get: async (req, res) => {
    const r = await receiptService.get(req.params.id);
    if (!trustIsAllowed(req, r.trustId)) throw new AppError('Receipt not found', 404);
    res.json(r);
  },
  create: async (req, res) => {
    const trustId = req.body?.trustId;
    if (!trustIsAllowed(req, trustId)) throw new AppError('You do not have access to this trust', 403);
    res.status(201).json(await receiptService.create(req.body || {}));
  },
  update: async (req, res) => {
    const existing = await receiptService.get(req.params.id);
    if (!trustIsAllowed(req, existing.trustId)) throw new AppError('Receipt not found', 404);
    if (req.body?.trustId && !trustIsAllowed(req, req.body.trustId)) {
      throw new AppError('You do not have access to this trust', 403);
    }
    res.json(await receiptService.update(req.params.id, req.body || {}));
  },
  remove: async (req, res) => {
    const existing = await receiptService.get(req.params.id);
    if (!trustIsAllowed(req, existing.trustId)) throw new AppError('Receipt not found', 404);
    await receiptService.remove(req.params.id);
    res.status(204).end();
  },
  meta: (_req, res) =>
    res.json({
      paymentTypes: receiptService.paymentTypes(),
      currentFinancialYear: receiptService.currentFinancialYear(),
    }),
  peekNumber: async (req, res) => {
    const { financialYear, trustId } = req.query;
    if (!trustIsAllowed(req, trustId)) {
      return res.json({ next: 1 });
    }
    res.json({ next: await receiptService.peekNextNumber(financialYear, trustId) });
  },
};
