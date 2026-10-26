import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const getWarranties = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const warranties = await prisma.warranty.findMany({
      include: {
        serial_number: {
          include: { product: true, variant: true },
        },
        claims: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const enriched = await Promise.all(
      warranties.map(async (w) => {
        const customer = await prisma.customer.findUnique({ where: { id: w.customer_id } });
        let product = w.serial_number?.product;
        if (!product && w.product_id) {
          product = await prisma.product.findUnique({ where: { id: w.product_id } }) as any;
        }
        const endDate = new Date(w.end_date);
        let dynamicStatus = w.status;

        if (w.status === 'ACTIVE') {
          if (endDate < now) dynamicStatus = 'EXPIRED';
          else if (endDate <= thirtyDaysFromNow) dynamicStatus = 'EXPIRING_SOON';
        }

        return {
          ...w,
          customer,
          product,
          dynamic_status: dynamicStatus,
        };
      })
    );

    let filtered = enriched;
    if (status) {
      filtered = filtered.filter((w) => w.dynamic_status === status || w.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.warranty_no.toLowerCase().includes(q) ||
          (w.serial_number?.serial_no && w.serial_number.serial_no.toLowerCase().includes(q)) ||
          (w.product?.name && w.product.name.toLowerCase().includes(q)) ||
          (w.customer?.name && w.customer.name.toLowerCase().includes(q))
      );
    }

    return sendSuccess(res, filtered);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateWarranty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { duration_months, status, start_date, end_date, terms, warranty_type } = req.body;

    const warranty = await prisma.warranty.findUnique({ where: { id } });
    if (!warranty) {
      return sendError(res, 'Warranty certificate not found', 404);
    }

    const dataToUpdate: any = {};
    if (duration_months !== undefined) dataToUpdate.duration_months = Number(duration_months);
    if (status !== undefined) dataToUpdate.status = status;
    if (start_date !== undefined) dataToUpdate.start_date = new Date(start_date);
    if (end_date !== undefined) dataToUpdate.end_date = new Date(end_date);
    if (terms !== undefined) dataToUpdate.terms = terms;
    if (warranty_type !== undefined) dataToUpdate.warranty_type = warranty_type;

    const updated = await prisma.warranty.update({
      where: { id },
      data: dataToUpdate,
      include: {
        serial_number: { include: { product: true, variant: true } },
        claims: true,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Warranty',
      entityId: id,
      newData: dataToUpdate,
    });

    return sendSuccess(res, updated, 'Warranty certificate updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deleteWarranty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const warranty = await prisma.warranty.findUnique({
      where: { id },
      include: { claims: true },
    });

    if (!warranty) {
      return sendError(res, 'Warranty certificate not found', 404);
    }

    // Delete associated claims first to maintain relational integrity
    if (warranty.claims && warranty.claims.length > 0) {
      await prisma.warrantyClaim.deleteMany({ where: { warranty_id: id } });
    }

    await prisma.warranty.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Warranty',
      entityId: id,
      newData: { warranty_no: warranty.warranty_no },
    });

    return sendSuccess(res, null, `Warranty certificate #${warranty.warranty_no} deleted successfully`);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};