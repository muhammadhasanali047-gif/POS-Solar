import { Router } from 'express';
import {
  getInventoryStock,
  getTransactions,
  adjustStock,
  getWarehouses,
  createStockTransfer,
  getStockTransfers,
  updateInventory,
  deleteInventory,
} from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAdmin, requireAdmin } from '../middleware/rbac';

const router = Router();

router.get('/stock', authenticate, getInventoryStock);
router.put('/stock/:id', authenticate, requireAdmin, updateInventory);
router.delete('/stock/:id', authenticate, requireAdmin, deleteInventory);

router.get('/transactions', authenticate, getTransactions);
router.get('/warehouses', authenticate, getWarehouses);
router.get('/transfers', authenticate, getStockTransfers);
router.post('/adjust', authenticate, requireManagerOrAdmin, adjustStock);
router.post('/transfers', authenticate, requireManagerOrAdmin, createStockTransfer);

export default router;