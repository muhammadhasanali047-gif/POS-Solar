import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAdmin, requireAdmin } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, getSuppliers);
router.get('/:id', authenticate, getSupplierById);
router.post('/', authenticate, requireManagerOrAdmin, createSupplier);
router.put('/:id', authenticate, requireAdmin, updateSupplier);
router.delete('/:id', authenticate, requireAdmin, deleteSupplier);

export default router;