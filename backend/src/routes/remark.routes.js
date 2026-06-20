import { Router } from 'express';
import { remarkController } from '../controllers/remark.controller.js';

const router = Router();
router.get('/', remarkController.list);
router.post('/', remarkController.create);
router.get('/:id', remarkController.get);
router.put('/:id', remarkController.update);
router.delete('/:id', remarkController.remove);
export default router;
