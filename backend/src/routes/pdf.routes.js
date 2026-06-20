import { Router } from 'express';
import { pdfController } from '../controllers/pdf.controller.js';

const router = Router();
router.get('/:type/:id', pdfController.generate);
export default router;
