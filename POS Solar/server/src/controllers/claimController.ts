import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const getClaims = async (req: Request, res: Response) => {
  try {
    const { status, claim_type } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (claim_type) where.claim_type = String(claim_type);

    const claims = await prisma.warrantyClaim.findMany({
      where,
      include: {
        warranty: {
          include: { serial_number: { include: { product: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const enriched = await Promise.all(
      claims.map(async (c) => {
        const customer = await prisma.customer.findUnique({ where: { id: c.customer_id } });
        return {
          ...c,
          customer,
        };
      })
    );

    return sendSuccess(res, enriched);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createClaim = async (req: Request, res: Response) => {
  try {
    const {
      warranty_id,
      customer_id,
      serial_number_id,
      original_invoice_no,
      complaint,
      claim_type = 'REPAIR',
      assigned_technician,
      diagnosis,
      repair_details,
      parts_used,
      replacement_serial_no,
      service_cost = 0,
      warranty_cost = 0,
      internal_notes,
      customer_remarks,
    } = req.body;

    if (!warranty_id || !complaint) {
      return sendError(res, 'Warranty ID and Complaint description are required', 400);
    }

    const count = await prisma.warrantyClaim.count();
    const claim_no = `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newClaim = await prisma.warrantyClaim.create({
      data: {
        claim_no,
        warranty_id,
        customer_id,
        serial_number_id,
        original_invoice_no,
        complaint,
        claim_type,
        assigned_technician,
        diagnosis,
        repair_details,
        parts_used,
        replacement_serial_no,
        service_cost: Number(service_cost),
        warranty_cost: Number(warranty_cost),
        status: 'RECEIVED',
        internal_notes,
        customer_remarks,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'WarrantyClaim',
      entityId: newClaim.id,
      newData: newClaim,
    });

    return sendSuccess(res, newClaim, `Claim #${claim_no} registered successfully`, 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateClaim = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      complaint,
      claim_type,
      assigned_technician,
      diagnosis,
      repair_details,
      parts_used,
      replacement_serial_no,
      resolution,
      service_cost,
      warranty_cost,
      internal_notes,
      customer_remarks,
    } = req.body;

    const dataToUpdate: any = {};
    if (status) {
      dataToUpdate.status = status;
      if (['RESOLVED', 'CLOSED'].includes(status)) {
        dataToUpdate.resolution_date = new Date();
      }
    }
    if (complaint !== undefined) dataToUpdate.complaint = complaint;
    if (claim_type !== undefined) dataToUpdate.claim_type = claim_type;
    if (assigned_technician !== undefined) dataToUpdate.assigned_technician = assigned_technician;
    if (diagnosis !== undefined) dataToUpdate.diagnosis = diagnosis;
    if (repair_details !== undefined) dataToUpdate.repair_details = repair_details;
    if (parts_used !== undefined) dataToUpdate.parts_used = parts_used;
    if (replacement_serial_no !== undefined) dataToUpdate.replacement_serial_no = replacement_serial_no;
    if (resolution !== undefined) dataToUpdate.resolution = resolution;
    if (service_cost !== undefined) dataToUpdate.service_cost = Number(service_cost);
    if (warranty_cost !== undefined) dataToUpdate.warranty_cost = Number(warranty_cost);
    if (internal_notes !== undefined) dataToUpdate.internal_notes = internal_notes;
    if (customer_remarks !== undefined) dataToUpdate.customer_remarks = customer_remarks;

    const updated = await prisma.warrantyClaim.update({
      where: { id },
      data: dataToUpdate,
    });

    // If replacement serial was issued, swap serial status
    if (replacement_serial_no && status === 'RESOLVED') {
      const oldClaim = await prisma.warrantyClaim.findUnique({ where: { id } });
      if (oldClaim && oldClaim.serial_number_id) {
        await prisma.serialNumber.update({
          where: { id: oldClaim.serial_number_id },
          data: { status: 'DEFECTIVE' },
        });

        const newSerial = await prisma.serialNumber.findUnique({
          where: { serial_no: replacement_serial_no },
        });
        if (newSerial) {
          await prisma.serialNumber.update({
            where: { id: newSerial.id },
            data: {
              status: 'INSTALLED',
              current_customer_id: oldClaim.customer_id,
              sale_date: new Date(),
            },
          });
        }
      }
    }

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'WarrantyClaim',
      entityId: id,
      newData: dataToUpdate,
    });

    return sendSuccess(res, updated, 'Claim updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deleteClaim = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const claim = await prisma.warrantyClaim.findUnique({ where: { id } });
    if (!claim) {
      return sendError(res, 'Warranty claim not found', 404);
    }

    await prisma.warrantyClaim.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'WarrantyClaim',
      entityId: id,
      newData: { claim_no: claim.claim_no },
    });

    return sendSuccess(res, null, `Warranty claim #${claim.claim_no} deleted successfully`);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};