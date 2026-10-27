import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';
import { FirebaseService } from '../services/firebaseService';

export const getInventoryStock = async (req: Request, res: Response) => {
  try {
    const { warehouse_id, search, low_stock } = req.query;

    const where: any = {};
    if (warehouse_id) where.warehouse_id = String(warehouse_id);

    const inventories = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          include: { category: true, brand: true },
        },
        variant: true,
        warehouse: true,
      },
      orderBy: { quantity: 'desc' },
    });

    let results = inventories.map((i) => ({
      ...i,
      total_value: i.quantity * i.avg_cost,
      is_low_stock: i.quantity <= (i.product.min_stock_alert || 5),
    }));

    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter(
        (r) =>
          r.product.name.toLowerCase().includes(q) ||
          r.product.model_number?.toLowerCase().includes(q) ||
          r.variant?.sku.toLowerCase().includes(q)
      );
    }

    if (low_stock === 'true') {
      results = results.filter((r) => r.is_low_stock);
    }

    return sendSuccess(res, results);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const { type, limit = '100' } = req.query;
    const where: any = {};
    if (type) where.type = String(type);

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
    });

    // Enriched with product names
    const enriched = await Promise.all(
      transactions.map(async (t) => {
        const prod = await prisma.product.findUnique({ where: { id: t.product_id } });
        const wh = await prisma.warehouse.findUnique({ where: { id: t.warehouse_id } });
        return {
          ...t,
          product_name: prod ? prod.name : 'Unknown',
          warehouse_name: wh ? wh.name : 'Unknown',
        };
      })
    );

    return sendSuccess(res, enriched);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { warehouse_id, product_id, variant_id, type, quantity, reason, unit_cost } = req.body;

    if (!warehouse_id || !product_id || !type || quantity === undefined) {
      return sendError(res, 'warehouse_id, product_id, type, and quantity are required', 400);
    }

    let resolvedProductId = product_id;
    let prod = await prisma.product.findUnique({ where: { id: product_id } });
    if (!prod) {
      // Check if product_id is actually a product name
      prod = await prisma.product.findFirst({
        where: { name: { equals: product_id.trim() } },
      });
      if (prod) {
        resolvedProductId = prod.id;
      } else {
        // Auto-create product with first category and brand or create defaults
        let defaultCat = await prisma.category.findFirst();
        if (!defaultCat) {
          defaultCat = await prisma.category.create({
            data: { name: 'Solar Panels', slug: 'solar-panels', is_active: true }
          });
        }
        let defaultBrand = await prisma.brand.findFirst();
        if (!defaultBrand) {
          defaultBrand = await prisma.brand.create({
            data: { name: 'General', is_active: true }
          });
        }
        const newProd = await prisma.product.create({
          data: {
            name: product_id.trim(),
            category_id: defaultCat.id,
            brand_id: defaultBrand.id,
            purchase_price: Number(unit_cost) || 0,
            sale_price: (Number(unit_cost) || 0) * 1.15,
            is_active: true,
          }
        });
        resolvedProductId = newProd.id;
      }
    }

    const qty = Number(quantity);
    let inv = await prisma.inventory.findFirst({
      where: {
        warehouse_id,
        product_id: resolvedProductId,
        variant_id: variant_id || null,
      },
    });

    const beforeQty = inv ? inv.quantity : 0;
    let afterQty = beforeQty;

    if (['PURCHASE_IN', 'RETURN_IN', 'ADJUSTMENT_ADD'].includes(type)) {
      afterQty = beforeQty + qty;
    } else if (['SALE_OUT', 'DAMAGE_OUT', 'ADJUSTMENT_SUB'].includes(type)) {
      if (beforeQty < qty) {
        return sendError(res, `Insufficient stock. Current: ${beforeQty}, Requested: ${qty}`, 400);
      }
      afterQty = beforeQty - qty;
    }

    if (inv) {
      inv = await prisma.inventory.update({
        where: { id: inv.id },
        data: {
          quantity: afterQty,
          available_qty: afterQty - inv.reserved_qty,
          avg_cost: unit_cost ? Number(unit_cost) : inv.avg_cost,
        },
      });
    } else {
      inv = await prisma.inventory.create({
        data: {
          warehouse_id,
          product_id: resolvedProductId,
          variant_id: variant_id || null,
          quantity: afterQty,
          available_qty: afterQty,
          reserved_qty: 0,
          avg_cost: Number(unit_cost) || 0,
        },
      });
    }

    const txnNo = `TXN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const txn = await prisma.inventoryTransaction.create({
      data: {
        transaction_no: txnNo,
        warehouse_id,
        product_id: resolvedProductId,
        variant_id: variant_id || null,
        type,
        quantity: qty,
        before_qty: beforeQty,
        after_qty: afterQty,
        reference_type: 'MANUAL_ADJUSTMENT',
        unit_cost: Number(unit_cost) || 0,
        notes: reason || 'Manual inventory adjustment',
        created_by: req.user?.full_name || 'Staff',
        branch_id: req.user?.branch_id || null,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'STOCK_ADJUSTMENT',
      entity: 'Inventory',
      entityId: inv.id,
      newData: { type, quantity: qty, beforeQty, afterQty, reason },
    });

    FirebaseService.syncInventory(inv).catch(() => {});

    return sendSuccess(res, { inventory: inv, transaction: txn }, 'Stock adjusted successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { branch: true },
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, warehouses);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createStockTransfer = async (req: Request, res: Response) => {
  try {
    const { from_warehouse_id, to_warehouse_id, product_id, variant_id, quantity, notes } = req.body;

    if (!from_warehouse_id || !to_warehouse_id || !product_id || !quantity) {
      return sendError(res, 'from_warehouse_id, to_warehouse_id, product_id, and quantity are required', 400);
    }

    if (from_warehouse_id === to_warehouse_id) {
      return sendError(res, 'Source and destination warehouses cannot be the same', 400);
    }

    const qty = Number(quantity);
    if (qty <= 0) {
      return sendError(res, 'Transfer quantity must be greater than zero', 400);
    }

    const whereFrom: any = {
      warehouse_id: from_warehouse_id,
      product_id,
    };
    if (variant_id) whereFrom.variant_id = variant_id;

    const invFrom = await prisma.inventory.findFirst({
      where: whereFrom,
      orderBy: { quantity: 'desc' },
    });

    if (!invFrom || invFrom.available_qty < qty) {
      return sendError(
        res,
        `Insufficient stock in source warehouse. Available: ${invFrom?.available_qty || 0}, Requested: ${qty}`,
        400
      );
    }

    // Deduct from source warehouse
    const updatedFrom = await prisma.inventory.update({
      where: { id: invFrom.id },
      data: {
        quantity: invFrom.quantity - qty,
        available_qty: invFrom.available_qty - qty,
      },
    });

    // Add to destination warehouse
    let invTo = await prisma.inventory.findFirst({
      where: {
        warehouse_id: to_warehouse_id,
        product_id,
        variant_id: invFrom.variant_id || null,
      },
    });

    let updatedTo;
    if (invTo) {
      updatedTo = await prisma.inventory.update({
        where: { id: invTo.id },
        data: {
          quantity: invTo.quantity + qty,
          available_qty: invTo.available_qty + qty,
        },
      });
    } else {
      updatedTo = await prisma.inventory.create({
        data: {
          warehouse_id: to_warehouse_id,
          product_id,
          variant_id: variant_id || null,
          quantity: qty,
          available_qty: qty,
          reserved_qty: 0,
          avg_cost: invFrom.avg_cost,
        },
      });
    }

    const transferNo = `TRF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const transfer = await prisma.stockTransfer.create({
      data: {
        transfer_no: transferNo,
        from_warehouse_id,
        to_warehouse_id,
        status: 'COMPLETED',
        initiated_by: req.user?.full_name || 'Staff',
        received_by: req.user?.full_name || 'Staff',
        received_date: new Date(),
        notes: notes || 'Warehouse stock transfer',
        items_json: JSON.stringify([{ product_id, variant_id: invFrom.variant_id || null, quantity: qty }]),
      },
    });

    // Create dual inventory transactions
    const txnOutNo = `TXN-OUT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    await prisma.inventoryTransaction.create({
      data: {
        transaction_no: txnOutNo,
        warehouse_id: from_warehouse_id,
        product_id,
        variant_id: invFrom.variant_id || null,
        type: 'TRANSFER_OUT',
        quantity: qty,
        before_qty: invFrom.quantity,
        after_qty: updatedFrom.quantity,
        reference_type: 'TRANSFER',
        reference_id: transfer.id,
        unit_cost: invFrom.avg_cost,
        notes: `Transfer out to destination warehouse [Ref: ${transferNo}]`,
        created_by: req.user?.full_name || 'Staff',
        branch_id: req.user?.branch_id || null,
      },
    });

    const txnInNo = `TXN-IN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    await prisma.inventoryTransaction.create({
      data: {
        transaction_no: txnInNo,
        warehouse_id: to_warehouse_id,
        product_id,
        variant_id: invFrom.variant_id || null,
        type: 'TRANSFER_IN',
        quantity: qty,
        before_qty: invTo ? invTo.quantity : 0,
        after_qty: updatedTo.quantity,
        reference_type: 'TRANSFER',
        reference_id: transfer.id,
        unit_cost: invFrom.avg_cost,
        notes: `Transfer in from source warehouse [Ref: ${transferNo}]`,
        created_by: req.user?.full_name || 'Staff',
        branch_id: req.user?.branch_id || null,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'STOCK_TRANSFER',
      entity: 'StockTransfer',
      entityId: transfer.id,
      newData: { transferNo, from_warehouse_id, to_warehouse_id, product_id, quantity: qty },
    });

    return sendSuccess(res, transfer, 'Stock transferred successfully between warehouses');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getStockTransfers = async (req: Request, res: Response) => {
  try {
    const transfers = await prisma.stockTransfer.findMany({
      orderBy: { transfer_date: 'desc' },
      take: 50,
    });

    const enriched = await Promise.all(
      transfers.map(async (t) => {
        const fromWh = await prisma.warehouse.findUnique({ where: { id: t.from_warehouse_id } });
        const toWh = await prisma.warehouse.findUnique({ where: { id: t.to_warehouse_id } });
        let items: any[] = [];
        try {
          items = JSON.parse(t.items_json || '[]');
          for (let item of items) {
            const prod = await prisma.product.findUnique({ where: { id: item.product_id } });
            item.product_name = prod?.name || 'Unknown Product';
          }
        } catch {}

        return {
          ...t,
          from_warehouse_name: fromWh?.name || 'Unknown',
          to_warehouse_name: toWh?.name || 'Unknown',
          items,
        };
      })
    );

    return sendSuccess(res, enriched);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateInventory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, avg_cost, reserved_qty } = req.body;

    const current = await prisma.inventory.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    });

    if (!current) {
      return sendError(res, 'Inventory record not found', 404);
    }

    const newQty = quantity !== undefined ? Math.max(0, Number(quantity)) : current.quantity;
    const newCost = avg_cost !== undefined ? Math.max(0, Number(avg_cost)) : current.avg_cost;
    const newReserved = reserved_qty !== undefined ? Math.max(0, Number(reserved_qty)) : current.reserved_qty;
    const newAvailable = Math.max(0, newQty - newReserved);

    const updated = await prisma.inventory.update({
      where: { id },
      data: {
        quantity: newQty,
        avg_cost: newCost,
        reserved_qty: newReserved,
        available_qty: newAvailable,
      },
      include: {
        product: { include: { category: true, brand: true } },
        variant: true,
        warehouse: true,
      },
    });

    // Record audit inventory transaction if quantity changed
    if (newQty !== current.quantity) {
      const diff = newQty - current.quantity;
      const txnNo = `TXN-CORR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      await prisma.inventoryTransaction.create({
        data: {
          transaction_no: txnNo,
          warehouse_id: current.warehouse_id,
          product_id: current.product_id,
          variant_id: current.variant_id || null,
          type: diff > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUB',
          quantity: Math.abs(diff),
          before_qty: current.quantity,
          after_qty: newQty,
          reference_type: 'ADMIN_CORRECTION',
          unit_cost: newCost,
          notes: `Admin manual stock adjustment for ${current.product.name}`,
          created_by: req.user?.full_name || 'Administrator',
          branch_id: req.user?.branch_id || null,
        },
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Inventory',
      entityId: id,
      newData: {
        before: { quantity: current.quantity, avg_cost: current.avg_cost },
        after: { quantity: newQty, avg_cost: newCost },
      },
    });

    return sendSuccess(res, {
      ...updated,
      total_value: updated.quantity * updated.avg_cost,
      is_low_stock: updated.quantity <= (updated.product.min_stock_alert || 5),
    }, 'Inventory stock record updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deleteInventory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const current = await prisma.inventory.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    });

    if (!current) {
      return sendError(res, 'Inventory record not found', 404);
    }

    await prisma.inventory.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Inventory',
      entityId: id,
      newData: {
        product: current.product?.name,
        warehouse: current.warehouse?.name,
        quantity: current.quantity,
      },
    });

    return sendSuccess(res, null, `Stock record for "${current.product?.name}" deleted successfully`);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};