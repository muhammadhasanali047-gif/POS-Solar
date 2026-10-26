import { Router } from 'express';
import { getSales, getSaleById, createSale } from '../controllers/saleController';
import { authenticate } from '../middleware/auth';
import { requireStaff } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, getSales);
router.get('/:id', authenticate, getSaleById);
router.post('/', authenticate, requireStaff, createSale);

export default router;