import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    const where: any = {};
    if (category) where.category = String(category);

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expense_date: 'desc' },
    });

    return sendSuccess(res, expenses);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { category, amount, payment_method, paid_to, description, project_id } = req.body;
    if (!category || !amount) {
      return sendError(res, 'Expense category and amount are required', 400);
    }

    const count = await prisma.expense.count();
    const expense_no = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newExpense = await prisma.expense.create({
      data: {
        expense_no,
        category,
        amount: Number(amount),
        payment_method: payment_method || 'CASH',
        paid_to,
        description,
        project_id: project_id || null,
        branch_id: req.user?.branch_id || null,
        created_by: req.user?.full_name || 'Staff',
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Expense',
      entityId: newExpense.id,
      newData: newExpense,
    });

    return sendSuccess(res, newExpense, 'Expense recorded successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getProfitSummary = async (req: Request, res: Response) => {
  try {
    // 1. Total Sales Revenue
    const sales = await prisma.sale.findMany({
      where: { order_status: { not: 'CANCELLED' } },
      include: { items: true },
    });
    const totalRevenue = sales.reduce((sum, s) => sum + s.grand_total, 0);

    // 2. Cost of Goods Sold & Gross Profit
    let totalCogs = 0;
    let totalGrossProfit = 0;
    for (const s of sales) {
      for (const it of s.items) {
        totalCogs += it.unit_cost * it.quantity;
        totalGrossProfit += it.profit;
      }
    }

    // 3. Operating Expenses by Category
    const expenses = await prisma.expense.findMany();
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const expensesByCategory: Record<string, number> = {};
    for (const exp of expenses) {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
    }

    // 4. Net Profit
    const netProfit = totalGrossProfit - totalExpenses;
    const grossMargin = totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1) : 0;
    const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    return sendSuccess(res, {
      totalRevenue,
      totalCogs,
      totalGrossProfit,
      totalExpenses,
      netProfit,
      grossMargin: `${grossMargin}%`,
      netMargin: `${netMargin}%`,
      expensesByCategory,
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};