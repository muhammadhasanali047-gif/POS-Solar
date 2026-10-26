import { Router } from 'express';
import { login, getMe, getUsers, createUser } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, requireAdmin, getUsers);
router.post('/users', authenticate, requireAdmin, createUser);

export default router;