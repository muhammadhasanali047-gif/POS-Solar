import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const getDealers = async (req: Request, res: Response) => {
  try {
    const dealers = await prisma.dealer.findMany({
      include: {
        _count: {
          select: { sales: true, commissions: true },
        },
      },
      orderBy: { total_sales_volume: 'desc' },
    });

    return sendSuccess(res, dealers);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getDealerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dealer = await prisma.dealer.findUnique({
      where: { id },
      include: {
        sales: {
          include: {
            customer: true,
            items: true,
            installations: true,
          },
          orderBy: { created_at: 'desc' },
        },
        commissions: {
          include: { sale: true },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!dealer) return sendError(res, 'Dealer not found', 404);

    // Extract unique linked customers
    const customersMap = new Map();
    const installationsList: any[] = [];

    for (const s of dealer.sales) {
      if (s.customer && !customersMap.has(s.customer.id)) {
        customersMap.set(s.customer.id, s.customer);
      }
      if (s.installations) {
        installationsList.push(...s.installations);
      }
    }

    const pendingCommission = dealer.commissions
      .filter((c) => c.status === 'PENDING')
      .reduce((sum, c) => sum + c.amount, 0);

    const approvedCommission = dealer.commissions
      .filter((c) => c.status === 'APPROVED')
      .reduce((sum, c) => sum + c.amount, 0);

    const paidCommission = dealer.commissions
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + c.amount, 0);

    return sendSuccess(res, {
      ...dealer,
      linkedCustomers: Array.from(customersMap.values()),
      linkedInstallations: installationsList,
      commissionSummary: {
        totalEarned: dealer.total_commission_earned,
        pending: pendingCommission,
        approved: approvedCommission,
        paid: paidCommission,
        balancePayable: dealer.balance_payable,
      },
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createDealer = async (req: Request, res: Response) => {
  try {
    const {
      name,
      company_name,
      phone,
      email,
      address,
      commission_type = 'PERCENTAGE',
      commission_value = 5.0,
      notes,
    } = req.body;

    if (!name || !phone) {
      return sendError(res, 'Dealer name and phone number are required', 400);
    }

    const count = await prisma.dealer.count();
    const dealer_no = `DLR-${String(count + 1).padStart(3, '0')}`;

    const newDealer = await prisma.dealer.create({
      data: {
        dealer_no,
        name,
        company_name,
        phone,
        email,
        address,
        commission_type,
        commission_value: Number(commission_value),
        notes,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Dealer',
      entityId: newDealer.id,
      newData: newDealer,
    });

    return sendSuccess(res, newDealer, 'Dealer profile created successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateDealer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.dealer.update({
      where: { id },
      data: req.body,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Dealer',
      entityId: id,
      newData: updated,
    });

    return sendSuccess(res, updated, 'Dealer profile updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

// Payout Commission
export const payDealerCommission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, payment_ref, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return sendError(res, 'A valid payout amount is required', 400);
    }

    const dealer = await prisma.dealer.findUnique({ where: { id } });
    if (!dealer) return sendError(res, 'Dealer not found', 404);

    const payVal = Number(amount);
    const newPaid = dealer.commission_paid + payVal;
    const newBalance = Math.max(0, dealer.balance_payable - payVal);

    await prisma.dealer.update({
      where: { id },
      data: {
        commission_paid: newPaid,
        balance_payable: newBalance,
      },
    });

    // Mark pending or approved commissions as paid
    const pendingComms = await prisma.commission.findMany({
      where: { dealer_id: id, status: { in: ['PENDING', 'APPROVED'] } },
      orderBy: { created_at: 'asc' },
    });

    let remainingPayout = payVal;
    for (const comm of pendingComms) {
      if (remainingPayout <= 0) break;
      if (comm.amount <= remainingPayout) {
        await prisma.commission.update({
          where: { id: comm.id },
          data: { status: 'PAID', paid_date: new Date(), payment_ref },
        });
        remainingPayout -= comm.amount;
      }
    }

    await logAudit({
      userId: req.user?.id,
      action: 'PAY_DEALER_COMMISSION',
      entity: 'Dealer',
      entityId: id,
      newData: { amount: payVal, payment_ref, notes },
    });

    return sendSuccess(res, { newPaid, newBalance }, `Commission payout of Rs. ${payVal.toLocaleString()} recorded successfully!`);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};