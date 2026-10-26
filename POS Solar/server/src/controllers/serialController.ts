import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const searchSerial = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query) {
      return sendError(res, 'Search query is required', 400);
    }

    const q = String(query).trim();
    const serials = await prisma.serialNumber.findMany({
      where: {
        serial_no: { contains: q },
      },
      include: {
        product: { include: { brand: true, category: true } },
        variant: true,
        warehouse: true,
        warranties: {
          include: { claims: true },
        },
      },
      take: 25,
    });

    return sendSuccess(res, serials);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getSerialHistory = async (req: Request, res: Response) => {
  try {
    const { serial_no } = req.params;
    const serial = await prisma.serialNumber.findUnique({
      where: { serial_no },
      include: {
        product: { include: { brand: true, category: true } },
        variant: true,
        warehouse: true,
        warranties: {
          include: { claims: true },
        },
      },
    });

    if (!serial) {
      return sendError(res, `Serial number '${serial_no}' not found`, 404);
    }

    // Customer details if sold
    let customer: any = null;
    if (serial.current_customer_id) {
      customer = await prisma.customer.findUnique({
        where: { id: serial.current_customer_id },
      });
    }

    // Linked Sale & Invoice
    let sale: any = null;
    let installation: any = null;
    if (serial.sale_item_id) {
      const saleItem = await prisma.saleItem.findUnique({
        where: { id: serial.sale_item_id },
        include: { sale: { include: { customer: true } } },
      });
      if (saleItem) {
        sale = saleItem.sale;
        if (!customer && sale.customer) customer = sale.customer;
        installation = await prisma.installation.findFirst({
          where: { sale_id: sale.id },
        });
      }
    }

    if (!sale) {
      const saleItems = await prisma.saleItem.findMany({
        where: {
          product_id: serial.product_id,
          serial_numbers_json: { not: null },
        },
        include: { sale: { include: { customer: true } } },
      });
      for (const item of saleItems) {
        try {
          const serials = JSON.parse(item.serial_numbers_json || '[]');
          if (serials.includes(serial.serial_no)) {
            sale = item.sale;
            if (!customer && item.sale.customer) {
              customer = item.sale.customer;
            }
            installation = await prisma.installation.findFirst({
              where: { sale_id: sale.id },
            });
            break;
          }
        } catch {}
      }
    }

    if (!sale && serial.current_customer_id) {
      sale = await prisma.sale.findFirst({
        where: { customer_id: serial.current_customer_id },
        orderBy: { created_at: 'desc' },
      });
      if (sale) {
        installation = await prisma.installation.findFirst({
          where: { sale_id: sale.id },
        });
      }
    }

    // Construct Timeline Events
    const timeline = [];

    if (serial.purchase_date) {
      timeline.push({
        event: 'PURCHASED_AND_RECEIVED',
        title: 'Received into Warehouse',
        date: serial.purchase_date,
        description: `Imported and inventoried at ${serial.warehouse?.name || 'Warehouse'}.`,
        badge: 'Inward',
      });
    }

    if (serial.sale_date) {
      timeline.push({
        event: 'SOLD',
        title: 'Sold to Customer',
        date: serial.sale_date,
        description: `Sold to ${customer?.name || 'Customer'} (Invoice: ${sale?.invoice_no || 'N/A'}).`,
        badge: 'Sale',
      });
    }

    if (installation) {
      timeline.push({
        event: 'INSTALLATION',
        title: `Installation Job (${installation.status})`,
        date: installation.scheduled_date || installation.created_at,
        description: `Assigned to: ${installation.assigned_technician || 'Technician'}. Status: ${installation.status}.`,
        badge: 'Installation',
      });
    }

    if (serial.warranties && serial.warranties.length > 0) {
      const w = serial.warranties[0];
      timeline.push({
        event: 'WARRANTY_ACTIVATED',
        title: `Warranty Active (${w.duration_months} Months)`,
        date: w.start_date,
        description: `Valid until ${new Date(w.end_date).toLocaleDateString()}. Policy: ${w.status}.`,
        badge: 'Warranty',
      });

      for (const clm of w.claims) {
        timeline.push({
          event: 'WARRANTY_CLAIM',
          title: `Claim #${clm.claim_no} (${clm.status})`,
          date: clm.created_at,
          description: `Complaint: ${clm.complaint}. Resolution: ${clm.resolution || 'Under inspection'}.`,
          badge: 'Claim',
        });
      }
    }

    return sendSuccess(res, {
      serial,
      customer,
      sale,
      installation,
      timeline: timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createSerial = async (req: Request, res: Response) => {
  try {
    const { serial_no, product_id, variant_id, warehouse_id, notes } = req.body;
    if (!serial_no || !product_id) {
      return sendError(res, 'Serial number and product ID are required', 400);
    }

    const existing = await prisma.serialNumber.findUnique({ where: { serial_no } });
    if (existing) {
      return sendError(res, `Serial number '${serial_no}' already exists in the system`, 400);
    }

    const newSerial = await prisma.serialNumber.create({
      data: {
        serial_no,
        product_id,
        variant_id: variant_id || null,
        warehouse_id: warehouse_id || null,
        status: 'IN_STOCK',
        purchase_date: new Date(),
        notes,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'SerialNumber',
      entityId: newSerial.id,
      newData: newSerial,
    });

    return sendSuccess(res, newSerial, 'Serial number registered successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};