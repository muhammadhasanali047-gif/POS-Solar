import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Today's Sales
    const todaySales = await prisma.sale.findMany({
      where: {
        created_at: { gte: today },
        order_status: { not: 'CANCELLED' },
      },
    });
    const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.grand_total, 0);

    // 2. Monthly Sales
    const monthlySales = await prisma.sale.findMany({
      where: {
        created_at: { gte: firstDayOfMonth },
        order_status: { not: 'CANCELLED' },
      },
    });
    const monthlySalesTotal = monthlySales.reduce((acc, s) => acc + s.grand_total, 0);

    // 3. Gross Profit Calculation
    const allSaleItems = await prisma.saleItem.findMany({
      include: { sale: true },
      where: { sale: { order_status: { not: 'CANCELLED' } } },
    });
    const totalGrossProfit = allSaleItems.reduce((acc, item) => acc + item.profit, 0);
    const totalSalesRevenue = allSaleItems.reduce((acc, item) => acc + item.total_price, 0);
    const grossMarginPercent = totalSalesRevenue > 0 ? Number(((totalGrossProfit / totalSalesRevenue) * 100).toFixed(1)) : 0;

    // 4. Expenses Separation: Fixed Monthly Overhead vs Direct Operating
    const allExpenses = await prisma.expense.findMany();
    const fixedCategories = ['RENT', 'SALARIES', 'UTILITIES', 'MARKETING'];
    const monthlyFixedOverhead = allExpenses
      .filter((e) => fixedCategories.includes(e.category.toUpperCase()))
      .reduce((acc, e) => acc + e.amount, 0);
    const variableOperatingExpenses = allExpenses
      .filter((e) => !fixedCategories.includes(e.category.toUpperCase()))
      .reduce((acc, e) => acc + e.amount, 0);
    const totalExpenses = allExpenses.reduce((acc, e) => acc + e.amount, 0);

    // Prorated daily overhead (fixed costs divided by 30 days)
    const dailyProratedOverhead = Math.round(monthlyFixedOverhead / 30);
    // Trading Net Profit (gross profit minus direct variable operating expenses)
    const tradingNetProfit = totalGrossProfit - variableOperatingExpenses;
    // Total Accounting Net Profit (inclusive of entire monthly fixed budget)
    const totalNetProfit = totalGrossProfit - totalExpenses;

    // 5. Customer Receivables (Pending Payments)
    const customers = await prisma.customer.findMany();
    const totalReceivables = customers.reduce((acc, c) => acc + c.outstanding_balance, 0);
    const customerCount = customers.length;

    // 6. Products & Inventory Valuation & Count
    const products = await prisma.product.findMany({
      include: {
        inventories: true,
        category: true,
        brand: true,
      },
    });

    let totalStockQuantity = 0;
    let totalInventoryValuation = 0;
    const allStockItems: any[] = [];

    for (const p of products) {
      const stock = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
      const val = p.inventories.reduce((acc, inv) => acc + inv.quantity * inv.avg_cost, 0);
      totalStockQuantity += stock;
      totalInventoryValuation += val;

      const minAlert = p.min_stock_alert ?? 5;
      allStockItems.push({
        id: p.id,
        productId: p.id,
        name: p.name,
        categoryName: p.category?.name || 'General',
        brandName: p.brand?.name || 'Solar',
        modelNumber: p.model_number || 'Standard',
        purchasePrice: p.purchase_price || 0,
        salePrice: p.sale_price || 0,
        currentQuantity: stock,
        minAlert: minAlert,
        isLow: stock <= minAlert,
        isZero: stock === 0,
      });
    }

    // 7. Low Stock Alerts
    const lowStockItems = allStockItems.filter((i) => i.isLow);

    // 8. Active Warranties & Claims
    const activeWarrantiesCount = await prisma.warranty.count({ where: { status: 'ACTIVE' } });
    const pendingClaimsCount = await prisma.warrantyClaim.count({
      where: { status: { in: ['RECEIVED', 'INSPECTING'] } },
    });

    // 9. Ongoing Installations
    const activeInstallationsCount = await prisma.installation.count({
      where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
    });

    // 10. Urgent Escalation Alerts (Same-Day / Unassigned Installations)
    const urgentInstallations = await prisma.installation.findMany({
      where: {
        OR: [
          { assigned_technician: null },
          { assigned_technician: '' },
          { status: 'PENDING' },
        ],
      },
      include: {
        customer: true,
        sale: true,
      },
      orderBy: { scheduled_date: 'asc' },
    });

    const urgentAlerts = urgentInstallations.map((inst) => ({
      id: inst.id,
      job_no: inst.job_no,
      customer_id: inst.customer_id,
      customer_name: inst.customer?.name || 'Customer',
      customer_phone: inst.customer?.phone || 'N/A',
      address: inst.address,
      system_capacity_kw: inst.system_capacity_kw,
      scheduled_date: inst.scheduled_date,
      assigned_technician: inst.assigned_technician,
      status: inst.status,
      sale_invoice: inst.sale?.invoice_no,
      alert_type: 'UNASSIGNED_JOB',
      message: `Installation ${inst.job_no} scheduled for today has no assigned technician!`,
    }));

    // 11. Top Selling Products
    const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const item of allSaleItems) {
      if (!productSalesMap[item.product_id]) {
        const prod = await prisma.product.findUnique({ where: { id: item.product_id } });
        productSalesMap[item.product_id] = {
          name: prod ? prod.name : 'Unknown Product',
          qty: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.product_id].qty += item.quantity;
      productSalesMap[item.product_id].revenue += item.total_price;
    }

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // 12. 6-Month Sales Trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const trendSales = await prisma.sale.findMany({
      where: {
        created_at: { gte: sixMonthsAgo },
        order_status: { not: 'CANCELLED' },
      },
      select: { grand_total: true, created_at: true },
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend: { month: string; sales: number; profit: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const monthLabel = `${monthNames[mIdx]} ${yr.toString().slice(-2)}`;

      const totalInMonth = trendSales
        .filter((s) => {
          const sDate = new Date(s.created_at);
          return sDate.getMonth() === mIdx && sDate.getFullYear() === yr;
        })
        .reduce((acc, s) => acc + s.grand_total, 0);

      monthlyTrend.push({
        month: monthLabel,
        sales: totalInMonth,
        profit: Math.round(totalInMonth * 0.18), // approx margin
      });
    }

    return sendSuccess(res, {
      kpis: {
        todaySales: todaySalesTotal,
        monthlySales: monthlySalesTotal,
        grossProfit: totalGrossProfit,
        grossMarginPercent,
        tradingNetProfit,
        monthlyFixedOverhead,
        variableOperatingExpenses,
        dailyProratedOverhead,
        netProfit: totalNetProfit,
        totalExpenses,
        totalReceivables,
        customerCount,
        totalStockQuantity,
        totalInventoryValuation,
        lowStockCount: lowStockItems.length,
        outOfStockCount: allStockItems.filter((i) => i.isZero).length,
        availableStockCount: allStockItems.filter((i) => i.currentQuantity > 0).length,
        totalProductsCount: allStockItems.length,
        activeWarrantiesCount,
        pendingClaimsCount,
        activeInstallationsCount,
        unassignedJobsCount: urgentAlerts.length,
      },
      urgentAlerts,
      lowStockItems: lowStockItems.slice(0, 10).map((i) => ({
        id: i.id,
        productId: i.productId,
        name: i.name,
        category: i.categoryName,
        brand: i.brandName,
        modelNumber: i.modelNumber,
        sku: i.modelNumber || 'N/A',
        currentQuantity: i.currentQuantity,
        minAlert: i.minAlert,
        purchasePrice: i.purchasePrice,
      })),
      allStockItems,
      topSellingProducts,
      salesTrend: monthlyTrend,
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};