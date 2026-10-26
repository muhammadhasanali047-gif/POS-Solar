import { Router } from 'express';
import { getReports } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';

const router = Router();

// Reports are accessible by Admin and CEO, and Manager
router.get('/:type', authenticate, requireRoles(['ADMIN', 'CEO', 'MANAGER']), getReports);

export default router;