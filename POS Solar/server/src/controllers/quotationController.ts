import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const getQuotations = async (req: Request, res: Response) => {
  try {
    const { status, customer_id } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (customer_id) where.customer_id = String(customer_id);

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: true,
        package: true,
        items: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, quotations);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getQuotationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        package: true,
        items: true,
      },
    });

    if (!quotation) return sendError(res, 'Quotation not found', 404);
    return sendSuccess(res, quotation);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createQuotation = async (req: Request, res: Response) => {
  try {
    const {
      customer_id,
      package_id,
      system_capacity_kw,
      items,
      discount = 0,
      tax = 0,
      installation_charges = 0,
      transport_charges = 0,
      validity_days = 30,
      notes,
    } = req.body;

    if (!customer_id || !items || items.length === 0) {
      return sendError(res, 'Customer and at least one item are required', 400);
    }

    const count = await prisma.quotation.count();
    const quotation_no = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const subtotal = items.reduce((acc: number, item: any) => acc + Number(item.quantity) * Number(item.unit_price), 0);
    const grand_total = subtotal - Number(discount) + Number(tax) + Number(installation_charges) + Number(transport_charges);

    const validity_date = new Date();
    validity_date.setDate(validity_date.getDate() + Number(validity_days));

    const quotation = await prisma.quotation.create({
      data: {
        quotation_no,
        customer_id,
        package_id: package_id || null,
        branch_id: req.user?.branch_id || null,
        system_capacity_kw: Number(system_capacity_kw) || null,
        subtotal,
        discount: Number(discount),
        tax: Number(tax),
        installation_charges: Number(installation_charges),
        transport_charges: Number(transport_charges),
        grand_total,
        status: 'DRAFT',
        validity_date,
        notes,
        created_by: req.user?.full_name || 'Staff',
        items: {
          create: items.map((i: any) => ({
            product_id: i.product_id,
            variant_id: i.variant_id || null,
            description: i.description,
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price),
            total_price: Number(i.quantity) * Number(i.unit_price),
            is_custom: Boolean(i.is_custom),
          })),
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Quotation',
      entityId: quotation.id,
      newData: quotation,
    });

    return sendSuccess(res, quotation, 'Quotation created successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateQuotationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status },
      include: { customer: true, items: true },
    });

    return sendSuccess(res, updated, `Quotation status updated to ${status}`);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

// 1-Click Convert to Sale Invoice
export const convertQuotationToSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dealer_id, paid_amount = 0, payment_method = 'CASH', warehouse_id } = req.body;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });

    if (!quotation) {
      return sendError(res, 'Quotation not found', 404);
    }

    if (quotation.status === 'CONVERTED_TO_SALE') {
      return sendError(res, 'Quotation has already been converted into a sale invoice', 400);
    }

    // Generate Invoice Number
    const count = await prisma.sale.count();
    const invoice_no = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const paid = Number(paid_amount);
    const balance_due = Math.max(0, quotation.grand_total - paid);
    const payment_status = paid >= quotation.grand_total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

    // 1. Create Sale record
    const sale = await prisma.sale.create({
      data: {
        invoice_no,
        quotation_id: quotation.id,
        customer_id: quotation.customer_id,
        dealer_id: dealer_id || null,
        branch_id: quotation.branch_id || req.user?.branch_id || null,
        salesperson_id: req.user?.id || null,
        system_capacity_kw: quotation.system_capacity_kw,
        subtotal: quotation.subtotal,
        discount: quotation.discount,
        tax: quotation.tax,
        installation_charges: quotation.installation_charges,
        transport_charges: quotation.transport_charges,
        grand_total: quotation.grand_total,
        paid_amount: paid,
        balance_due,
        payment_status,
        order_status: 'COMPLETED',
        notes: `Converted from Quotation ${quotation.quotation_no}`,
        created_by: req.user?.full_name || 'Staff',
      },
    });

    // 2. Create Sale Items and deduct stock
    for (const qItem of quotation.items) {
      const prod = await prisma.product.findUnique({ where: { id: qItem.product_id } });
      const cost = prod ? prod.purchase_price : 0;
      const profit = (qItem.unit_price - cost) * qItem.quantity;

      const saleItem = await prisma.saleItem.create({
        data: {
          sale_id: sale.id,
          product_id: qItem.product_id,
          variant_id: qItem.variant_id,
          quantity: qItem.quantity,
          unit_price: qItem.unit_price,
          unit_cost: cost,
          total_price: qItem.total_price,
          profit,
        },
      });

      // Stock deduction (defaults to active Multan warehouse)
      const targetWarehouseId = warehouse_id || (await prisma.warehouse.findFirst({ where: { is_active: true } }))?.id;
      if (targetWarehouseId) {
        const whereInv: any = {
          warehouse_id: targetWarehouseId,
          product_id: qItem.product_id,
        };
        if (qItem.variant_id) {
          whereInv.variant_id = qItem.variant_id;
        }

        const inv = await prisma.inventory.findFirst({
          where: whereInv,
          orderBy: { quantity: 'desc' },
        });

        if (inv) {
          const newQty = Math.max(0, inv.quantity - qItem.quantity);
          await prisma.inventory.update({
            where: { id: inv.id },
            data: {
              quantity: newQty,
              available_qty: Math.max(0, newQty - inv.reserved_qty),
            },
          });

          await prisma.inventoryTransaction.create({
            data: {
              transaction_no: `TXN-SALE-${Date.now().toString().slice(-6)}`,
              warehouse_id: targetWarehouseId,
              product_id: qItem.product_id,
              variant_id: qItem.variant_id || null,
              type: 'SALE_OUT',
              quantity: qItem.quantity,
              before_qty: inv.quantity,
              after_qty: newQty,
              reference_type: 'SALE',
              reference_id: sale.id,
              unit_cost: cost,
              notes: `Auto stock deduction for Invoice ${invoice_no}`,
              created_by: req.user?.full_name || 'Staff',
              branch_id: quotation.branch_id,
            },
          });
        }
      }
    }

    // 3. Payment record if paid > 0
    if (paid > 0) {
      const pCount = await prisma.payment.count();
      const payment_no = `PAY-${new Date().getFullYear()}-${String(pCount + 1).padStart(4, '0')}`;
      await prisma.payment.create({
        data: {
          payment_no,
          sale_id: sale.id,
          customer_id: quotation.customer_id,
          amount: paid,
          payment_method,
          received_by: req.user?.full_name || 'Staff',
          notes: `Initial payment during quotation conversion for ${invoice_no}`,
        },
      });
    }

    // 4. Update customer outstanding balance
    await prisma.customer.update({
      where: { id: quotation.customer_id },
      data: {
        outstanding_balance: {
          increment: balance_due,
        },
      },
    });

    // 5. If Dealer is attached, compute commission
    if (dealer_id) {
      const dealer = await prisma.dealer.findUnique({ where: { id: dealer_id } });
      if (dealer) {
        let commAmount = 0;
        if (dealer.commission_type === 'PERCENTAGE') {
          commAmount = (quotation.grand_total * dealer.commission_value) / 100;
        } else {
          commAmount = (quotation.system_capacity_kw || 5) * dealer.commission_value;
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
            notes: `Commission for sale ${invoice_no}`,
          },
        });

        await prisma.dealer.update({
          where: { id: dealer.id },
          data: {
            total_sales_volume: { increment: quotation.grand_total },
            total_commission_earned: { increment: commAmount },
            balance_payable: { increment: commAmount },
          },
        });
      }
    }

    // 6. Automatically generate Installation record for turn-key solar jobs
    const instCount = await prisma.installation.count();
    const job_no = `INST-${new Date().getFullYear()}-${String(instCount + 1).padStart(4, '0')}`;
    await prisma.installation.create({
      data: {
        job_no,
        sale_id: sale.id,
        customer_id: quotation.customer_id,
        branch_id: quotation.branch_id,
        address: quotation.customer.address || 'Site Address TBD',
        system_capacity_kw: quotation.system_capacity_kw,
        status: 'PENDING',
        checklist_json: JSON.stringify({
          panels_mounted: false,
          inverter_installed: false,
          batteries_connected: false,
          structure_torqued: false,
          dc_wiring_done: false,
          earthing_bore_tested: false,
          inverter_tested: false,
          customer_handover: false,
        }),
        notes: `Installation job automatically queued from Invoice ${invoice_no}`,
      },
    });

    // 7. Update Quotation Status
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'CONVERTED_TO_SALE' },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CONVERT_QUOTATION_TO_SALE',
      entity: 'Sale',
      entityId: sale.id,
      newData: { quotation_id: quotation.id, invoice_no, grand_total: quotation.grand_total },
    });

    return sendSuccess(res, sale, `Quotation successfully converted to Sale Invoice ${invoice_no}!`, 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};