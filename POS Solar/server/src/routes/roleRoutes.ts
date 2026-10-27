import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { getRolePermissions, updateRolePermissions } from '../controllers/roleController';

const router = Router();

// Any authenticated user can read permissions to populate their sidebar
router.get('/access', authenticate, getRolePermissions);

// Only Admin / CEO can update permissions
router.post('/access', authenticate, requireAdmin, updateRolePermissions);

export default router;
