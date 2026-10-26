import React, { useEffect, useState } from 'react';
import { Receipt, Plus, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Expense } from '../../types';

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profitSummary, setProfitSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState('RENT');
  const [amount, setAmount] = useState<number>(10000);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidTo, setPaidTo] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expRes, profRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/profit-summary'),
      ]);

      if (expRes.data?.success) setExpenses(expRes.data.data);
      if (profRes.data?.success) setProfitSummary(profRes.data.data);
    } catch (e) {
      console.error('Failed to load expenses', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/expenses', {
        category,
        amount,
        payment_method: paymentMethod,
        paid_to: paidTo,
        description,
      });

      if (res.data?.success) {
        setShowAddModal(false);
        setPaidTo('');
        setDescription('');
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record expense');
    }
  };

  const columns: Column<Expense>[] = [
    {
      key: 'expense_no',
      header: 'Expense #',
      render: (e) => <span className="font-bold text-gray-900 dark:text-white">{e.expense_no}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (e) => <Badge variant="default">{e.category.replace('_', ' ')}</Badge>,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (e) => <span className="font-bold text-rose-600">-{formatCurrency(e.amount)}</span>,
    },
    {
      key: 'paid_to',
      header: 'Beneficiary / Paid To',
      render: (e) => <span className="font-semibold">{e.paid_to || 'N/A'}</span>,
    },
    {
      key: 'payment_method',
      header: 'Mode',
      render: (e) => <span className="text-gray-500 text-xs">{e.payment_method}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (e) => <span className="text-gray-500 text-xs truncate max-w-xs">{e.description}</span>,
    },
    {
      key: 'expense_date',
      header: 'Date',
      sortable: true,
      render: (e) => formatDate(e.expense_date),
    },
  ];

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Expenses & Profit/Loss
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Expense</span>
        </button>
      </div>

      {/* P&L Trajectory Cards (2 cols on mobile, 4 on desktop) */}
      {profitSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          <Card className="border-l-4 border-l-solar-600 !p-3 sm:!p-4">
            <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase truncate block">Revenue</span>
            <h4 className="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1 truncate">
              {formatCurrency(profitSummary.totalRevenue)}
            </h4>
          </Card>

          <Card className="border-l-4 border-l-solar-600 !p-3 sm:!p-4">
            <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase truncate block">Gross Margin</span>
            <h4 className="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1 truncate">
              {formatCurrency(profitSummary.grossProfit)}
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Margin: {profitSummary.grossMargin}</p>
          </Card>

          <Card className="border-l-4 border-l-solar-600 !p-3 sm:!p-4">
            <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase truncate block">Total Expenses</span>
            <h4 className="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1 truncate">
              -{formatCurrency(profitSummary.totalExpenses)}
            </h4>
          </Card>

          <Card className="border-l-4 border-l-solar-600 !p-3 sm:!p-4">
            <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase truncate block">Net Profit</span>
            <h4 className="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1 truncate">
              {formatCurrency(profitSummary.netProfit)}
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Margin: {profitSummary.netMargin}</p>
          </Card>
        </div>
      )}

      <DataTable
        data={expenses}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search expenses by beneficiary, category, number..."
        searchField={(e) => `${e.expense_no} ${e.category} ${e.paid_to || ''} ${e.description || ''}`}
        emptyTitle="No expenses recorded yet"
        emptyMessage="Log rent, utilities, staff payroll, and daily store operational costs."
        emptyAction={{
          label: '+ Record Expense',
          onClick: () => setShowAddModal(true),
          icon: <Plus className="w-3.5 h-3.5" />,
        }}
      />

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Operational Expense"
        maxWidth="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl font-medium"
            >
              <option value="RENT">Rent (Shop / Office)</option>
              <option value="SALARIES">Staff Salaries & Payroll</option>
              <option value="FUEL">Fuel & Transportation Logistics</option>
              <option value="INSTALLATION_LABOR">Site Installation Labor</option>
              <option value="MARKETING">Marketing & Advertisements</option>
              <option value="UTILITIES">Electricity, Water & Internet</option>
              <option value="MAINTENANCE">Equipment Maintenance</option>
              <option value="OFFICE">Office Supplies & Miscellaneous</option>
              <option value="OTHER">Other Operational Expense</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Amount (Rs.) *</label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl font-bold text-rose-600"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Payment Mode</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE">Online Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Paid To / Beneficiary</label>
            <input
              type="text"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="e.g. Total Parco / Landlord / Installation Team"
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Description / Details</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Expense justification or invoice reference..."
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md mt-2"
          >
            Save Expense
          </button>
        </form>
      </Modal>
    </div>
  );
};