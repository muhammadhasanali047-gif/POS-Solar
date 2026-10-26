import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';
import { FirebaseService } from '../services/firebaseService';
import { testFirestoreConnection, isFirebaseConnected, projectId } from '../config/firebase';

export const healthCheck = async (req: Request, res: Response) => {
  return sendSuccess(res, {
    status: 'ONLINE',
    server_time: new Date().toISOString(),
    version: '1.0.0',
    database: 'CONNECTED',
  });
};

export const pushSyncQueue = async (req: Request, res: Response) => {
  try {
    const { items, device_id, branch_id } = req.body;
    if (!items || !Array.isArray(items)) {
      return sendError(res, 'Items array required for sync push', 400);
    }

    const results = [];

    for (const item of items) {
      const { client_uuid, entity, operation, payload, client_timestamp } = item;

      // 1. Idempotency check: Have we already processed this client UUID?
      const existing = await prisma.syncQueue.findUnique({
        where: { client_uuid },
      });

      if (existing && existing.status === 'SYNCED') {
        results.push({
          client_uuid,
          status: 'ALREADY_SYNCED',
          synced_at: existing.synced_at,
        });
        continue;
      }

      try {
        let serverId = '';
        const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;

        // Apply entity mutation
        if (entity === 'Sale' && operation === 'INSERT') {
          const created = await prisma.sale.create({
            data: {
              ...parsedPayload,
              created_by: parsedPayload.created_by || 'Offline Client Sync',
            },
          });
          serverId = created.id;
        } else if (entity === 'Payment' && operation === 'INSERT') {
          const created = await prisma.payment.create({
            data: parsedPayload,
          });
          serverId = created.id;
        } else if (entity === 'Customer' && operation === 'INSERT') {
          const created = await prisma.customer.create({
            data: parsedPayload,
          });
          serverId = created.id;
        } else if (entity === 'Quotation' && operation === 'INSERT') {
          const created = await prisma.quotation.create({
            data: parsedPayload,
          });
          serverId = created.id;
        } else if (entity === 'WarrantyClaim' && operation === 'INSERT') {
          const created = await prisma.warrantyClaim.create({
            data: parsedPayload,
          });
          serverId = created.id;
        } else if (entity === 'Expense' && operation === 'INSERT') {
          const created = await prisma.expense.create({
            data: parsedPayload,
          });
          serverId = created.id;
        }

        // Record in SyncQueue
        await prisma.syncQueue.upsert({
          where: { client_uuid },
          create: {
            client_uuid,
            client_branch_id: branch_id || null,
            device_id: device_id || null,
            entity,
            operation,
            payload: JSON.stringify(parsedPayload),
            status: 'SYNCED',
            client_timestamp: new Date(client_timestamp || Date.now()),
            synced_at: new Date(),
          },
          update: {
            status: 'SYNCED',
            synced_at: new Date(),
          },
        });

        results.push({
          client_uuid,
          server_id: serverId,
          status: 'SUCCESS',
        });
      } catch (opErr: any) {
        console.error(`Sync error on UUID ${client_uuid}:`, opErr);
        await prisma.syncQueue.upsert({
          where: { client_uuid },
          create: {
            client_uuid,
            client_branch_id: branch_id || null,
            device_id: device_id || null,
            entity,
            operation,
            payload: JSON.stringify(payload),
            status: 'FAILED',
            error_message: opErr.message,
            client_timestamp: new Date(client_timestamp || Date.now()),
          },
          update: {
            status: 'FAILED',
            error_message: opErr.message,
            attempts: { increment: 1 },
          },
        });

        results.push({
          client_uuid,
          status: 'FAILED',
          error: opErr.message,
        });
      }
    }

    return sendSuccess(res, { results }, 'Sync batch processed successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const pullMasterData = async (req: Request, res: Response) => {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(String(since)) : new Date(0);

    const products = await prisma.product.findMany({
      where: { updated_at: { gte: sinceDate } },
      include: { variants: true, category: true, brand: true },
    });

    const customers = await prisma.customer.findMany({
      where: { updated_at: { gte: sinceDate } },
    });

    const packages = await prisma.solarPackage.findMany({
      where: { updated_at: { gte: sinceDate } },
      include: { items: true },
    });

    const dealers = await prisma.dealer.findMany({
      where: { updated_at: { gte: sinceDate } },
    });

    const warehouses = await prisma.warehouse.findMany();

    return sendSuccess(res, {
      pulled_at: new Date().toISOString(),
      products,
      customers,
      packages,
      dealers,
      warehouses,
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getFirebaseSyncStatus = async (req: Request, res: Response) => {
  try {
    const status = await FirebaseService.getStatus();
    return sendSuccess(res, status);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const syncAllToFirebase = async (req: Request, res: Response) => {
  try {
    const stats = await FirebaseService.syncAllToFirestore();
    return sendSuccess(res, stats, 'Successfully synchronized all master data to Firebase Firestore');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const testFirebase = async (req: Request, res: Response) => {
  try {
    const result = await testFirestoreConnection();
    if (result.success) {
      return sendSuccess(res, result);
    } else {
      return sendError(res, result.message, 500);
    }
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};