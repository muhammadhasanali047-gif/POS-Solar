import { Router } from 'express';
import {
  login,
  getMe,
  getUsers,
  createUser,
  changePassword,
  resetUserPassword,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, requireAdmin, getUsers);
router.post('/users', authenticate, requireAdmin, createUser);
router.post('/change-password', authenticate, changePassword);
router.post('/reset-password', authenticate, requireAdmin, resetUserPassword);

export default router;