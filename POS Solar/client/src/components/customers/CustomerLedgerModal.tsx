import React, { useEffect, useState } from 'react';
import {
  Phone,
  MapPin,
  Calendar,
  Zap,
  CheckCircle2,
  Wallet,
  FileText,
  Package,
  Receipt,
  DollarSign,
  Printer,
} from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Customer } from '../../types';
import { usePrinterStore } from '../../stores/printerStore';
import { PaymentMethodSelect } from '../ui/PaymentMethodSelect';

interface CustomerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onPaymentRecorded?: () => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onPaymentRecorded,
}) => {
  const { triggerPrint } = usePrinterStore();
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'statement' | 'equipment' | 'invoices'>('statement');

  // Inline Quick Payment Drawer / State
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('CASH');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  useEffect(() => {
    if (isOpen && customer?.id) {
      loadLedger(customer.id);
      setShowPayForm(false);
    } else {
      setLedgerData(null);
    }
  }, [isOpen, customer?.id]);

  const loadLedger = async (customerId: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/customers/${customerId}/ledger`);
      if (res.data?.success) {
        setLedgerData(res.data.data);
        if (res.data.data.summary.currentBalance > 0) {
          setPayAmount(res.data.data.summary.currentBalance);
        } else {
          setPayAmount(10000);
        }
      }
    } catch (err) {
      console.error('Failed to load customer ledger', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id || payAmount <= 0) return;
    setIsSubmittingPay(true);
    try {
      const res = await api.post(`/customers/${customer.id}/payments`, {
        amount: payAmount,
        payment_method: payMethod,
        transaction_ref: payRef,
        notes: payNotes || `Payment received for ${customer.name}`,
      });

      if (res.data?.success) {
        setShowPayForm(false);
        setPayRef('');
        setPayNotes('');
        await loadLedger(customer.id);
        if (onPaymentRecorded) onPaymentRecorded();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handlePrintLedger = () => {
    if (!ledgerData) return;
    const { customer: cust, summary, ledger } = ledgerData;
    triggerPrint({
      docType: 'customer_ledger',
      docNumber: `LDG-${cust.customer_no}`,
      date: new Date().toLocaleDateString(),
      customerName: cust.name,
      customerPhone: cust.phone,
      customerCity: cust.city,
      customerAddress: cust.address,
      items: [],
      subtotal: summary.totalPurchased,
      grandTotal: summary.totalPurchased,
      paidAmount: summary.totalPaid,
      balanceDue: summary.currentBalance,
      notes: `Customer Since: ${formatDate(summary.firstPurchaseDate)} • Total Invoices: ${summary.totalInvoices} • Payments Received: ${summary.totalPayments}`,
      ledgerEntries: ledger.map((l: any) => ({
        date: l.date,
        ref_no: l.ref_no,
        description: l.description,
        debit: l.debit,
        credit: l.credit,
        running_balance: l.running_balance,
      })),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Account Ledger Statement"
      maxWidth="4xl"
    >
      {isLoading ? (
        <div className="py-20 text-center text-gray-500 space-y-3">
          <div className="w-10 h-10 border-4 border-solar-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-bold text-xs text-gray-800 dark:text-gray-200">
            Loading Customer Ledger History...
          </p>
        </div>
      ) : ledgerData ? (
        <div className="space-y-4 text-xs">
          {/* Top Customer Info Bar with Action Buttons */}
          <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-gray-900 dark:text-white">
                  {ledgerData.customer.name}
                </h3>
                <Badge variant={ledgerData.customer.customer_type === 'COMMERCIAL' ? 'dealer' : 'default'}>
                  {ledgerData.customer.customer_type}
                </Badge>
                <span className="text-[11px] font-bold text-gray-500">
                  ID: {ledgerData.customer.customer_no}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-gray-600 dark:text-gray-400 text-xs">
                <span className="flex items-center gap-1 font-bold text-gray-800 dark:text-gray-200">
                  <Phone className="w-3.5 h-3.5 text-solar-600" />
                  {ledgerData.customer.phone}
                </span>
                {ledgerData.customer.cnic && (
                  <span>• CNIC: {ledgerData.customer.cnic}</span>
                )}
                {ledgerData.customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {ledgerData.customer.address}, {ledgerData.customer.city}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPayForm((prev) => !prev)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                <span>{showPayForm ? 'Hide Form' : 'Receive Payment'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrintLedger}
                className="px-3.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-gray-100 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Print Official Customer Account Statement"
              >
                <Printer className="w-4 h-4" />
                <span>Print Ledger Statement</span>
              </button>
            </div>
          </div>

          {/* Quick Payment Form Drawer */}
          {showPayForm && (
            <form onSubmit={handleRecordPayment} className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-500/60 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center">
                <span className="font-black text-xs text-emerald-900 dark:text-emerald-200 uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Receive Payment From {ledgerData.customer.name}
                </span>
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  Current Balance Due: <b>{formatCurrency(ledgerData.summary.currentBalance)}</b>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">Amount Received (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-emerald-400 rounded-xl font-black text-emerald-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <PaymentMethodSelect
                    label="Payment Mode"
                    value={payMethod}
                    onChange={(val) => setPayMethod(val)}
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">Transaction Ref / Slip #</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. HBL-99231 / Cheque #"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPayForm(false)}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 rounded-xl font-bold text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingPay ? 'Saving Payment...' : 'Confirm Payment & Update Ledger'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 4 Core Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Customer Since / 1st Purchase Date */}
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/60">
              <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Customer Since (1st Purchase)
              </span>
              <p className="text-base font-black text-blue-950 dark:text-blue-100 mt-1">
                {formatDate(ledgerData.summary.firstPurchaseDate)}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-semibold">
                First purchase record
              </p>
            </div>

            {/* 2. Total Solar Purchases */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-solar-600" />
                Total Solar Purchases
              </span>
              <p className="text-base font-black text-gray-900 dark:text-white mt-1">
                {formatCurrency(ledgerData.summary.totalPurchased)}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">
                {ledgerData.summary.totalInvoices} Invoices billed
              </p>
            </div>

            {/* 3. Total Paid Amount */}
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Total Payments Received
              </span>
              <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {formatCurrency(ledgerData.summary.totalPaid)}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">
                {ledgerData.summary.totalPayments} Payments received
              </p>
            </div>

            {/* 4. Current Balance Due */}
            <div className={`p-3.5 rounded-2xl border ${
              ledgerData.summary.currentBalance > 0
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
            }`}>
              <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${
                ledgerData.summary.currentBalance > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-400'
              }`}>
                <Wallet className="w-3 h-3" />
                Outstanding Balance Due
              </span>
              <p className={`text-base font-black mt-1 ${
                ledgerData.summary.currentBalance > 0 ? 'text-amber-900 dark:text-amber-200' : 'text-emerald-700 dark:text-emerald-300'
              }`}>
                {formatCurrency(ledgerData.summary.currentBalance)}
              </p>
              <p className="text-[10px] mt-0.5 font-bold text-gray-500">
                {ledgerData.summary.currentBalance > 0 ? '⚠️ Outstanding balance' : '✅ Nil / Fully Cleared'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-800 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('statement')}
              className={`pb-2.5 font-black text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'statement'
                  ? 'border-solar-600 text-solar-700 dark:text-solar-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Account Ledger Statement</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('equipment')}
              className={`pb-2.5 font-black text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'equipment'
                  ? 'border-solar-600 text-solar-700 dark:text-solar-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Solar Equipment Bought ({ledgerData.equipment?.length ?? 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`pb-2.5 font-black text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'invoices'
                  ? 'border-solar-600 text-solar-700 dark:text-solar-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Invoices & Payments ({ledgerData.summary.totalInvoices + ledgerData.summary.totalPayments})</span>
            </button>
          </div>

          {/* TAB 1: Ledger Statement (Ledger Table) */}
          {activeTab === 'statement' && (
            <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 dark:bg-slate-950 font-black text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 w-24">Date</th>
                      <th className="p-3 w-32">Ref / Doc #</th>
                      <th className="p-3">Particulars / Description</th>
                      <th className="p-3 w-32 text-right">Debit (Bill)</th>
                      <th className="p-3 w-32 text-right">Credit (Paid)</th>
                      <th className="p-3 w-32 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {ledgerData.ledger.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 font-bold">
                          No ledger transactions recorded for this customer yet.
                        </td>
                      </tr>
                    ) : (
                      ledgerData.ledger.map((entry: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40">
                          <td className="p-3 text-gray-600 dark:text-gray-400 font-semibold">
                            {formatDate(entry.date)}
                          </td>
                          <td className="p-3 font-bold text-gray-900 dark:text-white">
                            <span className="font-mono">{entry.ref_no}</span>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-gray-800 dark:text-gray-200">
                              {entry.description}
                            </div>
                            <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              entry.type === 'SALE_INVOICE'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}>
                              {entry.type === 'SALE_INVOICE' ? 'Equipment Sale' : 'Payment Received'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-gray-900 dark:text-white">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                            {entry.credit > 0 ? `+${formatCurrency(entry.credit)}` : '-'}
                          </td>
                          <td className="p-3 text-right font-black text-gray-900 dark:text-white">
                            {formatCurrency(entry.running_balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Solar Equipment Bought */}
          {activeTab === 'equipment' && (
            <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-slate-950 font-black text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">Solar Component / Equipment</th>
                    <th className="p-3 w-28 text-center">Invoice #</th>
                    <th className="p-3 w-20 text-center">Qty</th>
                    <th className="p-3 w-28 text-right">Unit Rate</th>
                    <th className="p-3 w-32 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {ledgerData.equipment.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 font-bold">
                        No equipment purchased yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerData.equipment.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                          {item.model_number && (
                            <p className="text-[10px] text-gray-400 font-mono">Model: {item.model_number}</p>
                          )}
                          {item.serials && item.serials.length > 0 && (
                            <p className="text-[10px] text-solar-600 font-bold">
                              S/N: {item.serials.join(', ')}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-gray-700 dark:text-gray-300">
                          {item.invoice_no}
                        </td>
                        <td className="p-3 text-center font-black">{item.quantity}</td>
                        <td className="p-3 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="p-3 text-right font-black text-solar-600 dark:text-solar-400">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Invoices & Payments */}
          {activeTab === 'invoices' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invoices */}
              <div>
                <h4 className="font-black text-xs text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-solar-600" />
                  <span>Sales Invoices ({ledgerData.sales?.length ?? 0})</span>
                </h4>
                <div className="border border-gray-200 dark:border-slate-800 rounded-2xl divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden max-h-64 overflow-y-auto">
                  {ledgerData.sales?.length === 0 ? (
                    <p className="p-4 text-center text-gray-400">No invoices generated yet</p>
                  ) : (
                    ledgerData.sales?.map((s: any) => (
                      <div key={s.id} className="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <div>
                          <span className="font-mono font-black text-gray-900 dark:text-white">{s.invoice_no}</span>
                          <p className="text-[10px] text-gray-400">{formatDate(s.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-black block text-gray-900 dark:text-white">{formatCurrency(s.grand_total)}</span>
                          <Badge variant={s.payment_status === 'PAID' ? 'success' : 'warning'}>
                            {s.payment_status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payments */}
              <div>
                <h4 className="font-black text-xs text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Payment Receipts ({ledgerData.payments?.length ?? 0})</span>
                </h4>
                <div className="border border-gray-200 dark:border-slate-800 rounded-2xl divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden max-h-64 overflow-y-auto">
                  {ledgerData.payments?.length === 0 ? (
                    <p className="p-4 text-center text-gray-400">No payment receipts found</p>
                  ) : (
                    ledgerData.payments?.map((p: any) => (
                      <div key={p.id} className="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <div>
                          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">{p.payment_no}</span>
                          <p className="text-[10px] text-gray-400">{formatDate(p.payment_date)} • {p.payment_method}</p>
                        </div>
                        <div className="text-right font-black text-emerald-600">
                          +{formatCurrency(p.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
};
