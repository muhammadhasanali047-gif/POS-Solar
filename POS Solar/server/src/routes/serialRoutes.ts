import { Router } from 'express';
import { searchSerial, getSerialHistory, createSerial } from '../controllers/serialController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAdmin } from '../middleware/rbac';

const router = Router();

router.get('/search', authenticate, searchSerial);
router.get('/history/:serial_no', authenticate, getSerialHistory);
router.post('/', authenticate, requireManagerOrAdmin, createSerial);

export default router;