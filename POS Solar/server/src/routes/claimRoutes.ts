import { Router } from 'express';
import { getClaims, createClaim, updateClaim, deleteClaim } from '../controllers/claimController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAdmin, requireAdmin } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, getClaims);
router.post('/', authenticate, requireManagerOrAdmin, createClaim);
router.put('/:id', authenticate, requireManagerOrAdmin, updateClaim);
router.delete('/:id', authenticate, requireAdmin, deleteClaim);

export default router;