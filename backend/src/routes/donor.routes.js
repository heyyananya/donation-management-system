import { Router } from 'express';
import { donorController } from '../controllers/donor.controller.js';
import { donorDocUpload } from '../middleware/upload.js';

const router = Router();
router.get('/', donorController.list);
router.post('/', donorController.create);
router.get('/:id', donorController.get);
router.put('/:id', donorController.update);
router.delete('/:id', donorController.remove);
router.post('/:id/documents', donorDocUpload.single('file'), donorController.uploadDocument);
router.delete('/:id/documents/:docId', donorController.removeDocument);
export default router;
