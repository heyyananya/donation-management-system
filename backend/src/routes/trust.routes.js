import { Router } from 'express';
import { trustController } from '../controllers/trust.controller.js';
import { trustLogoUpload } from '../middleware/upload.js';

const router = Router();
router.get('/', trustController.list);
router.post('/', trustController.create);
router.get('/:id', trustController.get);
router.put('/:id', trustController.update);
router.delete('/:id', trustController.remove);
router.post('/:id/logo', trustLogoUpload.single('file'), trustController.uploadLogo);
router.delete('/:id/logo', trustController.removeLogo);
export default router;
