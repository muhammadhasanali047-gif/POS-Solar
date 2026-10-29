import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  getCustomerLedger,
  createCustomer,
  updateCustomer,
  recordCustomerPayment,
  deleteCustomer,
} from '../controllers/customerController';
import { authenticate } from '../middleware/auth';
import { requireStaff } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, getCustomers);
router.get('/:id', authenticate, getCustomerById);
router.get('/:id/ledger', authenticate, getCustomerLedger);
router.post('/', authenticate, requireStaff, createCustomer);
router.put('/:id', authenticate, requireStaff, updateCustomer);
router.delete('/:id', authenticate, requireStaff, deleteCustomer);
router.post('/:id/payments', authenticate, requireStaff, recordCustomerPayment);

export default router;