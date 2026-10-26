import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: { select: { purchases: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return sendSuccess(res, suppliers);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          include: { items: true },
          orderBy: { purchase_date: 'desc' },
        },
      },
    });

    if (!supplier) return sendError(res, 'Supplier not found', 404);
    return sendSuccess(res, supplier);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { company_name, contact_person, phone, email, address, notes } = req.body;
    if (!company_name || !phone) {
      return sendError(res, 'Company name and phone are required', 400);
    }

    const count = await prisma.supplier.count();
    const supplier_no = `SUP-${String(count + 1).padStart(3, '0')}`;

    const newSupplier = await prisma.supplier.create({
      data: {
        supplier_no,
        company_name,
        contact_person,
        phone,
        email,
        address,
        notes,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Supplier',
      entityId: newSupplier.id,
      newData: newSupplier,
    });

    return sendSuccess(res, newSupplier, 'Supplier created successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { company_name, contact_person, phone, email, address, notes } = req.body;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Supplier not found', 404);
    }

    const dataToUpdate: any = {};
    if (company_name) dataToUpdate.company_name = company_name;
    if (contact_person !== undefined) dataToUpdate.contact_person = contact_person;
    if (phone) dataToUpdate.phone = phone;
    if (email !== undefined) dataToUpdate.email = email;
    if (address !== undefined) dataToUpdate.address = address;
    if (notes !== undefined) dataToUpdate.notes = notes;

    const updated = await prisma.supplier.update({
      where: { id },
      data: dataToUpdate,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Supplier',
      entityId: id,
      newData: dataToUpdate,
    });

    return sendSuccess(res, updated, 'Supplier updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Supplier not found', 404);
    }

    const purchasesCount = await prisma.purchase.count({ where: { supplier_id: id } });
    if (purchasesCount > 0) {
      return sendError(
        res,
        `Cannot delete supplier with ${purchasesCount} purchase orders. Please delete associated purchases first or adjust records.`,
        400
      );
    }

    await prisma.supplier.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Supplier',
      entityId: id,
      newData: { company_name: existing.company_name, deleted: true },
    });

    return sendSuccess(res, null, `Supplier "${existing.company_name}" deleted successfully`);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};