import { Router } from 'express';
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotationStatus,
  convertQuotationToSale,
} from '../controllers/quotationController';
import { authenticate } from '../middleware/auth';
import { requireStaff } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, getQuotations);
router.get('/:id', authenticate, getQuotationById);
router.post('/', authenticate, requireStaff, createQuotation);
router.put('/:id/status', authenticate, requireStaff, updateQuotationStatus);
router.post('/:id/convert-to-sale', authenticate, requireStaff, convertQuotationToSale);

export default router;