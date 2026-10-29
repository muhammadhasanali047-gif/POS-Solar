import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';
import { FirebaseService } from '../services/firebaseService';

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const { search, customer_type } = req.query;
    const where: any = {};
    if (customer_type) where.customer_type = String(customer_type);

    if (search) {
      const q = String(search);
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { customer_no: { contains: q } },
        { cnic: { contains: q } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { sales: true, quotations: true, installations: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, customers);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        quotations: { orderBy: { created_at: 'desc' } },
        sales: {
          include: { items: true, payments: true },
          orderBy: { created_at: 'desc' },
        },
        payments: { orderBy: { payment_date: 'desc' } },
        installations: { orderBy: { created_at: 'desc' } },
      },
    });

    if (!customer) return sendError(res, 'Customer not found', 404);
    return sendSuccess(res, customer);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, customer_type, phone, alt_phone, email, cnic, address, city, credit_limit, notes } = req.body;
    if (!name || !phone) {
      return sendError(res, 'Customer name and phone number are required', 400);
    }

    const count = await prisma.customer.count();
    const customer_no = `CUST-${String(count + 1).padStart(3, '0')}`;

    const newCustomer = await prisma.customer.create({
      data: {
        customer_no,
        name,
        customer_type: customer_type || 'INDIVIDUAL',
        phone,
        alt_phone,
        email,
        cnic,
        address,
        city: city || 'Multan',
        credit_limit: Number(credit_limit) || 0,
        outstanding_balance: 0,
        notes,
        branch_id: req.user?.branch_id || null,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Customer',
      entityId: newCustomer.id,
      newData: newCustomer,
    });

    return sendSuccess(res, newCustomer, 'Customer profile created successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.customer.update({
      where: { id },
      data: req.body,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Customer',
      entityId: id,
      newData: updated,
    });

    return sendSuccess(res, updated, 'Customer profile updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

// Record full or partial customer payment
export const recordCustomerPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // customer_id
    const { sale_id, amount, payment_method = 'CASH', transaction_ref, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return sendError(res, 'A valid payment amount is required', 400);
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return sendError(res, 'Customer not found', 404);

    let sale = null;
    if (sale_id) {
      sale = await prisma.sale.findUnique({ where: { id: sale_id } });
      if (!sale) return sendError(res, 'Sale invoice not found', 404);
    }

    const pCount = await prisma.payment.count();
    const payment_no = `PAY-${new Date().getFullYear()}-${String(pCount + 1).padStart(4, '0')}`;
    const payAmount = Number(amount);

    // 1. Create payment
    const payment = await prisma.payment.create({
      data: {
        payment_no,
        sale_id: sale ? sale.id : (await prisma.sale.findFirst({ where: { customer_id: id } }))?.id || '',
        customer_id: id,
        amount: payAmount,
        payment_method,
        transaction_ref,
        received_by: req.user?.full_name || 'Staff',
        notes: notes || `Payment received for ${customer.name}`,
      },
    });

    // 2. Reduce customer balance
    const newCustBalance = Math.max(0, customer.outstanding_balance - payAmount);
    await prisma.customer.update({
      where: { id },
      data: { outstanding_balance: newCustBalance },
    });

    // 3. Update sale balance if linked
    if (sale) {
      const newPaid = sale.paid_amount + payAmount;
      const newBalance = Math.max(0, sale.grand_total - newPaid);
      const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          paid_amount: newPaid,
          balance_due: newBalance,
          payment_status: newStatus,
        },
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: 'RECORD_PAYMENT',
      entity: 'Payment',
      entityId: payment.id,
      newData: { customer_id: id, amount: payAmount, sale_id },
    });

    // Dual-write sync updated balance to Firebase
    FirebaseService.syncCustomer({
      ...customer,
      outstanding_balance: newCustBalance,
    }).catch(() => {});

    return sendSuccess(res, payment, `Payment of Rs. ${payAmount.toLocaleString()} recorded successfully!`);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

/**
 * Complete Dynamic Customer Ledger (Khata / Statement of Account)
 * Includes first purchase date, all solar equipment bought,
 * running balance, chronological debits & credits, and balance due.
 */
