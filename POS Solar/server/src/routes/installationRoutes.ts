import { Router } from 'express';
import {
  getInstallations,
  getInstallationHistory,
  completeInstallation,
  updateInstallation,
  deleteInstallation,
} from '../controllers/installationController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAdmin, requireAdmin } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, getInstallations);
router.get('/:id/history', authenticate, getInstallationHistory);
router.post('/:id/complete', authenticate, requireManagerOrAdmin, completeInstallation);
router.put('/:id', authenticate, requireManagerOrAdmin, updateInstallation);
router.delete('/:id', authenticate, requireAdmin, deleteInstallation);

export default router;