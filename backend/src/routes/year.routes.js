import { Router } from 'express';
import { yearController } from '../controllers/year.controller.js';

const router = Router();
router.get('/', yearController.list);
router.post('/', yearController.create);
router.get('/:id', yearController.get);
router.put('/:id', yearController.update);
router.delete('/:id', yearController.remove);
export default router;
