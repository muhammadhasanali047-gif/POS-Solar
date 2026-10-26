import { Router } from 'express';
import { getPackages, createPackage, updatePackage, deletePackage } from '../controllers/packageController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAdmin, requireAdmin } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, getPackages);
router.post('/', authenticate, requireManagerOrAdmin, createPackage);
router.put('/:id', authenticate, requireAdmin, updatePackage);
router.delete('/:id', authenticate, requireAdmin, deletePackage);

export default router;