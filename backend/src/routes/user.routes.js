import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAdmin);
router.get('/', userController.list);
router.post('/', userController.create);
router.get('/:id', userController.get);
router.put('/:id', userController.update);
router.delete('/:id', userController.remove);
export default router;
