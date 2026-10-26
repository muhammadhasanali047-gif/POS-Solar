import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';

export const getReports = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    // 1. Sales Report
    if (type === 'sales') {
      const sales = await prisma.sale.findMany({
        where: { order_status: { not: 'CANCELLED' } },
        include: {
          customer: true,
          dealer: true,
          items: true,
        },
        orderBy: { created_at: 'desc' },
      });

      const totalRevenue = sales.reduce((sum, s) => sum + s.grand_total, 0);
      const totalPaid = sales.reduce((sum, s) => sum + s.paid_amount, 0);
      const totalOutstanding = sales.reduce((sum, s) => sum + s.balance_due, 0);

      return sendSuccess(res, {
        summary: { totalRevenue, totalPaid, totalOutstanding, count: sales.length },
        sales,
      });
    }

    // 2. Inventory Report
    if (type === 'inventory') {
      const inventories = await prisma.inventory.findMany({
        include: {
          product: { include: { brand: true, category: true } },
          variant: true,
          warehouse: true,
        },
      });

      const totalUnits = inventories.reduce((sum, i) => sum + i.quantity, 0);
      const totalValuation = inventories.reduce((sum, i) => sum + i.quantity * i.avg_cost, 0);
      const lowStockItems = inventories.filter((i) => i.quantity <= (i.product.min_stock_alert || 5));

      return sendSuccess(res, {
        summary: { totalUnits, totalValuation, lowStockCount: lowStockItems.length },
        inventories,
      });
    }

    // 3. Financial Report (Revenue, COGS, Gross Profit, Expenses, Net Profit, Receivables, Payables)
    if (type === 'financial') {
      const sales = await prisma.sale.findMany({
        where: { order_status: { not: 'CANCELLED' } },
        include: { items: true },
      });

      let totalRevenue = 0;
      let totalCogs = 0;
      let totalGrossProfit = 0;

      for (const s of sales) {
        totalRevenue += s.grand_total;
        for (const it of s.items) {
          totalCogs += it.unit_cost * it.quantity;
          totalGrossProfit += it.profit;
        }
      }

      const expenses = await prisma.expense.findMany();
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalGrossProfit - totalExpenses;

      const customers = await prisma.customer.findMany();
      const totalReceivables = customers.reduce((sum, c) => sum + c.outstanding_balance, 0);

      const suppliers = await prisma.supplier.findMany();
      const totalPayables = suppliers.reduce((sum, s) => sum + s.outstanding_payable, 0);

      const dealers = await prisma.dealer.findMany();
      const totalDealerPayables = dealers.reduce((sum, d) => sum + d.balance_payable, 0);

      return sendSuccess(res, {
        revenue: totalRevenue,
        cogs: totalCogs,
        grossProfit: totalGrossProfit,
        expenses: totalExpenses,
        netProfit,
        receivables: totalReceivables,
        payables: totalPayables,
        dealerCommissionsDue: totalDealerPayables,
        grossMargin: totalRevenue > 0 ? `${((totalGrossProfit / totalRevenue) * 100).toFixed(1)}%` : '0%',
        netMargin: totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : '0%',
      });
    }

    // 4. Solar Business Specific Report (By System Capacity kW, Panel wattage, Inverter model, Battery capacity)
    if (type === 'solar-business') {
      const sales = await prisma.sale.findMany({
        where: { order_status: { not: 'CANCELLED' } },
        include: { items: true },
      });

      // Capacity distribution
      const capacityDist: Record<string, { count: number; totalRevenue: number }> = {
        '5kW': { count: 0, totalRevenue: 0 },
        '10kW': { count: 0, totalRevenue: 0 },
        '15kW': { count: 0, totalRevenue: 0 },
        '20kW+': { count: 0, totalRevenue: 0 },
        'Other': { count: 0, totalRevenue: 0 },
      };

      for (const s of sales) {
        const cap = s.system_capacity_kw || 0;
        let bracket = 'Other';
        if (cap >= 4 && cap <= 6) bracket = '5kW';
        else if (cap > 6 && cap <= 12) bracket = '10kW';
        else if (cap > 12 && cap <= 18) bracket = '15kW';
        else if (cap > 18) bracket = '20kW+';

        capacityDist[bracket].count += 1;
        capacityDist[bracket].totalRevenue += s.grand_total;
      }

      // Installation Status stats
      const installations = await prisma.installation.findMany();
      const instStats = {
        total: installations.length,
        completed: installations.filter((i) => i.status === 'COMPLETED').length,
        in_progress: installations.filter((i) => i.status === 'IN_PROGRESS').length,
        scheduled: installations.filter((i) => i.status === 'SCHEDULED').length,
        pending: installations.filter((i) => i.status === 'PENDING').length,
      };

      // Warranty & Claims
      const totalWarranties = await prisma.warranty.count();
      const activeWarranties = await prisma.warranty.count({ where: { status: 'ACTIVE' } });
      const totalClaims = await prisma.warrantyClaim.count();
      const resolvedClaims = await prisma.warrantyClaim.count({ where: { status: 'RESOLVED' } });

      return sendSuccess(res, {
        capacityDistribution: capacityDist,
        installationMetrics: instStats,
        warrantyMetrics: {
          totalWarranties,
          activeWarranties,
          totalClaims,
          resolvedClaims,
        },
      });
    }

    return sendError(res, `Invalid report type '${type}'`, 400);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};