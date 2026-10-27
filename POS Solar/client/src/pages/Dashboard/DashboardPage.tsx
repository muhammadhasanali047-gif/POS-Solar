import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Users,
  Wrench,
  ShieldCheck,
  ArrowUpRight,
  Layers,
  Sparkles,
  UserPlus,
  FilePlus,
  ShoppingCart,
  Barcode,
  Search,
  Crown,
  Shield,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { NavItemKey } from '../../components/layout/Sidebar';
import { useAuthStore } from '../../stores/authStore';

interface DashboardPageProps {
  onNavigate?: (tab: NavItemKey) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const isExecutive = user?.role === 'ADMIN' || user?.role === 'CEO';

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isOnboardingDismissed, setIsOnboardingDismissed] = useState(() => {
    return localStorage.getItem('solar_dismiss_onboarding') === 'true';
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard stats', e);
    } finally {
      setIsLoading(false);
    }
  };

  const [assigningJob, setAssigningJob] = useState<any>(null);
  const [selectedTech, setSelectedTech] = useState('Engr. Usman Tariq & Team Alpha');
  const [isAssigning, setIsAssigning] = useState(false);

  const handleQuickAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningJob) return;
    setIsAssigning(true);
    try {
      await api.put(`/installations/${assigningJob.id}`, {
        assigned_technician: selectedTech,
        status: 'SCHEDULED',
      });
      setAssigningJob(null);
      await fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to assign technician');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded w-48"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const urgentAlerts = data?.urgentAlerts || [];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ============================================================== */}
      {/* 1. EXECUTIVE CEO VIEW (Total Sales, Revenue, Profits, Overheads) */}
      {/* ============================================================== */}
      {isExecutive ? (
        <>
          {/* Executive Header Banner */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-solar-950 via-slate-900 to-solar-900 border border-solar-500/30 rounded-2xl shadow-lg text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-amber-400 text-black flex items-center gap-1 shadow-xs">
                  <Crown className="w-3 h-3" />
                  Executive Leadership Portal
                </span>
                <span className="text-xs text-solar-200 font-medium">Alp Solar & J.I Energies • Full Access</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-1 text-white">
                Executive CEO Overview & Financial Intelligence
              </h2>
              <p className="text-xs text-gray-300 mt-0.5">
                Complete unrestricted visibility: Real-time sales, trading profit margins, market khata receivables, and overhead analytics.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate?.('settings')}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 shadow-xs cursor-pointer"
              >
                Manage Staff Users & System →
              </button>
            </div>
          </div>

          {/* 4 Primary Financial KPI Cards (CEO / ADMIN Only) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {/* Today's Sales */}
            <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 !p-3 sm:!p-4 shadow-xs">
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Today's Sales
              </span>
              <div className="mt-1 sm:mt-1.5">
                <span className="text-base sm:text-xl lg:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {formatCurrency(kpis.todaySales ?? 0)}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 block mt-1">Real-time daily cash & credit</span>
            </Card>

            {/* Monthly Sales */}
            <Card className="relative overflow-hidden border-l-4 border-l-solar-600 !p-3 sm:!p-4 shadow-xs">
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Monthly Sales Revenue
              </span>
              <div className="mt-1 sm:mt-1.5">
                <span className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {formatCurrency(kpis.monthlySales ?? 0)}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 block mt-1">Current calendar month total</span>
            </Card>

            {/* Gross Profit Margin */}
            <Card className="relative overflow-hidden border-l-4 border-l-amber-500 !p-3 sm:!p-4 shadow-xs">
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Gross Trading Profit
              </span>
              <div className="mt-1 sm:mt-1.5 flex flex-wrap items-baseline gap-1.5">
                <span className="text-base sm:text-xl lg:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  {formatCurrency(kpis.grossProfit ?? 0)}
                </span>
                <Badge variant="default" className="text-[10px] py-0 px-1.5 font-black text-gray-900 dark:text-white border-gray-300">
                  {kpis.grossMarginPercent || '18.5'}% Margin
                </Badge>
              </div>
              <span className="text-[10px] text-gray-500 block mt-1">Total revenue minus item costs</span>
            </Card>

            {/* Monthly Fixed Overheads */}
            <Card className="relative overflow-hidden border-l-4 border-l-rose-500 !p-3 sm:!p-4 shadow-xs">
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Monthly Overheads
              </span>
              <div className="mt-1 sm:mt-1.5">
                <span className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {formatCurrency(kpis.monthlyFixedOverhead || 537000)}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 block mt-1">Rent, salaries & utility costs</span>
            </Card>
          </div>

          {/* Secondary Row: Inventory Value, Receivables, Operations */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            <Card className="!p-3 sm:!p-4 border-l-4 border-l-solar-500">
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Inventory Valuation
              </span>
              <div className="mt-1">
                <span className="text-base sm:text-xl font-black text-gray-900 dark:text-white">
                  {formatCurrency(kpis.totalInventoryValuation ?? 0)}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5 block">{kpis.totalStockQuantity ?? 0} units in warehouse</span>
            </Card>

            <Card className="!p-3 sm:!p-4 border-l-4 border-l-amber-500">
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Market Khata Receivables
              </span>
              <div className="mt-1">
                <span className="text-base sm:text-xl font-black text-amber-700 dark:text-amber-400">
                  {formatCurrency(kpis.totalReceivables ?? 0)}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5 block">Pending payment from {kpis.customerCount || 0} customers</span>
            </Card>

            <Card className="!p-3 sm:!p-4 border-l-4 border-l-blue-500">
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Active Installations
              </span>
              <div className="mt-1">
                <span className="text-base sm:text-xl font-black text-blue-600 dark:text-blue-400">
                  {kpis.activeInstallationsCount || 0} Sites
                </span>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5 block">Ongoing customer site work</span>
            </Card>

            <Card className="!p-3 sm:!p-4 border-l-4 border-l-purple-500">
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Active Warranties
              </span>
              <div className="mt-1">
                <span className="text-base sm:text-xl font-black text-purple-600 dark:text-purple-400">
                  {kpis.activeWarrantiesCount || 0} Warranties
                </span>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5 block">Covered solar equipment</span>
            </Card>
          </div>

          {/* Sales Trend Area Chart (CEO Only) */}
          <Card title="Monthly Revenue & Profit Trajectory" className="w-full shadow-xs">
            <div className="h-60 sm:h-72 w-full mt-1.5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.salesTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#046BC2" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#046BC2" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F9AA0A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F9AA0A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.6} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#111827', fontWeight: 800 }}
                    axisLine={{ stroke: '#374151', strokeWidth: 1.5 }}
                    tickLine={{ stroke: '#374151', strokeWidth: 1.5 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#111827', fontWeight: 800 }}
                    axisLine={{ stroke: '#374151', strokeWidth: 1.5 }}
                    tickLine={{ stroke: '#374151', strokeWidth: 1.5 }}
                    tickFormatter={(val) => `Rs. ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, '']}
                    contentStyle={{
                      backgroundColor: '#022054',
                      border: '1px solid #046BC2',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Sales Revenue"
                    stroke="#046BC2"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Gross Margin"
                    stroke="#F9AA0A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      ) : (
        /* ============================================================== */
        /* 2. STAFF OPERATIONS PORTAL (No Financial Overview / Money Leaks) */
        /* ============================================================== */
        <>
          {/* Staff Operational Welcome Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 rounded-2xl shadow-lg text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-400 text-black flex items-center gap-1 shadow-xs">
                  <Shield className="w-3 h-3" />
                  Staff Operations Counter
                </span>
                <span className="text-xs text-emerald-300 font-medium">Alp Solar & J.I Energies • Daily Operations</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-1 text-white">
                Welcome, {user?.full_name || 'Staff User'}!
              </h2>
              <p className="text-xs text-gray-300 mt-0.5">
                Record customer walk-ins, create solar proposal quotations, issue official invoices, and verify stock availability.
              </p>
            </div>
            <div className="text-right shrink-0 hidden sm:block">
              <span className="text-[11px] text-gray-400 block">Current Role</span>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                {user?.role === 'CASHIER' ? 'Sales / Counter Staff' : 'Store Operations'}
              </span>
            </div>
          </div>

          {/* 4 HIGH-PRIORITY STAFF ACTION CARDS (Customer Walk-In, Quotation, POS Sale, Serial Lookup) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Action 1: Add New Customer */}
            <div
              onClick={() => onNavigate?.('customers')}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-500 dark:hover:border-emerald-400 shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                + Add Customer Details
              </h3>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                Save customer name, phone, CNIC, and site location address for proposals & ledger.
              </p>
              <div className="mt-3 flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 gap-1">
                <span>Enter Customer Details</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Action 2: Create Solar Quotation */}
            <div
              onClick={() => onNavigate?.('quotations')}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-solar-200 dark:border-solar-800/60 hover:border-solar-500 dark:hover:border-solar-400 shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 group"
            >
              <div className="w-10 h-10 rounded-xl bg-solar-100 dark:bg-solar-950/70 text-solar-700 dark:text-solar-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FilePlus className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white group-hover:text-solar-600 transition-colors">
                + Create Solar Quotation
              </h3>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                Generate solar proposal: calculate kW, panels, inverters & print customer quote.
              </p>
              <div className="mt-3 flex items-center text-xs font-bold text-solar-600 dark:text-solar-400 gap-1">
                <span>New Solar Quote</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Action 3: New POS Sale & Invoicing */}
            <div
              onClick={() => onNavigate?.('pos')}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-200 dark:border-blue-800/60 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                + New POS Invoice / Bill
              </h3>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                Barcode scan, select panels/inverters from cart & print official warranty bill.
              </p>
              <div className="mt-3 flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 gap-1">
                <span>Open Billing Counter</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Action 4: Track Serial & Warranty */}
            <div
              onClick={() => onNavigate?.('serials')}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-purple-200 dark:border-purple-800/60 hover:border-purple-500 dark:hover:border-purple-400 shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Barcode className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                + Track Serial & Warranty
              </h3>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                Verify panel/inverter serial number history, warranty status & file service claims.
              </p>
              <div className="mt-3 flex items-center text-xs font-bold text-purple-600 dark:text-purple-400 gap-1">
                <span>Check Serial Number</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* 4 OPERATIONAL COUNT METRICS (Non-Financial, Counts Only — Zero Revenue/Profit Leaks) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            <Card
              onClick={() => onNavigate?.('customers')}
              className="!p-3 sm:!p-4 border-l-4 border-l-emerald-600 cursor-pointer hover:border-emerald-500 transition-all shadow-xs"
            >
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Registered Customers
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base sm:text-2xl font-black text-gray-900 dark:text-white">
                  {kpis.customerCount || 0}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">In CRM</span>
              </div>
              <span className="text-[10px] text-gray-500 block mt-0.5">Click to view customer list</span>
            </Card>

            <Card
              onClick={() => onNavigate?.('inventory')}
              className="!p-3 sm:!p-4 border-l-4 border-l-solar-600 cursor-pointer hover:border-solar-500 transition-all shadow-xs"
            >
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Stock Availability
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base sm:text-2xl font-black text-gray-900 dark:text-white">
                  {kpis.totalStockQuantity ?? 0}
                </span>
                <span className="text-[11px] text-solar-600 dark:text-solar-400 font-bold">Units Ready</span>
              </div>
              <span className="text-[10px] text-gray-500 block mt-0.5">Panels, Inverters, Batteries</span>
            </Card>

            <Card
              onClick={() => onNavigate?.('pos')}
              className="!p-3 sm:!p-4 border-l-4 border-l-blue-600 cursor-pointer hover:border-blue-500 transition-all shadow-xs"
            >
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Today's Customer Bills
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base sm:text-2xl font-black text-gray-900 dark:text-white">
                  {kpis.todayInvoicesCount ?? 0}
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">Invoices</span>
              </div>
              <span className="text-[10px] text-gray-500 block mt-0.5">Issued today at counter</span>
            </Card>

            <Card
              onClick={() => onNavigate?.('installations')}
              className="!p-3 sm:!p-4 border-l-4 border-l-purple-600 cursor-pointer hover:border-purple-500 transition-all shadow-xs"
            >
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
                Active Installations
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base sm:text-2xl font-black text-gray-900 dark:text-white">
                  {kpis.activeInstallationsCount || 0}
                </span>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">Site Jobs</span>
              </div>
              <span className="text-[10px] text-gray-500 block mt-0.5">Field technician jobs</span>
            </Card>
          </div>

          {/* Quick Customer Search & Operations Help */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-9 h-9 rounded-xl bg-solar-100 dark:bg-solar-950 text-solar-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Incoming Customer at Counter?
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Quickly search by phone number or name to review past balance, solar warranty, or add new records.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('customers')}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Go to Customer CRM & Khata →</span>
            </button>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* 3. COMMON OPERATIONAL MODULES (Low Stock Alerts & Installations) */}
      {/* ============================================================== */}

      {/* Quick Technician Assignment Modal */}
      {assigningJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-solar-600" />
                Dispatch Lead Technician
              </h3>
              <button
                onClick={() => setAssigningJob(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleQuickAssign} className="mt-4 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl space-y-1 text-xs">
                <p><strong className="text-gray-700 dark:text-gray-300">Job:</strong> {assigningJob.job_no}</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Customer:</strong> {assigningJob.customer_name} ({assigningJob.customer_phone})</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Site Address:</strong> {assigningJob.address}</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Capacity:</strong> {assigningJob.system_capacity_kw || 10} kW Solar Array</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Select Lead Installation Engineer / Team
                </label>
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="w-full py-2 px-3 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-solar-500 text-gray-900 dark:text-white font-medium"
                >
                  <option value="Engr. Usman Tariq & Team Alpha">Engr. Usman Tariq & Team Alpha (Lead Engineer)</option>
                  <option value="Engr. Bilal Khalid (Electrical Lead)">Engr. Bilal Khalid (Electrical Lead)</option>
                  <option value="Engr. Farrukh Shah (Multan Industrial Team)">Engr. Farrukh Shah (Multan Industrial Team)</option>
                  <option value="Muhammad Asif (Senior Tech)">Muhammad Asif (Senior Tech)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningJob(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-2 rounded-xl bg-solar-600 hover:bg-solar-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  {isAssigning ? 'Dispatching...' : 'Confirm & Dispatch Crew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Low Stock Warning Box (Visible to both CEO and Staff so staff knows what can be sold!) */}
      {data?.lowStockItems && data.lowStockItems.length > 0 && (
        <Card
          title="Warehouse Low-Stock Inventory Alerts"
          subtitle="Items that have dropped below safety thresholds (inform customer before promising delivery)"
          className="border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-1">
            {data.lowStockItems.map((item: any) => (
              <div
                key={item.id}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-slate-800 flex items-center justify-between shadow-xs"
              >
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-[10px] text-gray-400">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-rose-600">
                    {item.currentQuantity} left
                  </span>
                  <p className="text-[9px] text-gray-400">Safety Min: {item.minAlert}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};