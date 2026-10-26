import React, { useEffect, useState, useMemo } from 'react';
import { Truck, Plus, CheckCircle, Package, Edit3, Trash2, Barcode, AlertTriangle, Sparkles } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Supplier, Purchase, Product, Warehouse, Category } from '../../types';
import { useAuthStore } from '../../stores/authStore';

export const SuppliersPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [isLoading, setIsLoading] = useState(true);

  // New PO Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [poCategoryFilter, setPoCategoryFilter] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // New Supplier Modal
  const [showAddSupModal, setShowAddSupModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Edit PO Modal (Admin Only)
  const [editingPO, setEditingPO] = useState<Purchase | null>(null);
  const [showEditPOModal, setShowEditPOModal] = useState(false);
  const [editPOPaid, setEditPOPaid] = useState<number>(0);
  const [editPOStatus, setEditPOStatus] = useState('PARTIAL');
  const [editPONotes, setEditPONotes] = useState('');

  // Delete PO Dialog (Admin Only)
  const [deletingPO, setDeletingPO] = useState<Purchase | null>(null);
  const [isDeletingPO, setIsDeletingPO] = useState(false);

  // Edit Supplier Modal (Admin Only)
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [showEditSupModal, setShowEditSupModal] = useState(false);
  const [editSupCompany, setEditSupCompany] = useState('');
  const [editSupContact, setEditSupContact] = useState('');
  const [editSupPhone, setEditSupPhone] = useState('');
  const [editSupEmail, setEditSupEmail] = useState('');
  const [editSupAddress, setEditSupAddress] = useState('');
  const [editSupNotes, setEditSupNotes] = useState('');

  // Delete Supplier Dialog (Admin Only)
  const [deletingSup, setDeletingSup] = useState<Supplier | null>(null);
  const [isDeletingSup, setIsDeletingSup] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [supRes, purRes, prodRes, whRes, catRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/purchases'),
        api.get('/products'),
        api.get('/inventory/warehouses'),
        api.get('/products/categories'),
      ]);

      if (supRes.data?.success) setSuppliers(supRes.data.data);
      if (purRes.data?.success) setPurchases(purRes.data.data);
      if (prodRes.data?.success) setProducts(prodRes.data.data);
      if (catRes.data?.success) setCategories(catRes.data.data);
      if (whRes.data?.success) {
        setWarehouses(whRes.data.data);
        if (whRes.data.data.length > 0 && !warehouseId) {
          setWarehouseId(whRes.data.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load supplier data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPOProducts = useMemo(() => {
    if (!poCategoryFilter) return products;
    return products.filter(
      (p) =>
        p.category_id === poCategoryFilter ||
        p.category?.id === poCategoryFilter ||
        p.category?.name === poCategoryFilter
    );
  }, [products, poCategoryFilter]);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return alert('Please select a supplier');
    if (items.length === 0) return alert('Please add at least one item to the purchase order');

    // Validation for serialized items
    const globalSerials = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.is_serialized) {
        const serials = it.serial_numbers || [];
        if (serials.length !== it.quantity) {
          alert(
            `Product "${it.name}" is serialized and requires exactly ${it.quantity} serial number(s).\nCurrently ${serials.length} serial(s) entered. Please ensure each unit has an individual serial number.`
          );
          return;
        }

        for (const sn of serials) {
          const upper = sn.toUpperCase();
          if (globalSerials.has(upper)) {
            alert(
              `Duplicate serial number "${sn}" detected in line items. Every serialized unit must have a unique serial number.`
            );
            return;
          }
          globalSerials.add(upper);
        }
      }
    }

    try {
      const res = await api.post('/purchases', {
        supplier_id: supplierId,
        warehouse_id: warehouseId,
        items: items.map((it) => ({
          product_id: it.product_id,
          variant_id: it.variant_id,
          quantity: it.quantity,
          unit_cost: it.unit_cost,
          serial_numbers: it.is_serialized ? it.serial_numbers : undefined,
        })),
        paid_amount: paidAmount,
      });

      if (res.data?.success) {
        const data = res.data.data;
        if (data?.skipped_duplicates && data.skipped_duplicates.length > 0) {
          alert(
            `Purchase Order saved into inventory!\n\n⚠️ Note: ${data.skipped_duplicates.length} serial number(s) were already registered in the system and were skipped:\n${data.skipped_duplicates.join(', ')}`
          );
        } else {
          alert(res.data.message || 'Purchase Order completed and stock added to inventory');
        }
        setShowPOModal(false);
        setItems([]);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create PO');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/suppliers', {
        company_name: newCompanyName,
        contact_person: newContactPerson,
        phone: newPhone,
        email: newEmail,
        address: newAddress,
        notes: newNotes,
      });
      if (res.data?.success) {
        setShowAddSupModal(false);
        setNewCompanyName('');
        setNewContactPerson('');
        setNewPhone('');
        setNewEmail('');
        setNewAddress('');
        setNewNotes('');
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create supplier');
    }
  };

  const handleOpenEditPO = (p: Purchase) => {
    setEditingPO(p);
    setEditPOPaid(p.paid_amount || 0);
    setEditPOStatus(p.payment_status || 'PARTIAL');
    setEditPONotes(p.notes || '');
    setShowEditPOModal(true);
  };

  const handleUpdatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;
    try {
      const res = await api.put(`/purchases/${editingPO.id}`, {
        paid_amount: editPOPaid,
        payment_status: editPOStatus,
        notes: editPONotes,
      });
      if (res.data?.success) {
        setShowEditPOModal(false);
        setEditingPO(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update purchase order');
    }
  };

  const handleConfirmDeletePO = async () => {
    if (!deletingPO) return;
    setIsDeletingPO(true);
    try {
      const res = await api.delete(`/purchases/${deletingPO.id}`);
      if (res.data?.success) {
        setDeletingPO(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete purchase order');
    } finally {
      setIsDeletingPO(false);
    }
  };

  const handleOpenEditSup = (s: Supplier) => {
    setEditingSup(s);
    setEditSupCompany(s.company_name);
    setEditSupContact(s.contact_person || '');
    setEditSupPhone(s.phone);
    setEditSupEmail(s.email || '');
    setEditSupAddress(s.address || '');
    setEditSupNotes(s.notes || '');
    setShowEditSupModal(true);
  };

  const handleUpdateSup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSup) return;
    try {
      const res = await api.put(`/suppliers/${editingSup.id}`, {
        company_name: editSupCompany,
        contact_person: editSupContact,
        phone: editSupPhone,
        email: editSupEmail,
        address: editSupAddress,
        notes: editSupNotes,
      });
      if (res.data?.success) {
        setShowEditSupModal(false);
        setEditingSup(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update supplier');
    }
  };

  const handleConfirmDeleteSup = async () => {
    if (!deletingSup) return;
    setIsDeletingSup(true);
    try {
      const res = await api.delete(`/suppliers/${deletingSup.id}`);
      if (res.data?.success) {
        setDeletingSup(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete supplier');
    } finally {
      setIsDeletingSup(false);
    }
  };

  const parseSerialsFromText = (text: string): string[] => {
    return text
      .split(/[\r\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const addItemToPO = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const isSerialized = Boolean(prod.is_serialized);
    setItems([
      ...items,
      {
        product_id: prod.id,
        variant_id: prod.variants?.[0]?.id || null,
        name: prod.name,
        is_serialized: isSerialized,
        quantity: isSerialized ? 1 : 10,
        unit_cost: prod.purchase_price,
        serial_numbers: [],
        serial_text: '',
      },
    ]);
  };

  const removeItemFromPO = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemSerials = (idx: number, text: string) => {
    const updated = [...items];
    const serials = parseSerialsFromText(text);
    updated[idx].serial_text = text;
    updated[idx].serial_numbers = serials;
    setItems(updated);
  };

  const handleGenerateSampleSerials = (idx: number) => {
    const it = items[idx];
    const prefix = it.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'SN';
    const randomBatch = Math.floor(1000 + Math.random() * 9000);
    const generated: string[] = [];
    for (let i = 1; i <= it.quantity; i++) {
      generated.push(`SN-${prefix}-${randomBatch}-${String(i).padStart(3, '0')}`);
    }
    const text = generated.join('\n');
    updateItemSerials(idx, text);
  };

  const poColumns: Column<Purchase>[] = [
    {
      key: 'po_no',
      header: 'PO #',
      sortable: true,
      render: (p) => <span className="font-bold text-gray-900 dark:text-white">{p.po_no}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (p) => (
        <div>
          <p className="font-bold">{p.supplier?.company_name}</p>
          <p className="text-[10px] text-gray-400">{p.supplier?.contact_person}</p>
        </div>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total Cost',
      sortable: true,
      render: (p) => <span className="font-bold">{formatCurrency(p.total_amount)}</span>,
    },
    {
      key: 'payment_status',
      header: 'Payment Status',
      render: (p) => (
        <Badge variant={p.payment_status === 'PAID' ? 'success' : 'warning'}>
          {p.payment_status}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (p) => (
        <Badge variant="default" className="gap-1 text-gray-900 dark:text-white font-bold">
          <CheckCircle className="w-3 h-3 text-gray-900 dark:text-white" />
          <span>Received Inward</span>
        </Badge>
      ),
    },
    {
      key: 'purchase_date',
      header: 'Date',
      sortable: true,
      render: (p) => formatDate(p.purchase_date),
    },
    ...(isAdmin
      ? ([
          {
            key: 'actions',
            header: 'Actions',
            render: (p: Purchase) => (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Edit Purchase (Admin Only)"
                  onClick={() => handleOpenEditPO(p)}
                  className="p-1.5 bg-solar-50 dark:bg-solar-950/50 hover:bg-solar-100 dark:hover:bg-solar-900/50 text-solar-600 dark:text-solar-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete Purchase (Admin Only)"
                  onClick={() => setDeletingPO(p)}
                  className="p-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ] as Column<Purchase>[])
      : []),
  ];

  const supColumns: Column<Supplier>[] = [
    {
      key: 'supplier_no',
      header: 'ID',
      render: (s) => <span className="font-bold">{s.supplier_no}</span>,
    },
    {
      key: 'company_name',
      header: 'Company & Contact',
      sortable: true,
      render: (s) => (
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{s.company_name}</p>
          <p className="text-[10px] text-gray-400">
            {s.contact_person} • {s.phone}
          </p>
        </div>
      ),
    },
    {
      key: 'total_purchased',
      header: 'Total Purchased',
      sortable: true,
      render: (s) => formatCurrency(s.total_purchased),
    },
    {
      key: 'outstanding_payable',
      header: 'Accounts Payable Due',
      sortable: true,
      render: (s) => {
        const bal = s.outstanding_payable || 0;
        return (
          <span className={`font-black ${bal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatCurrency(bal)}
          </span>
        );
      },
    },
    ...(isAdmin
      ? ([
          {
            key: 'actions',
            header: 'Actions',
            render: (s: Supplier) => (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Edit Supplier (Admin Only)"
                  onClick={() => handleOpenEditSup(s)}
                  className="p-1.5 bg-solar-50 dark:bg-solar-950/50 hover:bg-solar-100 dark:hover:bg-solar-900/50 text-solar-600 dark:text-solar-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete Supplier (Admin Only)"
                  onClick={() => setDeletingSup(s)}
                  className="p-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ] as Column<Supplier>[])
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Purchases & Suppliers
          </h2>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => (activeTab === 'purchases' ? setShowPOModal(true) : setShowAddSupModal(true))}
            className="px-4 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'purchases' ? '+ Record Purchase' : '+ Add Supplier'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto custom-scrollbar border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 ${
            activeTab === 'purchases'
              ? 'border-solar-600 text-solar-600'
              : 'border-transparent text-gray-500'
          }`}
        >
          Purchases & Stock Inward ({purchases.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 ${
            activeTab === 'suppliers'
              ? 'border-solar-600 text-solar-600'
              : 'border-transparent text-gray-500'
          }`}
        >
          Supplier Accounts ({suppliers.length})
        </button>
      </div>

      {activeTab === 'purchases' ? (
        <DataTable
          data={purchases}
          columns={poColumns}
          isLoading={isLoading}
          searchPlaceholder="Search PO #, supplier..."
          searchField={(p) => `${p.po_no} ${p.supplier?.company_name}`}
          emptyTitle="No purchases recorded yet"
          emptyMessage="Record incoming stock from manufacturers or local distributors."
          emptyAction={isAdmin ? {
            label: '+ Record Purchase',
            onClick: () => setShowPOModal(true),
            icon: <Plus className="w-3.5 h-3.5" />,
          } : undefined}
        />
      ) : (
        <DataTable
          data={suppliers}
          columns={supColumns}
          isLoading={isLoading}
          searchPlaceholder="Search supplier company, contact..."
          searchField={(s) => `${s.company_name} ${s.contact_person} ${s.phone}`}
          emptyTitle="No suppliers registered yet"
          emptyMessage="Add equipment distributors or importers to track orders and payables."
          emptyAction={isAdmin ? {
            label: '+ Add Supplier',
            onClick: () => setShowAddSupModal(true),
            icon: <Plus className="w-3.5 h-3.5" />,
          } : undefined}
        />
      )}

      {/* PO Creation Modal */}
      <Modal
        isOpen={showPOModal}
        onClose={() => setShowPOModal(false)}
        title="Create Purchase Order & Stock Inward"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Supplier *</label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name} (Payable: {formatCurrency(s.outstanding_payable)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 text-xs">Select Product to Inward</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
              <div className="sm:col-span-1">
                <select
                  value={poCategoryFilter}
                  onChange={(e) => setPoCategoryFilter(e.target.value)}
                  className="w-full p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                >
                  <option value="">-- All Categories ({categories.length}) --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <select
                  id="poProductSelect"
                  className="flex-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                >
                  {filteredPOProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Cost: {formatCurrency(p.purchase_price)} {p.is_serialized ? '★ Serialized' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const sel = (document.getElementById('poProductSelect') as HTMLSelectElement)?.value;
                    if (sel) addItemToPO(sel);
                  }}
                  className="px-4 py-2 bg-solar-600 hover:bg-solar-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer whitespace-nowrap"
                >
                  + Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-gray-400">
                <Package className="w-8 h-8 mx-auto mb-1 opacity-40" />
                <p className="font-semibold">No items added to this PO yet</p>
                <p className="text-[11px]">Select a product above and click "+ Add" to include it.</p>
              </div>
            ) : (
              items.map((it, idx) => {
                const serialCount = it.serial_numbers?.length || 0;
                const isExact = serialCount === it.quantity;
                const isDeficient = serialCount < it.quantity;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-2.5 transition-all"
                  >
                    {/* Item Title & Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-bold text-gray-900 dark:text-white truncate">{it.name}</span>
                        {it.is_serialized ? (
                          <Badge variant="info" className="gap-1 text-[10px] shrink-0">
                            <Barcode className="w-3 h-3" />
                            <span>Serialized Asset</span>
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-gray-400 shrink-0">Bulk Quantity</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItemFromPO(idx)}
                        title="Remove product line"
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quantity, Unit Cost, and Subtotal */}
                    <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={it.quantity}
                          onChange={(e) => {
                            const newQty = Math.max(1, Number(e.target.value));
                            const updated = [...items];
                            updated[idx].quantity = newQty;
                            setItems(updated);
                          }}
                          className="w-full mt-0.5 p-1 text-xs border border-gray-200 dark:border-slate-700 rounded-lg text-center font-bold bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Unit Cost (Rs.)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={it.unit_cost}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].unit_cost = Number(e.target.value);
                            setItems(updated);
                          }}
                          className="w-full mt-0.5 p-1 text-xs border border-gray-200 dark:border-slate-700 rounded-lg text-right font-bold bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Line Subtotal
                        </label>
                        <p className="mt-1 text-xs font-black text-gray-900 dark:text-white text-right truncate">
                          {formatCurrency(it.quantity * it.unit_cost)}
                        </p>
                      </div>
                    </div>

                    {/* Serial Numbers Input for Serialized Products */}
                    {it.is_serialized && (
                      <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Barcode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="font-bold text-gray-800 dark:text-gray-200">
                              Unit Serial Numbers
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isExact
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : isDeficient
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              {serialCount} of {it.quantity} entered {isExact ? '✓' : isDeficient ? `(${it.quantity - serialCount} needed)` : `(${serialCount - it.quantity} extra)`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleGenerateSampleSerials(idx)}
                              title="Auto-fill sample serial numbers for testing"
                              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Sample</span>
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={Math.min(5, Math.max(2, it.quantity))}
                          value={it.serial_text ?? ''}
                          onChange={(e) => updateItemSerials(idx, e.target.value)}
                          placeholder={`Enter or barcode-scan ${it.quantity} serial number(s) (one per line)\ne.g.\nSN-INV-8821\nSN-INV-8822`}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800/60 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />

                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Tip: Fast barcode scanners automatically enter serials line-by-line. Empty lines and commas are automatically trimmed.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-slate-900 rounded-xl font-bold text-xs">
            <span className="text-gray-600 dark:text-gray-400">PO Grand Total:</span>
            <span className="text-base font-black text-gray-900 dark:text-white">
              {formatCurrency(items.reduce((sum, it) => sum + (it.quantity * it.unit_cost || 0), 0))}
            </span>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Initial Payment to Supplier (Rs.)</label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl font-bold"
            />
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-800 dark:text-emerald-300">
            ⚡ Received items will immediately increment stock quantities and re-average unit costs in inventory.
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
          >
            Confirm PO & Inward Stock
          </button>
        </form>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={showAddSupModal}
        onClose={() => setShowAddSupModal(false)}
        title="Add New Supplier / Vendor"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Company Name *</label>
            <input
              type="text"
              required
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="e.g. Diwan International Solar Imports"
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Contact Person</label>
              <input
                type="text"
                value={newContactPerson}
                onChange={(e) => setNewContactPerson(e.target.value)}
                placeholder="e.g. Salman Diwan"
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Phone Number *</label>
              <input
                type="text"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+92 300 8887766"
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="sales@diwansolar.com"
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Supplier Business Address</label>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Plot 88, Port Qasim / Lahore Dry Port"
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Supplier Notes</label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Payment terms, bank coordinates, delivery timelines..."
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
          >
            Save Supplier Account
          </button>
        </form>
      </Modal>

      {/* Edit PO Modal (Admin Only) */}
      <Modal
        isOpen={showEditPOModal}
        onClose={() => {
          setShowEditPOModal(false);
          setEditingPO(null);
        }}
        title="Edit Purchase Order (Admin Only)"
        maxWidth="md"
      >
        <form onSubmit={handleUpdatePO} className="space-y-4 text-xs">
          <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">PO Number:</span>
              <span className="font-bold text-gray-900 dark:text-white">{editingPO?.po_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Supplier:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{editingPO?.supplier?.company_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total PO Cost:</span>
              <span className="font-bold text-solar-600">{formatCurrency(editingPO?.total_amount || 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Amount Paid (Rs.)</label>
              <input
                type="number"
                value={editPOPaid}
                onChange={(e) => setEditPOPaid(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Payment Status</label>
              <select
                value={editPOStatus}
                onChange={(e) => setEditPOStatus(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">PO Notes / Invoice Reference</label>
            <textarea
              rows={3}
              value={editPONotes}
              onChange={(e) => setEditPONotes(e.target.value)}
              placeholder="Invoice #, bank cheque details..."
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
          >
            Update Purchase Order
          </button>
        </form>
      </Modal>

      {/* Delete PO Confirmation (Admin Only) */}
      <ConfirmDialog
        isOpen={!!deletingPO}
        title="Delete Purchase Order"
        message="Are you sure you want to delete this purchase order? This will safely reverse the supplier's balance and clear associated stock inward records."
        variant="danger"
        confirmLabel="Yes, Delete PO"
        cancelLabel="Cancel"
        isLoading={isDeletingPO}
        onConfirm={handleConfirmDeletePO}
        onClose={() => setDeletingPO(null)}
        details={[
          { label: 'PO Number', value: deletingPO?.po_no || '' },
          { label: 'Supplier', value: deletingPO?.supplier?.company_name || '' },
          { label: 'Total Cost', value: formatCurrency(deletingPO?.total_amount || 0) },
          { label: 'Payment Status', value: deletingPO?.payment_status || '' },
        ]}
      />

      {/* Edit Supplier Modal (Admin Only) */}
      <Modal
        isOpen={showEditSupModal}
        onClose={() => {
          setShowEditSupModal(false);
          setEditingSup(null);
        }}
        title="Edit Supplier Account (Admin Only)"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateSup} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Company Name *</label>
            <input
              type="text"
              required
              value={editSupCompany}
              onChange={(e) => setEditSupCompany(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Contact Person</label>
              <input
                type="text"
                value={editSupContact}
                onChange={(e) => setEditSupContact(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Phone Number *</label>
              <input
                type="text"
                required
                value={editSupPhone}
                onChange={(e) => setEditSupPhone(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
            <input
              type="email"
              value={editSupEmail}
              onChange={(e) => setEditSupEmail(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Business Address</label>
            <input
              type="text"
              value={editSupAddress}
              onChange={(e) => setEditSupAddress(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Supplier Notes</label>
            <textarea
              rows={2}
              value={editSupNotes}
              onChange={(e) => setEditSupNotes(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
          >
            Update Supplier Details
          </button>
        </form>
      </Modal>

      {/* Delete Supplier Confirmation (Admin Only) */}
      <ConfirmDialog
        isOpen={!!deletingSup}
        title="Delete Supplier Account"
        message="Are you sure you want to delete this supplier account? Suppliers with active purchase order history must have their purchase orders settled or removed first."
        variant="danger"
        confirmLabel="Yes, Delete Supplier"
        cancelLabel="Cancel"
        isLoading={isDeletingSup}
        onConfirm={handleConfirmDeleteSup}
        onClose={() => setDeletingSup(null)}
        details={[
          { label: 'Supplier ID', value: deletingSup?.supplier_no || '' },
          { label: 'Company Name', value: deletingSup?.company_name || '' },
          { label: 'Contact Person', value: deletingSup?.contact_person || 'N/A' },
          { label: 'Outstanding Payable', value: formatCurrency(deletingSup?.outstanding_payable || 0) },
        ]}
      />
    </div>
  );
};