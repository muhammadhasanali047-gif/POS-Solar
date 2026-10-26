import { Router } from 'express';
import { getWarranties, updateWarranty, deleteWarranty } from '../controllers/warrantyController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, getWarranties);
router.put('/:id', authenticate, requireAdmin, updateWarranty);
router.delete('/:id', authenticate, requireAdmin, deleteWarranty);

export default router;