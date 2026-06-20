import { receiptService } from '../services/receipt.service.js';

export const receiptController = {
  list: async (req, res) => res.json(await receiptService.list(req.query)),
  get: async (req, res) => res.json(await receiptService.get(req.params.id)),
  create: async (req, res) => res.status(201).json(await receiptService.create(req.body || {})),
  update: async (req, res) => res.json(await receiptService.update(req.params.id, req.body || {})),
  remove: async (req, res) => {
    await receiptService.remove(req.params.id);
    res.status(204).end();
  },
  meta: (_req, res) =>
    res.json({
      paymentTypes: receiptService.paymentTypes(),
      currentFinancialYear: receiptService.currentFinancialYear(),
    }),
  peekNumber: async (req, res) =>
    res.json({
      next: await receiptService.peekNextNumber(req.query.financialYear, req.query.trustId),
    }),
};