export const getCustomerLedger = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          include: {
            items: true,
            payments: true,
          },
          orderBy: { created_at: 'asc' },
        },
        payments: {
          orderBy: { payment_date: 'asc' },
        },
        quotations: {
          orderBy: { created_at: 'desc' },
        },
        installations: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!customer) return sendError(res, 'Customer not found', 404);

    // Aggregates
    const totalPurchased = customer.sales.reduce((sum, s) => sum + s.grand_total, 0);
    const totalPaid = customer.payments.reduce((sum, p) => sum + p.amount, 0);
    const currentBalance = customer.outstanding_balance;
    const firstPurchaseDate = customer.sales.length > 0 ? customer.sales[0].created_at : customer.created_at;

    // Fetch all products for name resolution
    const products = await prisma.product.findMany();
    const prodMap = new Map(products.map((p) => [p.id, p]));

    // Collect all solar equipment / components purchased
    const equipmentList: any[] = [];
    customer.sales.forEach((s) => {
      s.items.forEach((item) => {
        let serials: string[] = [];
        try {
          if (item.serial_numbers_json) {
            serials = typeof item.serial_numbers_json === 'string' ? JSON.parse(item.serial_numbers_json) : item.serial_numbers_json;
          }
        } catch {
          serials = [];
        }
        const prod = prodMap.get(item.product_id);
        const prodName = prod ? prod.name : 'Solar Component';

        equipmentList.push({
          id: item.id,
          name: prodName,
          model_number: prod?.model_number || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          invoice_no: s.invoice_no,
          date: s.created_at,
          serials,
        });
      });
    });

    // Build Chronological Ledger Transactions (Debits & Credits)
    const rawEntries: any[] = [];

    // 1. Sales (Debits - Total Invoice value added to Khata)
    customer.sales.forEach((s) => {
      const itemsSummary = s.items
        .map((i) => {
          const prod = prodMap.get(i.product_id);
          return `${prod ? prod.name : 'Solar Equipment'} (${i.quantity}x)`;
        })
        .join(', ');
      rawEntries.push({
        id: `sale-${s.id}`,
        date: s.created_at,
        type: 'SALE_INVOICE',
        ref_no: s.invoice_no,
        description: itemsSummary || 'Solar Equipment Invoice',
        debit: s.grand_total,
        credit: 0,
        payment_status: s.payment_status,
        sale_id: s.id,
        items_count: s.items.length,
      });
    });

    // 2. Payments (Credits - Cash / Bank payments received)
    customer.payments.forEach((p) => {
      rawEntries.push({
        id: `pay-${p.id}`,
        date: p.payment_date,
        type: 'PAYMENT_RECEIVED',
        ref_no: p.payment_no,
        description: p.notes || `Payment received via ${p.payment_method.replace('_', ' ')}${p.transaction_ref ? ` (Ref: ${p.transaction_ref})` : ''}`,
        debit: 0,
        credit: p.amount,
        payment_method: p.payment_method,
        payment_id: p.id,
      });
    });

    // Sort chronologically ascending
    rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate Running Balance
    let runningBalance = 0;
    const ledger = rawEntries.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry,
        running_balance: runningBalance,
      };
    });

    return sendSuccess(res, {
      customer: {
        id: customer.id,
        customer_no: customer.customer_no,
        name: customer.name,
        phone: customer.phone,
        alt_phone: customer.alt_phone,
        cnic: customer.cnic,
        address: customer.address,
        city: customer.city,
        customer_type: customer.customer_type,
        created_at: customer.created_at,
        credit_limit: customer.credit_limit,
      },
      summary: {
        firstPurchaseDate,
        customerSince: firstPurchaseDate,
        totalPurchased,
        totalPaid,
        currentBalance,
        totalInvoices: customer.sales.length,
        totalPayments: customer.payments.length,
        totalQuotations: customer.quotations.length,
      },
      ledger,
      equipment: equipmentList,
      sales: customer.sales,
      payments: customer.payments,
      quotations: customer.quotations,
      installations: customer.installations,
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Unlink SerialNumbers
      await tx.serialNumber.updateMany({
        where: { current_customer_id: id },
        data: { current_customer_id: null },
      });

      // 2. Delete Warranty Claims
      await tx.warrantyClaim.deleteMany({
        where: { customer_id: id },
      });

      // 3. Delete Warranties
      await tx.warranty.deleteMany({
        where: { customer_id: id },
      });

      // 4. Delete Installations
      await tx.installation.deleteMany({
        where: { customer_id: id },
      });

      // 5. Delete Payments
      await tx.payment.deleteMany({
        where: { customer_id: id },
      });

      // 6. Delete Sales and Sale Items
      const sales = await tx.sale.findMany({
        where: { customer_id: id },
        select: { id: true },
      });
      const saleIds = sales.map((s) => s.id);

      if (saleIds.length > 0) {
        await tx.commission.deleteMany({
          where: { sale_id: { in: saleIds } },
        });

        const saleItems = await tx.saleItem.findMany({
          where: { sale_id: { in: saleIds } },
          select: { id: true },
        });
        const saleItemIds = saleItems.map((si) => si.id);
        if (saleItemIds.length > 0) {
          await tx.serialNumber.updateMany({
            where: { sale_item_id: { in: saleItemIds } },
            data: { sale_item_id: null },
          });
          await tx.saleItem.deleteMany({
            where: { id: { in: saleItemIds } },
          });
        }

        await tx.sale.deleteMany({
          where: { id: { in: saleIds } },
        });
      }

      // 7. Delete Quotations and Quotation Items
      const quotations = await tx.quotation.findMany({
        where: { customer_id: id },
        select: { id: true },
      });
      const quotationIds = quotations.map((q) => q.id);

      if (quotationIds.length > 0) {
        await tx.quotationItem.deleteMany({
          where: { quotation_id: { in: quotationIds } },
        });
        await tx.quotation.deleteMany({
          where: { id: { in: quotationIds } },
        });
      }

      // 8. Delete Customer
      await tx.customer.delete({
        where: { id },
      });
    });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Customer',
      entityId: id,
      oldData: {
        customer_no: customer.customer_no,
        name: customer.name,
      },
    });

    return sendSuccess(res, null, `Customer ${customer.name} and all related records deleted successfully`);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};