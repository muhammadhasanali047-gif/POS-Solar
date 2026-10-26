import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const getSales = async (req: Request, res: Response) => {
  try {
    const { customer_id, dealer_id, payment_status, search } = req.query;
    const where: any = {};
    if (customer_id) where.customer_id = String(customer_id);
    if (dealer_id) where.dealer_id = String(dealer_id);
    if (payment_status) where.payment_status = String(payment_status);

    if (search) {
      const q = String(search);
      where.OR = [
        { invoice_no: { contains: q } },
        { customer: { name: { contains: q } } },
      ];
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        dealer: true,
        items: true,
        payments: true,
        installations: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, sales);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getSaleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        dealer: true,
        items: true,
        payments: true,
        installations: true,
        commissions: true,
      },
    });

    if (!sale) return sendError(res, 'Sale invoice not found', 404);
    return sendSuccess(res, sale);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

// POS Checkout
export const createSale = async (req: Request, res: Response) => {
  try {
    const {
      customer_id,
      dealer_id,
      system_capacity_kw,
      items,
      discount = 0,
      tax = 0,
      installation_charges = 0,
      transport_charges = 0,
      paid_amount = 0,
      payment_method = 'CASH',
      transaction_ref,
      warehouse_id,
      notes,
    } = req.body;

    if (!customer_id || !items || items.length === 0) {
      return sendError(res, 'Customer and at least one item are required for checkout', 400);
    }

    const count = await prisma.sale.count();
    const invoice_no = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    for (const it of items) {
      subtotal += Number(it.quantity) * Number(it.unit_price);
    }

    const grand_total = subtotal - Number(discount) + Number(tax) + Number(installation_charges) + Number(transport_charges);
    const paid = Number(paid_amount);
    const balance_due = Math.max(0, grand_total - paid);
    const payment_status = paid >= grand_total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

    // 1. Create Sale
    const sale = await prisma.sale.create({
      data: {
        invoice_no,
        customer_id,
        dealer_id: dealer_id || null,
        branch_id: req.user?.branch_id || null,
        salesperson_id: req.user?.id || null,
        system_capacity_kw: Number(system_capacity_kw) || null,
        subtotal,
        discount: Number(discount),
        tax: Number(tax),
        installation_charges: Number(installation_charges),
        transport_charges: Number(transport_charges),
        grand_total,
        paid_amount: paid,
        balance_due,
        payment_status,
        order_status: 'COMPLETED',
        notes,
        created_by: req.user?.full_name || 'Staff',
      },
    });

    // 2. Process Items, inventory deduction, serials & warranties
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.product_id } });
      const unitCost = product ? product.purchase_price : 0;
      const profit = (Number(item.unit_price) - unitCost) * Number(item.quantity);

      const saleItem = await prisma.saleItem.create({
        data: {
          sale_id: sale.id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          unit_cost: unitCost,
          total_price: Number(item.quantity) * Number(item.unit_price),
          profit,
          serial_numbers_json: item.serial_numbers ? JSON.stringify(item.serial_numbers) : null,
        },
      });

      // Stock deduction (defaults to active Multan warehouse)
      const targetWarehouseId = warehouse_id || (await prisma.warehouse.findFirst({ where: { is_active: true } }))?.id;
      if (targetWarehouseId) {
        const whereInv: any = {
          warehouse_id: targetWarehouseId,
          product_id: item.product_id,
        };
        if (item.variant_id) {
          whereInv.variant_id = item.variant_id;
        }

        const inv = await prisma.inventory.findFirst({
          where: whereInv,
          orderBy: { quantity: 'desc' },
        });

        if (inv) {
          const newQty = Math.max(0, inv.quantity - Number(item.quantity));
          await prisma.inventory.update({
            where: { id: inv.id },
            data: {
              quantity: newQty,
              available_qty: Math.max(0, newQty - inv.reserved_qty),
            },
          });

          await prisma.inventoryTransaction.create({
            data: {
              transaction_no: `TXN-POS-${Date.now().toString().slice(-6)}`,
              warehouse_id: targetWarehouseId,
              product_id: item.product_id,
              variant_id: item.variant_id || null,
              type: 'SALE_OUT',
              quantity: Number(item.quantity),
              before_qty: inv.quantity,
              after_qty: newQty,
              reference_type: 'SALE',
              reference_id: sale.id,
              unit_cost: unitCost,
              notes: `POS stock deduction for Invoice ${invoice_no}`,
              created_by: req.user?.full_name || 'Staff',
              branch_id: req.user?.branch_id || null,
            },
          });
        }
      }

      // Serial Numbers & Warranty Activation
      if (item.serial_numbers && Array.isArray(item.serial_numbers) && item.serial_numbers.length > 0) {
        for (const snString of item.serial_numbers) {
          const serialRecord = await prisma.serialNumber.findUnique({ where: { serial_no: snString } });
          const warrantyMonths = 12 * 5; // default 5 years or product variant

          if (serialRecord) {
            await prisma.serialNumber.update({
              where: { id: serialRecord.id },
              data: {
                status: 'SOLD',
                current_customer_id: customer_id,
                sale_item_id: saleItem.id,
                sale_date: new Date(),
                warranty_end_date: new Date(Date.now() + warrantyMonths * 30 * 24 * 60 * 60 * 1000),
              },
            });

            const wCount = await prisma.warranty.count();
            const warranty_no = `WRN-${new Date().getFullYear()}-${String(wCount + 1).padStart(4, '0')}`;

            await prisma.warranty.create({
              data: {
                warranty_no,
                serial_number_id: serialRecord.id,
                product_id: item.product_id,
                customer_id,
                sale_id: sale.id,
                warranty_type: 'INVERTER_5YR',
                start_date: new Date(),
                end_date: new Date(Date.now() + warrantyMonths * 30 * 24 * 60 * 60 * 1000),
                duration_months: warrantyMonths,
                status: 'ACTIVE',
                terms: 'Standard manufacturer warranty from date of invoice.',
              },
            });
          }
        }
      } else {
        // Auto-generate system/panel warranty if item is a Solar Panel
        const prod = await prisma.product.findUnique({
          where: { id: item.product_id },
          include: { category: true },
        });
        const isPanel =
          prod?.category?.name?.toLowerCase().includes('panel') ||
          prod?.name?.toLowerCase().includes('panel') ||
          prod?.category?.slug?.includes('panel');

        if (isPanel) {
          const warrantyMonths = 300; // 25 years
          const wCount = await prisma.warranty.count();
          const warranty_no = `WRN-PNL-${new Date().getFullYear()}-${String(wCount + 1).padStart(4, '0')}`;
          await prisma.warranty.create({
            data: {
              warranty_no,
              serial_number_id: null,
              product_id: item.product_id,
              customer_id,
              sale_id: sale.id,
              warranty_type: 'PANEL_PERFORMANCE_25YR',
              start_date: new Date(),
              end_date: new Date(Date.now() + warrantyMonths * 30 * 24 * 60 * 60 * 1000),
              duration_months: warrantyMonths,
              status: 'ACTIVE',
              terms: `25-Year Linear Power Output Warranty (Min 84.8% power output at Year 25) + 12-Year Product Warranty for ${item.quantity}x ${prod?.name || 'Panels'}.`,
            },
          });
        }
      }
    }

    // 3. Payment record
    if (paid > 0) {
      const pCount = await prisma.payment.count();
      const payment_no = `PAY-${new Date().getFullYear()}-${String(pCount + 1).padStart(4, '0')}`;

      await prisma.payment.create({
        data: {
          payment_no,
          sale_id: sale.id,
          customer_id,
          amount: paid,
          payment_method,
          transaction_ref: transaction_ref || null,
          received_by: req.user?.full_name || 'Staff',
          notes: `POS receipt for ${invoice_no}`,
        },
      });
    }

    // 4. Update customer outstanding balance
    await prisma.customer.update({
      where: { id: customer_id },
      data: {
        outstanding_balance: {
          increment: balance_due,
        },
      },
    });

    // 5. Dealer commission if applicable
    if (dealer_id) {
      const dealer = await prisma.dealer.findUnique({ where: { id: dealer_id } });
      if (dealer) {
        let commAmount = 0;
        if (dealer.commission_type === 'PERCENTAGE') {
          commAmount = (grand_total * dealer.commission_value) / 100;
        } else {
          commAmount = (Number(system_capacity_kw) || 5) * dealer.commission_value;
        }

        const commCount = await prisma.commission.count();
        const commission_no = `COM-${new Date().getFullYear()}-${String(commCount + 1).padStart(4, '0')}`;

        await prisma.commission.create({
          data: {
            commission_no,
            dealer_id: dealer.id,
            sale_id: sale.id,
            amount: commAmount,
            status: 'PENDING',
            notes: `Commission on POS Invoice ${invoice_no}`,
          },
        });

        await prisma.dealer.update({
          where: { id: dealer.id },
          data: {
            total_sales_volume: { increment: grand_total },
            total_commission_earned: { increment: commAmount },
            balance_payable: { increment: commAmount },
          },
        });
      }
    }

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE_SALE_POS',
      entity: 'Sale',
      entityId: sale.id,
      newData: { invoice_no, grand_total, paid, balance_due },
    });

    const fullSale = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: { customer: true, items: true, payments: true },
    });

    return sendSuccess(res, fullSale, `Sale Invoice ${invoice_no} completed successfully!`, 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};