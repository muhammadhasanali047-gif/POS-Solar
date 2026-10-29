import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  ArrowRight,
  Printer,
  CheckCircle,
  Clock,
  Trash2,
  Package,
  UserPlus,
} from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Quotation, Customer, Product, SolarPackage } from '../../types';
import { CreatableSelect } from '../../components/ui/CreatableSelect';
import { PaymentMethodSelect } from '../../components/ui/PaymentMethodSelect';
import { usePrinterStore } from '../../stores/printerStore';

export const QuotationsPage: React.FC = () => {
  const { settings, triggerPrint } = usePrinterStore();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<SolarPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handlePrintQuotation = (q: Quotation) => {
    triggerPrint({
      docType: 'quotation',
      docNumber: q.quotation_no,
      date: new Date(q.created_at).toLocaleDateString(),
      customerName: q.customer?.name || 'Customer',
      customerPhone: q.customer?.phone,
      customerCity: q.customer?.city,
      items:
        q.items?.map((it) => ({
          name: it.description || 'Solar Equipment',
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
        })) || [],
      subtotal: q.subtotal,
      discount: q.discount,
      installationCharges: q.installation_charges,
      transportCharges: q.transport_charges,
      grandTotal: q.grand_total,
      paidAmount: 0,
      balanceDue: q.grand_total,
      notes: q.notes || 'Quotation proposal valid for 7 days.',
    });
  };

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Quick Customer Add Modal
  const [showQuickCustModal, setShowQuickCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCity, setNewCustCity] = useState('Multan');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCnic, setNewCustCnic] = useState('');
  const [isSavingCust, setIsSavingCust] = useState(false);

  // Quick Build Solar Package Modal
  const [showBuildPackageModal, setShowBuildPackageModal] = useState(false);
  const [buildPkgName, setBuildPkgName] = useState('');
  const [buildPkgCapacity, setBuildPkgCapacity] = useState<number>(5);
  const [buildPkgType, setBuildPkgType] = useState('HYBRID');
  const [buildPkgPrice, setBuildPkgPrice] = useState<number>(0);
  const [buildPkgDesc, setBuildPkgDesc] = useState('');
  const [isSavingPkg, setIsSavingPkg] = useState(false);

  const handleBuildAndApplyPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildPkgName.trim()) return alert('Package name is required');
    setIsSavingPkg(true);
    try {
      const res = await api.post('/packages', {
        name: buildPkgName.trim(),
        capacity_kw: buildPkgCapacity,
        package_type: buildPkgType,
        base_price: buildPkgPrice,
        description: buildPkgDesc,
      });

      if (res.data?.success) {
        const createdPkg = res.data.data;
        const pkgRes = await api.get('/packages');
        if (pkgRes.data?.success) setPackages(pkgRes.data.data);

        setPackageId(createdPkg.id);
        setCapacityKw(createdPkg.capacity_kw);
        setShowBuildPackageModal(false);
        setBuildPkgName('');
        setBuildPkgDesc('');
        setBuildPkgPrice(0);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to build package');
    } finally {
      setIsSavingPkg(false);
    }
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return alert('Please enter customer name');
    if (!newCustPhone.trim()) return alert('Please enter phone number');
    setIsSavingCust(true);
    try {
      const res = await api.post('/customers', {
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        city: newCustCity.trim() || 'Multan',
        address: newCustAddress.trim() || undefined,
        cnic: newCustCnic.trim() || undefined,
      });
      if (res.data?.success) {
        const createdCust = res.data.data;
        setCustomers((prev) => [createdCust, ...prev]);
        setCustomerId(createdCust.id);
        setShowQuickCustModal(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustCity('Multan');
        setNewCustAddress('');
        setNewCustCnic('');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create customer');
    } finally {
      setIsSavingCust(false);
    }
  };

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [capacityKw, setCapacityKw] = useState<number>(10);
  const [discount, setDiscount] = useState<number>(0);
  const [installationFee, setInstallationFee] = useState<number>(50000);
  const [transportFee, setTransportFee] = useState<number>(15000);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([]);

  // Conversion Form
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [qRes, cRes, pRes, pkgRes] = await Promise.all([
        api.get('/quotations'),
        api.get('/customers'),
        api.get('/products'),
        api.get('/packages'),
      ]);

      if (qRes.data?.success) setQuotations(qRes.data.data);
      if (cRes.data?.success) setCustomers(cRes.data.data);
      if (pRes.data?.success) setProducts(pRes.data.data);
      if (pkgRes.data?.success) setPackages(pkgRes.data.data);
    } catch (e) {
      console.error('Failed to load quotations', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPackage = (pkgId: string) => {
    setPackageId(pkgId);
    const found = packages.find((p) => p.id === pkgId);
    if (found && found.items) {
      setCapacityKw(found.capacity_kw);
      const mappedItems = found.items.map((it) => {
        const prod = it.product;
        const price = it.variant?.sale_price || prod?.sale_price || 0;
        return {
          product_id: it.product_id,
          variant_id: it.variant_id,
          description: prod ? `${prod.name} (${it.default_quantity}x)` : 'Component',
          quantity: it.default_quantity,
          unit_price: price,
          total_price: it.default_quantity * price,
        };
      });
      setItems(mappedItems);
    }
  };

  const addItemRow = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const price = prod.sale_price || 0;
    setItems([
      ...items,
      {
        product_id: prod.id,
        variant_id: prod.variants?.[0]?.id || null,
        description: prod.name,
        quantity: 1,
        unit_price: price,
        total_price: price,
      },
    ]);
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return alert('Select a customer');
    if (items.length === 0) return alert('Add at least one item');

    try {
      const res = await api.post('/quotations', {
        customer_id: customerId,
        package_id: packageId || null,
        system_capacity_kw: capacityKw,
        items,
        discount,
        installation_charges: installationFee,
        transport_charges: transportFee,
        notes,
      });

      if (res.data?.success) {
        const createdQ = res.data.data;
        if (settings.autoPrintOnSave) {
          handlePrintQuotation(createdQ);
        }
        setShowCreateModal(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create quotation');
    }
  };

  const handleConvertToSale = async () => {
    if (!selectedQuotation) return;

    try {
      const res = await api.post(`/quotations/${selectedQuotation.id}/convert-to-sale`, {
        paid_amount: paidAmount,
        payment_method: paymentMethod,
      });

      if (res.data?.success) {
        alert(`Quotation ${selectedQuotation.quotation_no} successfully converted to Sale Invoice!`);
        setShowConvertModal(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Conversion failed');
    }
  };

  const columns: Column<Quotation>[] = [
    {
      key: 'quotation_no',
      header: 'Quotation #',
      sortable: true,
      render: (q) => <span className="font-bold text-gray-900 dark:text-white">{q.quotation_no}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (q) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{q.customer?.name}</p>
          <p className="text-[10px] text-gray-400">{q.customer?.phone}</p>
        </div>
      ),
    },
    {
      key: 'system_capacity_kw',
      header: 'Capacity',
      render: (q) => <span className="font-bold">{q.system_capacity_kw ? `${q.system_capacity_kw} kW` : 'Custom'}</span>,
    },
    {
      key: 'grand_total',
      header: 'Grand Total',
      sortable: true,
      render: (q) => <span className="font-bold text-solar-600 dark:text-solar-400">{formatCurrency(q.grand_total)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (q) => {
        const variants: any = {
          DRAFT: 'default',
          SENT: 'info',
          APPROVED: 'success',
          CONVERTED_TO_SALE: 'dealer',
          REJECTED: 'danger',
        };
        return <Badge variant={variants[q.status] || 'default'}>{q.status.replace('_', ' ')}</Badge>;
      },
    },
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      render: (q) => formatDate(q.created_at),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (q) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handlePrintQuotation(q)}
            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
            title="Print Quotation"
          >
            <Printer className="w-3 h-3 text-solar-600" />
            <span>Print</span>
          </button>
          {q.status !== 'CONVERTED_TO_SALE' ? (
            <button
              onClick={() => {
                setSelectedQuotation(q);
                setPaidAmount(q.grand_total * 0.5); // 50% deposit default
                setShowConvertModal(true);
              }}
              className="px-2.5 py-1 bg-solar-600 hover:bg-solar-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span>Convert to Sale</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Converted</span>
            </span>
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
            Quotations
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setItems([]);
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Quotation</span>
        </button>
      </div>

      <DataTable
        data={quotations}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search quotation number, customer name, notes..."
        searchField={(q) => `${q.quotation_no} ${q.customer?.name} ${q.notes || ''}`}
        emptyTitle="No quotations created yet"
        emptyMessage="Generate your first customer quotation for solar packages or equipment."
        emptyAction={{
          label: '+ New Quotation',
          onClick: () => {
            setItems([]);
            setShowCreateModal(true);
          },
          icon: <Plus className="w-3.5 h-3.5" />,
        }}
      />

      {/* Create Quotation Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Solar Proposal / Quotation"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateQuotation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <CreatableSelect
                label="Select Customer"
                required
                value={customerId}
                onChange={(val) => setCustomerId(val)}
                options={customers.map((c) => ({
                  id: c.id,
                  name: `${c.name} (${c.phone})`,
                  subtitle: c.city ? `City: ${c.city}` : undefined,
                }))}
                placeholder="-- Choose or Type Customer --"
                actionButton={
                  <button
                    type="button"
                    onClick={() => setShowQuickCustModal(true)}
                    className="text-xs font-bold text-solar-600 hover:text-solar-700 dark:text-solar-400 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Add new customer / person"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Add New Person</span>
                  </button>
                }
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Load Solar Package Template
                </label>
                <button
                  type="button"
                  onClick={() => setShowBuildPackageModal(true)}
                  className="text-xs font-bold text-solar-600 hover:text-solar-700 dark:text-solar-400 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Build new solar package"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Build Package</span>
                </button>
              </div>
              <select
                value={packageId}
                onChange={(e) => {
                  if (e.target.value === '__build_new__') {
                    setShowBuildPackageModal(true);
                    return;
                  }
                  handleSelectPackage(e.target.value);
                }}
                className="w-full p-2.5 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-medium text-solar-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">-- Custom Component Build --</option>
                <option value="__build_new__" className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950">
                  ➕ + Build & Add New Package Template...
                </option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    ⚡ {pkg.name} ({pkg.capacity_kw} kW) — {formatCurrency(pkg.base_price)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Product Adder */}
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Add Components</label>
            <div className="flex gap-2 mt-1">
              <select
                id="componentPicker"
                className="flex-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.sale_price)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const sel = (document.getElementById('componentPicker') as HTMLSelectElement)?.value;
                  if (sel) addItemRow(sel);
                }}
                className="px-3 py-2 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-xl hover:bg-gray-200"
              >
                + Add Item
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-bold text-[10px] uppercase">
                <tr>
                  <th className="p-2 font-bold text-gray-900 dark:text-white">Item Description</th>
                  <th className="p-2 w-16 text-center font-bold text-gray-900 dark:text-white">Qty</th>
                  <th className="p-2 w-28 text-right font-bold text-gray-900 dark:text-white">Unit Price</th>
                  <th className="p-2 w-24 text-right font-bold text-gray-900 dark:text-white">Total</th>
                  <th className="p-2 w-8 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-400 text-xs">
                      No components added yet. Pick a package above or add products.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-2 font-bold text-gray-900 dark:text-white">{it.description}</td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => {
                            const newQty = Math.max(1, Number(e.target.value));
                            const updated = [...items];
                            updated[idx].quantity = newQty;
                            updated[idx].total_price = newQty * updated[idx].unit_price;
                            setItems(updated);
                          }}
                          className="w-14 p-1 border border-gray-300 dark:border-slate-700 rounded-lg text-xs text-center font-black text-gray-900 dark:text-white bg-white dark:bg-slate-900"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={it.unit_price}
                          onChange={(e) => {
                            const newPrice = Math.max(0, Number(e.target.value));
                            const updated = [...items];
                            updated[idx].unit_price = newPrice;
                            updated[idx].total_price = updated[idx].quantity * newPrice;
                            setItems(updated);
                          }}
                          className="w-24 p-1 border border-gray-300 dark:border-slate-700 rounded-lg text-xs text-right font-black text-gray-900 dark:text-white bg-white dark:bg-slate-900"
                        />
                      </td>
                      <td className="p-2 font-black text-right text-solar-600 dark:text-solar-400">
                        {formatCurrency(it.total_price)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Charges */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-gray-500">Installation Fee (Rs.)</label>
              <input
                type="number"
                value={installationFee}
                onChange={(e) => setInstallationFee(Number(e.target.value))}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">Transport (Rs.)</label>
              <input
                type="number"
                value={transportFee}
                onChange={(e) => setTransportFee(Number(e.target.value))}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">Discount (Rs.)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-solar-600 hover:bg-solar-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            Save Quotation
          </button>
        </form>
      </Modal>

      {/* Convert to Sale Modal */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        title="1-Click Convert Quotation to Sale Invoice"
        maxWidth="md"
      >
        {selectedQuotation && (
          <div className="space-y-4">
            <div className="p-3 bg-solar-50 dark:bg-solar-950/40 border border-solar-200 dark:border-solar-800 rounded-xl">
              <p className="text-xs font-bold text-solar-900 dark:text-solar-300">
                Converting Proposal #{selectedQuotation.quotation_no}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Client: <b>{selectedQuotation.customer?.name}</b> • Total:{' '}
                <b>{formatCurrency(selectedQuotation.grand_total)}</b>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Initial Deposit Received (Rs.)
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-solar-600"
                />
              </div>

              <PaymentMethodSelect
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(val)}
              />
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
              ⚡ This will automatically deduct components from inventory stock, register the sale invoice, and queue the installation job.
            </div>

            <button
              type="button"
              onClick={handleConvertToSale}
              className="w-full py-3 bg-solar-600 hover:bg-solar-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirm & Generate Invoice</span>
            </button>
          </div>
        )}
      </Modal>

      {/* Quick Customer / Person Add Modal */}
      <Modal
        isOpen={showQuickCustModal}
        onClose={() => setShowQuickCustModal(false)}
        title="Add New Customer / Person"
        maxWidth="md"
      >
        <form onSubmit={handleQuickAddCustomer} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-gray-900 dark:text-white block mb-1">
              Customer / Person Full Name *
            </label>
            <input
              type="text"
              required
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="e.g. Muhammad Bilal"
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-solar-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-900 dark:text-white block mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                placeholder="0300 1234567"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-solar-500"
              />
            </div>
            <div>
              <label className="font-bold text-gray-900 dark:text-white block mb-1">
                City
              </label>
              <input
                type="text"
                value={newCustCity}
                onChange={(e) => setNewCustCity(e.target.value)}
                placeholder="Multan"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-solar-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-900 dark:text-white block mb-1">
                CNIC / ID Card
              </label>
              <input
                type="text"
                value={newCustCnic}
                onChange={(e) => setNewCustCnic(e.target.value)}
                placeholder="35202-9876543-1"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-solar-500"
              />
            </div>
            <div>
              <label className="font-bold text-gray-900 dark:text-white block mb-1">
                Site / Delivery Address
              </label>
              <input
                type="text"
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                placeholder="Chowk Kumharan, Multan"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-solar-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowQuickCustModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingCust}
              className="px-5 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSavingCust ? 'Adding...' : 'Save & Select Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Build Solar Package Modal */}
      <Modal
        isOpen={showBuildPackageModal}
        onClose={() => setShowBuildPackageModal(false)}
        title="Build New Solar Package Template"
        maxWidth="md"
      >
        <form onSubmit={handleBuildAndApplyPackage} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-gray-900 dark:text-white block mb-1">
              Package System Name *
            </label>
            <input
              type="text"
              required
              value={buildPkgName}
              onChange={(e) => setBuildPkgName(e.target.value)}
              placeholder="e.g. 5kW Hybrid Standard Package (Longi + GoodWe)"
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-900 dark:text-white block mb-1">
                Capacity (kW) *
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={buildPkgCapacity}
                onChange={(e) => setBuildPkgCapacity(Number(e.target.value))}
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-900 dark:text-white block mb-1">
                System Architecture
              </label>
              <select
                value={buildPkgType}
                onChange={(e) => setBuildPkgType(e.target.value)}
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                <option value="ON_GRID">On-Grid (Net Metering)</option>
                <option value="HYBRID">Hybrid (Battery Backup)</option>
                <option value="OFF_GRID">Off-Grid (Standalone)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-900 dark:text-white block mb-1">
              Base / Package Estimate Price (Rs.)
            </label>
            <input
              type="number"
              value={buildPkgPrice}
              onChange={(e) => setBuildPkgPrice(Number(e.target.value))}
              placeholder="550000"
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-900 dark:text-white block mb-1">
              Description / Included Components
            </label>
            <textarea
              rows={2}
              value={buildPkgDesc}
              onChange={(e) => setBuildPkgDesc(e.target.value)}
              placeholder="e.g. 8x 585W Panels, 5kW Hybrid Inverter, AC/DC DB, L2 Structure, Pure Copper Cables"
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-medium"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowBuildPackageModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingPkg}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50"
            >
              {isSavingPkg ? 'Building...' : 'Save & Select into Quotation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};