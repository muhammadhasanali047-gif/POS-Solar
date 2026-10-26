import { Router } from 'express';
import { getPurchases, createPurchase, updatePurchase, deletePurchase } from '../controllers/purchaseController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAdmin, requireAdmin } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, getPurchases);
router.post('/', authenticate, requireManagerOrAdmin, createPurchase);
router.put('/:id', authenticate, requireAdmin, updatePurchase);
router.delete('/:id', authenticate, requireAdmin, deletePurchase);

export default router;