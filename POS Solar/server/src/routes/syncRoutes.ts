import { Router } from 'express';
import {
  healthCheck,
  pushSyncQueue,
  pullMasterData,
  getFirebaseSyncStatus,
  syncAllToFirebase,
  testFirebase,
} from '../controllers/syncController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Health check is public for lightweight connectivity detection
router.get('/health', healthCheck);

// Firebase cloud connectivity & status endpoints
router.get('/firebase-status', getFirebaseSyncStatus);
router.get('/firebase-test', testFirebase);
router.post('/firebase-sync-all', authenticate, syncAllToFirebase);

// Push and Pull require auth
router.post('/push', authenticate, pushSyncQueue);
router.get('/pull', authenticate, pullMasterData);

export default router;