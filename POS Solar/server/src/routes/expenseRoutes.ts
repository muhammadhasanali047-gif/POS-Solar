import { Router } from 'express';
import { getExpenses, createExpense, getProfitSummary } from '../controllers/expenseController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAdmin } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, requireManagerOrAdmin, getExpenses);
router.get('/profit-summary', authenticate, requireManagerOrAdmin, getProfitSummary);
router.post('/', authenticate, requireManagerOrAdmin, createExpense);

export default router;