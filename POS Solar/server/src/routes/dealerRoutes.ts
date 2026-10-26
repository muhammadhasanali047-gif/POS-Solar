import { Router } from 'express';
import {
  getDealers,
  getDealerById,
  createDealer,
  updateDealer,
  payDealerCommission,
} from '../controllers/dealerController';
import { authenticate } from '../middleware/auth';
import { requireDealerModuleAccess, requireManagerOrAdmin } from '../middleware/rbac';

const router = Router();

// Both CEO and Manager have access to Dealer Management
router.get('/', authenticate, requireDealerModuleAccess, getDealers);
router.get('/:id', authenticate, requireDealerModuleAccess, getDealerById);
router.post('/', authenticate, requireManagerOrAdmin, createDealer);
router.put('/:id', authenticate, requireManagerOrAdmin, updateDealer);
router.post('/:id/payout', authenticate, requireManagerOrAdmin, payDealerCommission);

export default router;