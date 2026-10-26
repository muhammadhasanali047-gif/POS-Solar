import React, { useEffect, useState } from 'react';
import { BarChart3, Download, Printer } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'financial' | 'solar-business'>('financial');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/reports/${reportType}`);
      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load report', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'sales') {
      csvContent += 'Invoice No,Customer,Date,Grand Total,Paid Amount,Balance Due,Status\n';
      reportData.sales?.forEach((s: any) => {
        csvContent += `"${s.invoice_no}","${s.customer?.name}","${formatDate(s.created_at)}","${s.grand_total}","${s.paid_amount}","${s.balance_due}","${s.payment_status}"\n`;
      });
    } else if (reportType === 'inventory') {
      csvContent += 'Product,Category,Quantity,Avg Cost,Total Valuation\n';
      reportData.inventories?.forEach((i: any) => {
        csvContent += `"${i.product.name}","${i.product.category?.name || 'General'}","${i.quantity}","${i.avg_cost}","${i.quantity * i.avg_cost}"\n`;
      });
    } else if (reportType === 'financial') {
      csvContent += 'Metric,Amount (Rs.)\n';
      csvContent += `"Total Revenue","${reportData.revenue}"\n`;
      csvContent += `"Cost of Goods Sold","${reportData.cogs}"\n`;
      csvContent += `"Gross Profit","${reportData.grossProfit}"\n`;
      csvContent += `"Operational Expenses","${reportData.expenses}"\n`;
      csvContent += `"Net Profit","${reportData.netProfit}"\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `solar_erp_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Executive Reports & Business Intelligence
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { key: 'financial', label: 'Financial Profit & Loss' },
          { key: 'sales', label: 'Sales & Invoices' },
          { key: 'inventory', label: 'Inventory Valuation' },
          { key: 'solar-business', label: 'Solar Capacity Analytics' },
        ].map((item) => {
          const isActive = reportType === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setReportType(item.key as any)}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition-all cursor-pointer ${
                isActive
                  ? 'bg-solar-600 text-white border-solar-600 shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/60 font-medium'
              }`}
            >
              <span className="text-[11px] sm:text-xs tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Body */}
      {isLoading ? (
        <div className="h-64 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
      ) : (
        <Card className="!p-3.5 sm:!p-5">
          {reportType === 'financial' && reportData && (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
                <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                  Corporate Profit & Loss Statement
                </h3>
                <Badge variant="default" className="text-gray-800 dark:text-gray-200 border-gray-300 dark:border-slate-700">
                  All Branches Unified
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3 sm:p-3.5 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block uppercase font-semibold">Gross Revenue</span>
                  <span className="text-base sm:text-xl font-black text-gray-900 dark:text-white">
                    {formatCurrency(reportData.revenue)}
                  </span>
                </div>
                <div className="p-3 sm:p-3.5 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block uppercase font-semibold">Procurement Cost (COGS)</span>
                  <span className="text-base sm:text-xl font-black text-gray-900 dark:text-white">
                    -{formatCurrency(reportData.cogs)}
                  </span>
                </div>
                <div className="p-3 sm:p-3.5 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block uppercase font-semibold">Net Profit After Expenses</span>
                  <span className="text-base sm:text-xl font-black text-gray-900 dark:text-white">
                    {formatCurrency(reportData.netProfit)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="font-medium text-gray-900 dark:text-white">Gross Profit Margin:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{reportData.grossMargin}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="font-medium text-gray-900 dark:text-white">Total Operational Expenses:</span>
                  <span className="font-bold text-gray-900 dark:text-white">-{formatCurrency(reportData.expenses)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="font-medium text-gray-900 dark:text-white">Customer Receivables (Pending Collections):</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(reportData.receivables)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="font-medium text-gray-900 dark:text-white">Supplier Accounts Payable:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(reportData.payables)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="font-medium text-gray-900 dark:text-white">Dealer Referral Commissions Due:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(reportData.dealerCommissionsDue)}</span>
                </div>
              </div>
            </div>
          )}

          {reportType === 'solar-business' && reportData && (
            <div className="space-y-6">
              <h3 className="font-bold text-base text-gray-900 dark:text-white pb-3 border-b">
                Solar System Sizing & Operational Metrics
              </h3>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Sales by System Capacity
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(reportData.capacityDistribution || {}).map(([bracket, val]: any) => (
                    <div key={bracket} className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border">
                      <span className="text-xs font-bold text-solar-600 uppercase">{bracket}</span>
                      <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                        {val.count} Systems
                      </p>
                      <p className="text-[11px] text-gray-400">{formatCurrency(val.totalRevenue)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border">
                  <h4 className="font-bold text-xs text-gray-900 dark:text-white mb-2">
                    Installation Pipeline
                  </h4>
                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <p>Total Projects: <b>{reportData.installationMetrics?.total}</b></p>
                    <p>Completed Handover: <b className="text-emerald-600">{reportData.installationMetrics?.completed}</b></p>
                    <p>In Progress on Site: <b className="text-amber-600">{reportData.installationMetrics?.in_progress}</b></p>
                    <p>Pending Scheduling: <b>{reportData.installationMetrics?.pending}</b></p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border">
                  <h4 className="font-bold text-xs text-gray-900 dark:text-white mb-2">
                    Warranty & Claims Health
                  </h4>
                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <p>Total Active Warranties: <b>{reportData.warrantyMetrics?.activeWarranties}</b></p>
                    <p>Total RMA Claims Filed: <b>{reportData.warrantyMetrics?.totalClaims}</b></p>
                    <p>Successfully Resolved: <b className="text-emerald-600">{reportData.warrantyMetrics?.resolvedClaims}</b></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'sales' && reportData && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Sales Ledger ({reportData.summary?.count} Transactions)
                </h3>
                <span className="text-xs font-bold text-solar-600">
                  Total: {formatCurrency(reportData.summary?.totalRevenue)}
                </span>
              </div>

              <div className="divide-y max-h-96 overflow-y-auto">
                {reportData.sales?.map((s: any) => (
                  <div key={s.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold">{s.invoice_no}</span>
                      <span className="text-gray-400 ml-2">({s.customer?.name})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{formatCurrency(s.grand_total)}</span>
                      <Badge variant={s.payment_status === 'PAID' ? 'success' : 'warning'}>
                        {s.payment_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportType === 'inventory' && reportData && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Inventory Valuation Report
                </h3>
                <span className="text-xs font-bold text-emerald-600">
                  Total: {formatCurrency(reportData.summary?.totalValuation)}
                </span>
              </div>

              <div className="divide-y max-h-96 overflow-y-auto">
                {reportData.inventories?.map((i: any) => (
                  <div key={i.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold">{i.product.name}</p>
                      <p className="text-[10px] text-gray-400">{i.product.category?.name || i.product.model_number || 'Standard'}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{i.quantity} units</span>
                      <span className="text-gray-400 ml-3">
                        ({formatCurrency(i.quantity * i.avg_cost)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};