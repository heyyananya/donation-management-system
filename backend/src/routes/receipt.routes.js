import { Router } from 'express';
import { receiptController } from '../controllers/receipt.controller.js';

const router = Router();
router.get('/meta', receiptController.meta);
router.get('/peek-number', receiptController.peekNumber);
router.get('/', receiptController.list);
router.post('/', receiptController.create);
router.get('/:id', receiptController.get);
router.put('/:id', receiptController.update);
router.delete('/:id', receiptController.remove);
export default router;
