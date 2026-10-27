import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  DollarSign,
  Eye,
  Phone,
  MapPin,
  CheckCircle,
  FileText,
  Printer,
  Calendar,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Receipt,
  CheckCircle2,
  Package,
} from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Customer } from '../../types';
import { usePrinterStore } from '../../stores/printerStore';
import { PaymentMethodSelect } from '../../components/ui/PaymentMethodSelect';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedLedger, setSelectedLedger] = useState<any>(null);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [activeLedgerTab, setActiveLedgerTab] = useState<'statement' | 'equipment' | 'invoices'>('statement');
  const { triggerPrint } = usePrinterStore();

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [customerType, setCustomerType] = useState<'INDIVIDUAL' | 'COMMERCIAL'>('INDIVIDUAL');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Lahore');
  const [creditLimit, setCreditLimit] = useState(500000);

  // Payment Form
  const [payAmount, setPayAmount] = useState<number>(50000);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers');
      if (res.data?.success) setCustomers(res.data.data);
    } catch (e) {
      console.error('Failed to load customers', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/customers', {
        name,
        phone,
        customer_type: customerType,
        cnic,
        address,
        city,
        credit_limit: creditLimit,
      });

      if (res.data?.success) {
        setShowAddModal(false);
        loadCustomers();
        setName('');
        setPhone('');
        setAddress('');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add customer');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      const res = await api.post(`/customers/${selectedCustomer.id}/payments`, {
        amount: payAmount,
        payment_method: paymentMethod,
        transaction_ref: paymentRef,
      });

      if (res.data?.success) {
        alert(res.data.message || 'Payment received successfully');
        setShowPaymentModal(false);
        loadCustomers();
        if (selectedCustomer) {
          handleOpenCustomerLedger(selectedCustomer);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record payment');
    }
  };

  const handleOpenCustomerLedger = async (cust: Customer) => {
    setIsLoadingLedger(true);
    setShowDetailModal(true);
    setSelectedCustomer(cust);
    try {
      const res = await api.get(`/customers/${cust.id}/ledger`);
      if (res.data?.success) {
        setSelectedLedger(res.data.data);
        setSelectedCustomer(res.data.data.customer);
      }
    } catch (e) {
      console.error('Failed to load customer ledger', e);
    } finally {
      setIsLoadingLedger(false);
    }
  };

  const handlePrintCustomerLedger = () => {
    if (!selectedLedger) return;
    const { customer, summary, ledger } = selectedLedger;
    triggerPrint({
      docType: 'customer_ledger',
      docNumber: `LDG-${customer.customer_no}`,
      date: new Date().toLocaleDateString(),
      customerName: customer.name,
      customerPhone: customer.phone,
      customerCity: customer.city,
      customerAddress: customer.address,
      items: [],
      subtotal: summary.totalPurchased,
      grandTotal: summary.totalPurchased,
      paidAmount: summary.totalPaid,
      balanceDue: summary.currentBalance,
      notes: `Customer Since: ${formatDate(summary.firstPurchaseDate)} • Invoices: ${summary.totalInvoices} • Receipts: ${summary.totalPayments}`,
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

  const columns: Column<Customer>[] = [
    {
      key: 'customer_no',
      header: 'ID',
      render: (c) => <span className="font-bold">{c.customer_no}</span>,
    },
    {
      key: 'name',
      header: 'Customer Details',
      sortable: true,
      render: (c) => (
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
          <p className="text-[10px] text-gray-400">
            {c.phone} • {c.city || 'Pakistan'}
          </p>
        </div>
      ),
    },
    {
      key: 'customer_type',
      header: 'Type',
      render: (c) => (
        <Badge variant={c.customer_type === 'COMMERCIAL' ? 'dealer' : 'default'}>
          {c.customer_type}
        </Badge>
      ),
    },
    {
      key: 'outstanding_balance',
      header: 'Outstanding Balance',
      sortable: true,
      render: (c) => {
        const bal = c.outstanding_balance || 0;
        return (
          <span className={`font-black ${bal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {formatCurrency(bal)}
          </span>
        );
      },
    },
    {
      key: 'sales_count',
      header: 'Projects / Invoices',
      render: (c) => <span className="font-semibold">{c._count?.sales ?? 0} Invoices</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenCustomerLedger(c)}
            className="px-3 py-1.5 bg-solar-600 hover:bg-solar-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
            title="View Customer Account Ledger"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Customer Ledger</span>
          </button>
          {c.outstanding_balance > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedCustomer(c);
                setPayAmount(c.outstanding_balance);
                setShowPaymentModal(true);
              }}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
              title="Record Payment Receipt"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Collect Due</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Customers
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      <DataTable
        data={customers}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search customer name, phone, CNIC, ID..."
        searchField={(c) => `${c.name} ${c.phone} ${c.customer_no} ${c.cnic || ''}`}
        emptyTitle="No customers in database"
        emptyMessage="Add your first customer to track sales invoices, project warranties, and balances."
        emptyAction={{
          label: '+ Add Customer',
          onClick: () => setShowAddModal(true),
          icon: <Plus className="w-3.5 h-3.5" />,
        }}
      />

      {/* Add Customer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Customer"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Customer Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Shahzad Rasheed / Al-Madina Mills"
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Customer Type</label>
              <select
                value={customerType}
                onChange={(e: any) => setCustomerType(e.target.value)}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl"
              >
                <option value="INDIVIDUAL">Individual (Home)</option>
                <option value="COMMERCIAL">Commercial / Factory</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">CNIC / Tax NTN</label>
              <input
                type="text"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                placeholder="35202-xxxxxxx-x"
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Site / Billing Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Plot/House #, Street, Sector, Area..."
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold text-xs rounded-xl shadow-md mt-2"
          >
            Create Customer Profile
          </button>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Customer Payment Receipt"
        maxWidth="sm"
      >
        {selectedCustomer && (
          <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
            <div className="p-3 bg-solar-50 dark:bg-solar-950/50 rounded-xl border border-solar-200 dark:border-solar-800">
              <p className="font-bold text-solar-900 dark:text-solar-300">{selectedCustomer.name}</p>
              <p className="text-gray-500">
                Outstanding Balance: <b>{formatCurrency(selectedCustomer.outstanding_balance)}</b>
              </p>
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Amount Received (Rs.) *</label>
              <input
                type="number"
                min="1"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl font-bold text-solar-600 text-sm"
              />
            </div>

            <PaymentMethodSelect
              label="Payment Mode"
              value={paymentMethod}
              onChange={(val) => setPaymentMethod(val)}
            />

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Bank Reference / Cheque #</label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. HBL-FT-998231"
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md mt-2"
            >
              Confirm Receipt & Update Ledger
            </button>
          </form>
        )}
      </Modal>

      {/* Customer Complete Khata & Dynamic Ledger Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedLedger(null);
        }}
        title="Customer Account Ledger Statement"
        maxWidth="4xl"
      >
        {isLoadingLedger ? (
          <div className="py-16 text-center text-gray-500 space-y-2">
            <div className="w-8 h-8 border-4 border-solar-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-bold text-xs text-gray-700 dark:text-gray-300">Loading Customer Ledger...</p>
          </div>
        ) : selectedLedger ? (
          <div className="space-y-5 text-xs">
            {/* Top Customer Info Bar with Action Buttons */}
            <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg text-gray-900 dark:text-white">
                    {selectedLedger.customer.name}
                  </h3>
                  <Badge variant={selectedLedger.customer.customer_type === 'COMMERCIAL' ? 'dealer' : 'default'}>
                    {selectedLedger.customer.customer_type}
                  </Badge>
                  <span className="text-[11px] font-bold text-gray-500">
                    ID: {selectedLedger.customer.customer_no}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-gray-600 dark:text-gray-400 text-xs">
                  <span className="flex items-center gap-1 font-bold text-gray-800 dark:text-gray-200">
                    <Phone className="w-3.5 h-3.5 text-solar-600" />
                    {selectedLedger.customer.phone}
                  </span>
                  {selectedLedger.customer.cnic && (
                    <span>• CNIC: {selectedLedger.customer.cnic}</span>
                  )}
                  {selectedLedger.customer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {selectedLedger.customer.address}, {selectedLedger.customer.city}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPayAmount(selectedLedger.summary.currentBalance > 0 ? selectedLedger.summary.currentBalance : 10000);
                    setShowPaymentModal(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Receive Payment</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintCustomerLedger}
                  className="px-3.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-gray-100 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  title="Print Official Customer Account Statement"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Ledger Statement</span>
                </button>
              </div>
            </div>

            {/* 4 Core Summary KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Customer Since / 1st Purchase Date */}
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/60">
                <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Customer Since (1st Purchase)
                </span>
                <p className="text-base font-black text-blue-950 dark:text-blue-100 mt-1">
                  {formatDate(selectedLedger.summary.firstPurchaseDate)}
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
                  {formatCurrency(selectedLedger.summary.totalPurchased)}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">
                  {selectedLedger.summary.totalInvoices} Invoices billed
                </p>
              </div>

              {/* 3. Total Paid Amount */}
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
                <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Total Payments Received
                </span>
                <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-1">
                  {formatCurrency(selectedLedger.summary.totalPaid)}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">
                  {selectedLedger.summary.totalPayments} Payments received
                </p>
              </div>

              {/* 4. Current Balance Due */}
              <div className={`p-3.5 rounded-2xl border ${
                selectedLedger.summary.currentBalance > 0
                  ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                  : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
              }`}>
                <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${
                  selectedLedger.summary.currentBalance > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-400'
                }`}>
                  <Wallet className="w-3 h-3" />
                  Outstanding Balance Due
                </span>
                <p className={`text-base font-black mt-1 ${
                  selectedLedger.summary.currentBalance > 0 ? 'text-amber-900 dark:text-amber-200' : 'text-emerald-700 dark:text-emerald-300'
                }`}>
                  {formatCurrency(selectedLedger.summary.currentBalance)}
                </p>
                <p className="text-[10px] mt-0.5 font-bold text-gray-500">
                  {selectedLedger.summary.currentBalance > 0 ? '⚠️ Outstanding balance' : '✅ Nil / Fully Cleared'}
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-slate-800 gap-4">
              <button
                type="button"
                onClick={() => setActiveLedgerTab('statement')}
                className={`pb-2.5 font-black text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeLedgerTab === 'statement'
                    ? 'border-solar-600 text-solar-700 dark:text-solar-400'
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Account Ledger Statement</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLedgerTab('equipment')}
                className={`pb-2.5 font-black text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeLedgerTab === 'equipment'
                    ? 'border-solar-600 text-solar-700 dark:text-solar-400'
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Solar Equipment Bought ({selectedLedger.equipment?.length ?? 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLedgerTab('invoices')}
                className={`pb-2.5 font-black text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeLedgerTab === 'invoices'
                    ? 'border-solar-600 text-solar-700 dark:text-solar-400'
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Invoices & Payments ({selectedLedger.summary.totalInvoices + selectedLedger.summary.totalPayments})</span>
              </button>
            </div>

            {/* TAB 1: Ledger Statement (Ledger Table) */}
            {activeLedgerTab === 'statement' && (
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
                      {selectedLedger.ledger.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-500 font-bold">
                            No ledger transactions recorded for this customer yet.
                          </td>
                        </tr>
                      ) : (
                        selectedLedger.ledger.map((entry: any, idx: number) => (
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
            {activeLedgerTab === 'equipment' && (
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
                    {selectedLedger.equipment.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 font-bold">
                          No equipment purchased yet.
                        </td>
                      </tr>
                    ) : (
                      selectedLedger.equipment.map((item: any, idx: number) => (
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
            {activeLedgerTab === 'invoices' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Invoices */}
                <div>
                  <h4 className="font-black text-xs text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-solar-600" />
                    <span>Sales Invoices ({selectedLedger.sales?.length ?? 0})</span>
                  </h4>
                  <div className="border border-gray-200 dark:border-slate-800 rounded-2xl divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden max-h-64 overflow-y-auto">
                    {selectedLedger.sales?.length === 0 ? (
                      <p className="p-4 text-center text-gray-400">No invoices generated yet</p>
                    ) : (
                      selectedLedger.sales?.map((s: any) => (
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
                    <span>Payment Receipts ({selectedLedger.payments?.length ?? 0})</span>
                  </h4>
                  <div className="border border-gray-200 dark:border-slate-800 rounded-2xl divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden max-h-64 overflow-y-auto">
                    {selectedLedger.payments?.length === 0 ? (
                      <p className="p-4 text-center text-gray-400">No payment receipts found</p>
                    ) : (
                      selectedLedger.payments?.map((p: any) => (
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
    </div>
  );
};