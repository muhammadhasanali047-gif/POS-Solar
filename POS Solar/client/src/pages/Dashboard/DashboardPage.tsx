import React, { useEffect, useState, useMemo } from 'react';
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
  Search,
  Boxes,
  CheckCircle2,
  X,
  Plus,
  ArrowRight,
  Check,
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
import { Modal } from '../../components/ui/Modal';
import { NavItemKey } from '../../components/layout/Sidebar';

interface DashboardPageProps {
  onNavigate?: (tab: NavItemKey) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  // Stock Availability Modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [stockFilterTab, setStockFilterTab] = useState<'all' | 'out' | 'low' | 'available'>('all');

  // Quick Restock inside Stock Modal
  const [restockingItem, setRestockingItem] = useState<any>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockMode, setRestockMode] = useState<'set' | 'add'>('set');
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingItem) return;
    setIsUpdatingStock(true);
    try {
      const pId = restockingItem.productId || restockingItem.id;
      const res = await api.post(`/products/${pId}/stock`, {
        quantity: Number(restockQty),
        mode: restockMode,
        reason: 'Restocked from Dashboard Alert',
      });
      if (res.data?.success) {
        setRestockingItem(null);
        await fetchStats();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update stock');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const allStockList = useMemo(() => {
    if (!data?.allStockItems) return [];
    let items = data.allStockItems;

    if (stockFilterTab === 'out') {
      items = items.filter((i: any) => i.isZero);
    } else if (stockFilterTab === 'low') {
      items = items.filter((i: any) => i.isLow);
    } else if (stockFilterTab === 'available') {
      items = items.filter((i: any) => i.currentQuantity > 0);
    }

    if (stockSearchTerm.trim()) {
      const q = stockSearchTerm.toLowerCase();
      items = items.filter(
        (i: any) =>
          i.name?.toLowerCase().includes(q) ||
          i.modelNumber?.toLowerCase().includes(q) ||
          i.brandName?.toLowerCase().includes(q) ||
          i.categoryName?.toLowerCase().includes(q)
      );
    }

    return items;
  }, [data?.allStockItems, stockFilterTab, stockSearchTerm]);

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
    <div className="space-y-3.5 sm:space-y-4">
      {/* First-Time Onboarding Quick Setup Checklist (Requirement 7) */}
      {((kpis.totalStockQuantity ?? 0) === 0 || (kpis.customerCount ?? 0) === 0 || (kpis.monthlySales ?? 0) === 0) &&
        !isOnboardingDismissed && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-solar-500/10 via-amber-500/10 to-solar-500/5 border border-solar-500/30 dark:border-solar-500/40 rounded-2xl relative shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-solar-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                    Welcome to Alp Solar & J.I Energies! Setup Guide
                  </h3>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                    Follow these 4 simple steps to initialize your shop catalog and record your first solar sale.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOnboardingDismissed(true);
                  localStorage.setItem('solar_dismiss_onboarding', 'true');
                }}
                className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium px-2 py-0.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 shrink-0 cursor-pointer"
              >
                ✕ Dismiss
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-3.5">
              <div
                onClick={() => onNavigate?.('products')}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 hover:border-solar-500 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 group"
              >
                <div className="w-6 h-6 rounded-lg bg-solar-50 dark:bg-solar-950/50 text-solar-600 dark:text-solar-400 flex items-center justify-center font-black text-[11px] mb-1.5">
                  1
                </div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-solar-600 transition-colors">
                  Add Your First Product
                </h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Catalog panels, inverters, or batteries with cost and sale pricing.
                </p>
                <span className="text-[10px] text-solar-600 dark:text-solar-400 font-bold inline-flex items-center gap-1 mt-1.5">
                  Go to Products →
                </span>
              </div>

              <div
                onClick={() => onNavigate?.('customers')}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 hover:border-solar-500 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 group"
              >
                <div className="w-6 h-6 rounded-lg bg-solar-50 dark:bg-solar-950/50 text-solar-600 dark:text-solar-400 flex items-center justify-center font-black text-[11px] mb-1.5">
                  2
                </div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-solar-600 transition-colors">
                  Add a Customer
                </h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Save customer phone, CNIC, and site address for billing.
                </p>
                <span className="text-[10px] text-solar-600 dark:text-solar-400 font-bold inline-flex items-center gap-1 mt-1.5">
                  Go to Customers →
                </span>
              </div>

              <div
                onClick={() => onNavigate?.('pos')}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 hover:border-solar-500 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 group"
              >
                <div className="w-6 h-6 rounded-lg bg-solar-50 dark:bg-solar-950/50 text-solar-600 dark:text-solar-400 flex items-center justify-center font-black text-[11px] mb-1.5">
                  3
                </div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-solar-600 transition-colors">
                  Make Your First Sale
                </h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Select products in POS cart and print warranty-backed invoice.
                </p>
                <span className="text-[10px] text-solar-600 dark:text-solar-400 font-bold inline-flex items-center gap-1 mt-1.5">
                  Open POS Counter →
                </span>
              </div>

              <div
                onClick={() => onNavigate?.('settings')}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 hover:border-solar-500 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 group"
              >
                <div className="w-6 h-6 rounded-lg bg-solar-50 dark:bg-solar-950/50 text-solar-600 dark:text-solar-400 flex items-center justify-center font-black text-[11px] mb-1.5">
                  4
                </div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-solar-600 transition-colors">
                  Setup Company Profile
                </h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Configure business name, shop address, and invoice headers.
                </p>
                <span className="text-[10px] text-solar-600 dark:text-solar-400 font-bold inline-flex items-center gap-1 mt-1.5">
                  Open Settings →
                </span>
              </div>
            </div>
          </div>
        )}

      {/* 4-Column Responsive Grid of Realigned KPI Cards (2 cols on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Today's Sales */}
        <Card className="relative overflow-hidden border-l-4 border-l-solar-600 !p-3 sm:!p-4">
          <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
            Today's Sales
          </span>
          <div className="mt-1 sm:mt-1.5">
            <span className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {formatCurrency(kpis.todaySales)}
            </span>
          </div>
        </Card>

        {/* Monthly Revenue */}
        <Card className="relative overflow-hidden border-l-4 border-l-solar-600 !p-3 sm:!p-4">
          <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
            Monthly Sales
          </span>
          <div className="mt-1 sm:mt-1.5">
            <span className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {formatCurrency(kpis.monthlySales)}
            </span>
          </div>
        </Card>

        {/* Trading Gross Profit (COGS-Based Margin) */}
        <Card className="relative overflow-hidden border-l-4 border-l-solar-600 !p-3 sm:!p-4">
          <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
            Gross Profit
          </span>
          <div className="mt-1 sm:mt-1.5 flex flex-wrap items-baseline gap-1.5">
            <span className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {formatCurrency(kpis.grossProfit)}
            </span>
            <Badge variant="default" className="text-[10px] py-0 px-1.5 font-black text-gray-900 dark:text-white border-gray-300">
              {kpis.grossMarginPercent || '18.5'}%
            </Badge>
          </div>
        </Card>

        {/* Monthly Fixed Overheads & Daily Run Rate */}
        <Card className="relative overflow-hidden border-l-4 border-l-solar-600 !p-3 sm:!p-4">
          <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider block truncate">
            Monthly Overheads
          </span>
          <div className="mt-1 sm:mt-1.5">
            <span className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {formatCurrency(kpis.monthlyFixedOverhead || 537000)}
            </span>
          </div>
        </Card>
      </div>

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
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
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
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-2 rounded-xl bg-solar-600 hover:bg-solar-700 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  {isAssigning ? 'Dispatching...' : 'Confirm & Dispatch Crew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secondary Row: Inventory & Operations (2 cols on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Inventory Stock & Value */}
        <Card className="!p-3 sm:!p-4">
          <div>
            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider truncate">Inventory Valuation</p>
            <h4 className="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1 truncate">
              {formatCurrency(kpis.totalInventoryValuation)}
            </h4>
          </div>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="!p-3 sm:!p-4">
          <div>
            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider truncate">Low Stock Alerts</p>
            <h4 className="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1 truncate">
              {kpis.lowStockCount || 0} Products
            </h4>
          </div>
        </Card>

        {/* Ongoing Installations */}
        <Card className="!p-3 sm:!p-4">
          <div>
            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider truncate">Active Installations</p>
            <h4 className="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1 truncate">
              {kpis.activeInstallationsCount || 0} Sites
            </h4>
          </div>
        </Card>

        {/* Warranties & Claims */}
        <Card className="!p-3 sm:!p-4">
          <div>
            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider truncate">Active Warranties</p>
            <h4 className="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1 truncate">
              {kpis.activeWarrantiesCount || 0} Warranties
            </h4>
          </div>
        </Card>
      </div>

      {/* Sales Trend Chart */}
      <div>
        {/* Sales Trend Area Chart (Full Width) */}
        <Card
          title="Revenue & Profit Trajectory"
          className="w-full"
        >
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
      </div>

      {/* Low Stock Warning Box */}
      {data?.lowStockItems && data.lowStockItems.length > 0 && (
        <Card
          title="Critical Low-Stock Notice"
          subtitle="The following inventory items have dropped below safety thresholds"
          className="border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10"
          action={
            <button
              type="button"
              onClick={() => {
                setStockFilterTab('all');
                setShowStockModal(true);
              }}
              className="px-3.5 py-1.5 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Check All Stock Availability</span>
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.lowStockItems.map((item: any) => (
              <div
                key={item.id}
                onClick={() => {
                  setStockFilterTab('all');
                  setStockSearchTerm(item.name);
                  setShowStockModal(true);
                }}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 hover:border-solar-500 dark:border-slate-800 dark:hover:border-solar-500 flex items-center justify-between shadow-xs cursor-pointer hover:shadow-md transition-all group active:scale-[0.99]"
                title="Click to check stock availability & restock"
              >
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-solar-600 transition-colors">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-gray-400">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-rose-600 block">
                    {item.currentQuantity} left
                  </span>
                  <span className="text-[9px] font-bold text-solar-600 group-hover:underline flex items-center gap-0.5 justify-end">
                    Check stock →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stock Availability & Quick Restock Modal */}
      <Modal
        isOpen={showStockModal}
        onClose={() => {
          setShowStockModal(false);
          setStockSearchTerm('');
          setRestockingItem(null);
        }}
        title="📦 Inventory Stock Availability & Quick Restock"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Summary KPI Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-center">
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase block">Out of Stock</span>
              <span className="text-base font-black text-rose-600 dark:text-rose-400">
                {data?.kpis?.outOfStockCount ?? data?.allStockItems?.filter((i: any) => i.isZero)?.length ?? 0}
              </span>
              <span className="text-[9px] text-rose-500 block">0 units left</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-center">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase block">Low Stock</span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">
                {data?.kpis?.lowStockCount ?? data?.allStockItems?.filter((i: any) => i.isLow)?.length ?? 0}
              </span>
              <span className="text-[9px] text-amber-500 block">&le; alert level</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-center">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Available Stock</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {data?.kpis?.availableStockCount ?? data?.allStockItems?.filter((i: any) => i.currentQuantity > 0)?.length ?? 0}
              </span>
              <span className="text-[9px] text-emerald-500 block">Ready to sell</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-center">
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase block">Total Catalog</span>
              <span className="text-base font-black text-gray-800 dark:text-gray-200">
                {data?.allStockItems?.length ?? 0}
              </span>
              <span className="text-[9px] text-gray-500 block">Total products</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setStockFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  stockFilterTab === 'all'
                    ? 'bg-solar-600 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                All ({data?.allStockItems?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setStockFilterTab('out')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  stockFilterTab === 'out'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                🔴 Out of Stock ({data?.allStockItems?.filter((i: any) => i.isZero).length || 0})
              </button>
              <button
                type="button"
                onClick={() => setStockFilterTab('low')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  stockFilterTab === 'low'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                ⚠️ Low Stock ({data?.allStockItems?.filter((i: any) => i.isLow).length || 0})
              </button>
              <button
                type="button"
                onClick={() => setStockFilterTab('available')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  stockFilterTab === 'available'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                🟢 Available ({data?.allStockItems?.filter((i: any) => i.currentQuantity > 0).length || 0})
              </button>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search stock..."
                value={stockSearchTerm}
                onChange={(e) => setStockSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-solar-500"
              />
              {stockSearchTerm && (
                <button
                  type="button"
                  onClick={() => setStockSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Restock Inline Form (when an item is selected for restock) */}
          {restockingItem && (
            <form
              onSubmit={handleRestockSubmit}
              className="p-3 bg-solar-50/80 dark:bg-solar-950/40 border border-solar-200 dark:border-solar-800/60 rounded-xl space-y-2 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-solar-800 dark:text-solar-300 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Update Stock for: <b className="text-gray-900 dark:text-white">{restockingItem.name}</b></span>
                </span>
                <button
                  type="button"
                  onClick={() => setRestockingItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setRestockMode('set')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border cursor-pointer ${
                      restockMode === 'set'
                        ? 'bg-solar-600 text-white border-solar-600'
                        : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    = Set Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockMode('add')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border cursor-pointer ${
                      restockMode === 'add'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    + Add Units
                  </button>
                </div>

                <div>
                  <input
                    type="number"
                    min="0"
                    required
                    value={restockQty}
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    placeholder="Quantity"
                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg font-bold text-xs text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isUpdatingStock}
                    className="w-full py-1.5 bg-solar-600 hover:bg-solar-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isUpdatingStock ? 'Saving...' : 'Confirm & Save Stock'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Items List */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {allStockList.length > 0 ? (
              allStockList.map((item: any) => {
                const isZero = item.currentQuantity === 0;
                const isLow = item.currentQuantity <= item.minAlert;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                      isZero
                        ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                        : isLow
                        ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          ({item.brandName || item.brand || 'Solar'} • {item.categoryName || item.category || 'General'})
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Model: <span className="font-medium text-gray-700 dark:text-gray-300">{item.modelNumber || 'Standard'}</span>
                        {' '}&bull; Min Alert: {item.minAlert || 5} units
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-black text-sm block ${
                            isZero
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLow
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {item.currentQuantity} units
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider block ${
                            isZero
                              ? 'text-rose-500'
                              : isLow
                              ? 'text-amber-500'
                              : 'text-emerald-600'
                          }`}
                        >
                          {isZero ? 'Out of Stock 🔴' : isLow ? 'Low Stock ⚠️' : 'Available 🟢'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setRestockingItem(item);
                          setRestockMode('set');
                          setRestockQty(item.currentQuantity || 10);
                        }}
                        className="px-2.5 py-1.5 bg-solar-50 hover:bg-solar-100 dark:bg-solar-950/60 dark:hover:bg-solar-900/60 text-solar-700 dark:text-solar-400 border border-solar-200 dark:border-solar-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Set or Add Stock for this item"
                      >
                        <Boxes className="w-3 h-3" />
                        <span>+ Set Stock</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-gray-400">
                No items match your filter or search query.
              </div>
            )}
          </div>

          {/* Quick Page Jump Links */}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {onNavigate && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStockModal(false);
                      onNavigate('inventory');
                    }}
                    className="text-solar-600 hover:text-solar-700 font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Full Inventory Screen</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStockModal(false);
                      onNavigate('products');
                    }}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Products Catalog</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowStockModal(false);
                setStockSearchTerm('');
                setRestockingItem(null);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};