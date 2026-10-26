import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const getPurchases = async (req: Request, res: Response) => {
  try {
    const { supplier_id, status } = req.query;
    const where: any = {};
    if (supplier_id) where.supplier_id = String(supplier_id);
    if (status) where.status = String(status);

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: true,
        items: true,
      },
      orderBy: { purchase_date: 'desc' },
    });

    return sendSuccess(res, purchases);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const {
      supplier_id,
      warehouse_id,
      items,
      paid_amount = 0,
      notes,
    } = req.body;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Supplier and at least one item are required', 400);
    }

    // Pre-validate serialized product serial numbers against quantity
    const productIds = items.map((it: any) => it.product_id).filter(Boolean);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    const allSubmittedSerials = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const prod = productMap.get(it.product_id);
      const qty = Number(it.quantity);

      if (isNaN(qty) || qty <= 0) {
        return sendError(res, `Invalid quantity for line item #${i + 1}`, 400);
      }

      if (prod?.is_serialized) {
        if (!it.serial_numbers || !Array.isArray(it.serial_numbers)) {
          return sendError(
            res,
            `Product "${prod.name}" is serialized and requires ${qty} serial number(s).`,
            400
          );
        }

        const cleanSerials = it.serial_numbers
          .map((s: any) => String(s).trim())
          .filter((s: string) => s.length > 0);

        if (cleanSerials.length !== qty) {
          return sendError(
            res,
            `Product "${prod.name}" requires exactly ${qty} serial number(s), but ${cleanSerials.length} were provided.`,
            400
          );
        }

        // Check for duplicates within this item or across items in this PO
        for (const sn of cleanSerials) {
          if (allSubmittedSerials.has(sn)) {
            return sendError(
              res,
              `Duplicate serial number "${sn}" detected in purchase order items. Each unit must have a unique serial number.`,
              400
            );
          }
          allSubmittedSerials.add(sn);
        }

        it.serial_numbers = cleanSerials;
      }
    }

    const year = new Date().getFullYear();
    const count = await prisma.purchase.count();
    let nextNum = count + 1;
    let po_no = `PO-${year}-${String(nextNum).padStart(4, '0')}`;
    while (await prisma.purchase.findUnique({ where: { po_no } })) {
      nextNum++;
      po_no = `PO-${year}-${String(nextNum).padStart(4, '0')}`;
    }

    const total_amount = items.reduce(
      (acc: number, item: any) => acc + Number(item.quantity) * Number(item.unit_cost),
      0
    );
    const paid = Number(paid_amount);
    const balance_amount = Math.max(0, total_amount - paid);
    const payment_status = paid >= total_amount ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

    const purchase = await prisma.purchase.create({
      data: {
        po_no,
        supplier_id,
        warehouse_id: warehouse_id || null,
        branch_id: req.user?.branch_id || null,
        total_amount,
        paid_amount: paid,
        balance_amount,
        payment_status,
        status: 'RECEIVED', // Auto-receive and inventory
        purchase_date: new Date(),
        notes,
        created_by: req.user?.full_name || 'Staff',
      },
    });

    const registered_serials: string[] = [];
    const skipped_duplicates: string[] = [];

    // Process items & update stock
    for (const it of items) {
      const pItem = await prisma.purchaseItem.create({
        data: {
          purchase_id: purchase.id,
          product_id: it.product_id,
          variant_id: it.variant_id || null,
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost),
          total_cost: Number(it.quantity) * Number(it.unit_cost),
          serial_numbers_json: it.serial_numbers ? JSON.stringify(it.serial_numbers) : null,
        },
      });

      // Stock update
      if (warehouse_id) {
        let inv = await prisma.inventory.findFirst({
          where: {
            warehouse_id,
            product_id: it.product_id,
            variant_id: it.variant_id || null,
          },
        });

        const qty = Number(it.quantity);
        const cost = Number(it.unit_cost);

        if (inv) {
          const newQty = inv.quantity + qty;
          const newAvgCost = (inv.quantity * inv.avg_cost + qty * cost) / newQty;
          await prisma.inventory.update({
            where: { id: inv.id },
            data: {
              quantity: newQty,
              available_qty: newQty - inv.reserved_qty,
              avg_cost: Math.round(newAvgCost),
            },
          });
        } else {
          await prisma.inventory.create({
            data: {
              warehouse_id,
              product_id: it.product_id,
              variant_id: it.variant_id || null,
              quantity: qty,
              available_qty: qty,
              reserved_qty: 0,
              avg_cost: cost,
            },
          });
        }

        await prisma.inventoryTransaction.create({
          data: {
            transaction_no: `TXN-PUR-${Date.now().toString().slice(-6)}`,
            warehouse_id,
            product_id: it.product_id,
            variant_id: it.variant_id || null,
            type: 'PURCHASE_IN',
            quantity: qty,
            before_qty: inv ? inv.quantity : 0,
            after_qty: inv ? inv.quantity + qty : qty,
            reference_type: 'PURCHASE',
            reference_id: purchase.id,
            unit_cost: cost,
            notes: `Auto inventory inward from PO ${po_no}`,
            created_by: req.user?.full_name || 'Staff',
            branch_id: req.user?.branch_id || null,
          },
        });
      }

      // Register serial numbers if provided
      if (it.serial_numbers && Array.isArray(it.serial_numbers)) {
        for (const rawSn of it.serial_numbers) {
          const sn = String(rawSn).trim();
          if (!sn) continue;

          const existing = await prisma.serialNumber.findUnique({ where: { serial_no: sn } });
          if (existing) {
            skipped_duplicates.push(sn);
          } else {
            await prisma.serialNumber.create({
              data: {
                serial_no: sn,
                product_id: it.product_id,
                variant_id: it.variant_id || null,
                warehouse_id: warehouse_id || null,
                status: 'IN_STOCK',
                purchase_date: new Date(),
                purchase_item_id: pItem.id,
                notes: `Received from PO ${po_no}`,
              },
            });
            registered_serials.push(sn);
          }
        }
      }
    }

    // Update Supplier ledger
    await prisma.supplier.update({
      where: { id: supplier_id },
      data: {
        total_purchased: { increment: total_amount },
        amount_paid: { increment: paid },
        outstanding_payable: { increment: balance_amount },
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE_PURCHASE',
      entity: 'Purchase',
      entityId: purchase.id,
      newData: { po_no, total_amount, paid_amount: paid, registered_serials: registered_serials.length, skipped_duplicates },
    });

    let message = `Purchase Order ${po_no} saved and stock received into inventory!`;
    if (registered_serials.length > 0) {
      message += ` Registered ${registered_serials.length} serial numbers.`;
    }
    if (skipped_duplicates.length > 0) {
      message += ` Warning: ${skipped_duplicates.length} duplicate serial numbers were skipped: [${skipped_duplicates.join(', ')}].`;
    }

    return sendSuccess(
      res,
      {
        ...purchase,
        registered_serials,
        skipped_duplicates,
      },
      message,
      201
    );
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updatePurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paid_amount, payment_status, notes, status } = req.body;

    const existing = await prisma.purchase.findUnique({
      where: { id },
      include: { supplier: true },
    });
    if (!existing) {
      return sendError(res, 'Purchase order not found', 404);
    }

    const dataToUpdate: any = {};
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (status) dataToUpdate.status = status;

    if (paid_amount !== undefined) {
      const newPaid = Number(paid_amount);
      const paidDiff = newPaid - existing.paid_amount;
      const newBalance = Math.max(0, existing.total_amount - newPaid);
      const newPaymentStatus = payment_status || (newPaid >= existing.total_amount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID');

      dataToUpdate.paid_amount = newPaid;
      dataToUpdate.balance_amount = newBalance;
      dataToUpdate.payment_status = newPaymentStatus;

      // Adjust supplier balance
      if (existing.supplier_id && paidDiff !== 0) {
        await prisma.supplier.update({
          where: { id: existing.supplier_id },
          data: {
            amount_paid: { increment: paidDiff },
            outstanding_payable: { decrement: paidDiff },
          },
        });
      }
    } else if (payment_status) {
      dataToUpdate.payment_status = payment_status;
    }

    const updated = await prisma.purchase.update({
      where: { id },
      data: dataToUpdate,
      include: { supplier: true, items: true },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE_PURCHASE',
      entity: 'Purchase',
      entityId: id,
      newData: dataToUpdate,
    });

    return sendSuccess(res, updated, 'Purchase order updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deletePurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return sendError(res, 'Purchase order not found', 404);
    }

    // 1. Reverse supplier ledger
    if (existing.supplier_id) {
      await prisma.supplier.update({
        where: { id: existing.supplier_id },
        data: {
          total_purchased: { decrement: existing.total_amount },
          amount_paid: { decrement: existing.paid_amount },
          outstanding_payable: { decrement: existing.balance_amount },
        },
      });
    }

    // 2. Delete serial numbers created by this PO that are still IN_STOCK
    for (const it of existing.items) {
      await prisma.serialNumber.deleteMany({
        where: {
          purchase_item_id: it.id,
          status: 'IN_STOCK',
        },
      });
    }

    // 3. Delete inventory transactions
    await prisma.inventoryTransaction.deleteMany({
      where: {
        reference_id: id,
        reference_type: 'PURCHASE',
      },
    });

    // 4. Delete purchase items and purchase
    await prisma.purchaseItem.deleteMany({ where: { purchase_id: id } });
    await prisma.purchase.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE_PURCHASE',
      entity: 'Purchase',
      entityId: id,
      newData: { po_no: existing.po_no, deleted: true },
    });

    return sendSuccess(res, null, `Purchase order ${existing.po_no} deleted successfully`);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};