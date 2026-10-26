import React, { useEffect, useState } from 'react';
import { Award, Plus, DollarSign, Users, Wrench, Eye, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Dealer } from '../../types';
import { useAuthStore } from '../../stores/authStore';

export const DealersPage: React.FC = () => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showConfirmPayout, setShowConfirmPayout] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);

  // Form State
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [commType, setCommType] = useState('PERCENTAGE');
  const [commValue, setCommValue] = useState<number>(5.0);

  // Payout Form
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutRef, setPayoutRef] = useState('');

  const { user } = useAuthStore();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    loadDealers();
  }, []);

  const loadDealers = async () => {
    try {
      const res = await api.get('/dealers');
      if (res.data?.success) setDealers(res.data.data);
    } catch (e) {
      console.error('Failed to load dealers', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/dealers', {
        name,
        company_name: companyName,
        phone,
        email,
        commission_type: commType,
        commission_value: commValue,
      });

      if (res.data?.success) {
        setShowAddModal(false);
        setName('');
        setPhone('');
        loadDealers();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add dealer');
    }
  };

  const handleInitiatePayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealer) return;
    if (payoutAmount <= 0) {
      alert('Payout amount must be greater than 0');
      return;
    }
    setShowConfirmPayout(true);
  };

  const executePayout = async () => {
    if (!selectedDealer) return;
    setIsPaying(true);
    try {
      const res = await api.post(`/dealers/${selectedDealer.id}/payout`, {
        amount: payoutAmount,
        payment_ref: payoutRef,
      });

      if (res.data?.success) {
        setShowConfirmPayout(false);
        setShowPayoutModal(false);
        setPayoutAmount(0);
        setPayoutRef('');
        loadDealers();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payout failed');
    } finally {
      setIsPaying(false);
    }
  };

  const handleViewDealer = async (d: Dealer) => {
    try {
      const res = await api.get(`/dealers/${d.id}`);
      if (res.data?.success) {
        setSelectedDealer(res.data.data);
        setShowDetailModal(true);
      }
    } catch (e) {
      alert('Failed to load dealer profile');
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Dealers & Agents
          </h2>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Dealer</span>
          </button>
        )}
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-60 bg-gray-200 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
          ))
        ) : dealers.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-solar-50 dark:bg-slate-800 border border-solar-200 dark:border-slate-700 flex items-center justify-center text-solar-600 shadow-xs">
                <Users className="w-7 h-7 text-solar-600 dark:text-solar-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  No dealers registered yet
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Add channel partners and sales agents to track referral commissions and payouts.
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-solar-600 hover:bg-solar-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add First Dealer</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          dealers.map((dealer) => (
            <Card
              key={dealer.id}
              className="border border-gray-200 dark:border-slate-800 hover:border-solar-500/60 transition-all rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold text-solar-600 dark:text-solar-400 uppercase tracking-wider">
                    {dealer.dealer_no}
                  </span>
                  <Badge variant={dealer.status === 'ACTIVE' ? 'success' : 'default'}>
                    {dealer.status}
                  </Badge>
                </div>

                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {dealer.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {dealer.company_name || 'Independent Partner'} • {dealer.phone}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Sales Volume</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(dealer.total_sales_volume)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Earned Comm.</span>
                    <span className="font-bold text-solar-600">
                      {formatCurrency(dealer.total_commission_earned)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold">
                    Balance Payable:
                  </span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">
                    {formatCurrency(dealer.balance_payable)}
                  </span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleViewDealer(dealer)}
                  className="flex-1 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Full Record</span>
                </button>

                {canEdit && dealer.balance_payable > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDealer(dealer);
                      setPayoutAmount(dealer.balance_payable);
                      setShowPayoutModal(true);
                    }}
                    className="px-3.5 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Payout
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Dealer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Solar Equipment Dealer"
        maxWidth="md"
      >
        <form onSubmit={handleCreateDealer} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Dealer Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tariq Mehmood"
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Company / Trading Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Apex Solar Traders"
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Commission Scheme</label>
              <select
                value={commType}
                onChange={(e) => setCommType(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_PER_KW">Fixed per kW (Rs.)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">
              Commission Value ({commType === 'PERCENTAGE' ? '%' : 'Rs./kW'})
            </label>
            <input
              type="number"
              value={commValue}
              onChange={(e) => setCommValue(Number(e.target.value))}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl font-bold text-gray-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md mt-2 transition-all cursor-pointer"
          >
            Save Dealer Profile
          </button>
        </form>
      </Modal>

      {/* Payout Modal */}
      <Modal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        title="Pay Commission"
        maxWidth="sm"
      >
        {selectedDealer && (
          <form onSubmit={handleInitiatePayout} className="space-y-3 text-xs">
            <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
              <p className="font-bold text-gray-900 dark:text-white">{selectedDealer.name}</p>
              <p className="text-gray-500">
                Outstanding Balance: <b>{formatCurrency(selectedDealer.balance_payable)}</b>
              </p>
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Payout Amount (Rs.) *</label>
              <input
                type="number"
                min="1"
                required
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl font-bold text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Payment Reference</label>
              <input
                type="text"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                placeholder="Bank transfer / cheque ref..."
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md mt-2 cursor-pointer transition-all"
            >
              Review & Pay
            </button>
          </form>
        )}
      </Modal>

      {/* Full Dealer Record Drill-down Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Dealer Full Record & Ledger"
        maxWidth="2xl"
      >
        {selectedDealer && (
          <div className="space-y-4 text-xs">
            {/* Header */}
            <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm text-gray-900 dark:text-white">
                  {selectedDealer.name} ({selectedDealer.company_name})
                </h3>
                <p className="text-gray-500">{selectedDealer.phone} • {selectedDealer.address}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block uppercase">Commission Due</span>
                <span className="text-base font-black text-solar-600 dark:text-solar-400">
                  {formatCurrency(selectedDealer.commissionSummary?.balancePayable)}
                </span>
              </div>
            </div>

            {/* Sales History */}
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">Referred Sales & Invoices</h4>
              <div className="border rounded-xl divide-y overflow-hidden max-h-40 overflow-y-auto">
                {selectedDealer.sales?.map((s: any) => (
                  <div key={s.id} className="p-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold">{s.invoice_no}</span>
                      <span className="text-gray-400 ml-2">Client: {s.customer?.name}</span>
                    </div>
                    <span className="font-bold">{formatCurrency(s.grand_total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Customers */}
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">Linked Customer Directory</h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedDealer.linkedCustomers?.map((c: any) => (
                  <div key={c.id} className="p-2 bg-gray-50 dark:bg-slate-950 rounded-xl border">
                    <p className="font-bold">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{c.phone}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog for Commission Payout */}
      <ConfirmDialog
        isOpen={showConfirmPayout}
        onClose={() => setShowConfirmPayout(false)}
        onConfirm={executePayout}
        title="Confirm Commission Payout"
        message={`Are you sure you want to issue a commission payout to ${selectedDealer?.name}? This will record the payment and update the balance payable.`}
        confirmLabel="Confirm & Issue Payout"
        cancelLabel="Cancel"
        isLoading={isPaying}
        details={[
          {
            label: 'Dealer / Agent',
            value: selectedDealer ? `${selectedDealer.name} (${selectedDealer.dealer_no})` : '-',
          },
          {
            label: 'Current Balance Payable',
            value: formatCurrency(selectedDealer?.balance_payable || 0),
          },
          {
            label: 'Payout Amount',
            value: formatCurrency(payoutAmount),
          },
          {
            label: 'Remaining Balance After Payout',
            value: formatCurrency(Math.max(0, (selectedDealer?.balance_payable || 0) - payoutAmount)),
          },
          ...(payoutRef ? [{ label: 'Payment Reference', value: payoutRef }] : []),
        ]}
      />
    </div>
  );
};