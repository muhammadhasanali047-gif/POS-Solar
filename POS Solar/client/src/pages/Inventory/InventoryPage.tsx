import React, { useEffect, useState, useMemo } from 'react';
import { Layers, Plus, ArrowUpRight, ArrowDownLeft, AlertTriangle, RefreshCw, ArrowRightLeft, CheckCircle, Edit3, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { InventoryItem, Warehouse, Product, Category } from '../../types';
import { useAuthStore } from '../../stores/authStore';

export const InventoryPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'balances' | 'transactions'>('balances');
  const [isLoading, setIsLoading] = useState(true);

  // Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [adjustCategoryId, setAdjustCategoryId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustType, setAdjustType] = useState('PURCHASE_IN');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [reason, setReason] = useState('');

  // Admin Stock Edit & Delete
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [showEditStockModal, setShowEditStockModal] = useState(false);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editAvgCost, setEditAvgCost] = useState<number>(0);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const [deletingInventory, setDeletingInventory] = useState<InventoryItem | null>(null);
  const [isDeletingStock, setIsDeletingStock] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invRes, whRes, pRes, txnRes, catRes] = await Promise.all([
        api.get('/inventory/stock'),
        api.get('/inventory/warehouses'),
        api.get('/products'),
        api.get('/inventory/transactions'),
        api.get('/products/categories'),
      ]);

      if (invRes.data?.success) setInventories(invRes.data.data);
      if (whRes.data?.success) {
        setWarehouses(whRes.data.data);
        if (whRes.data.data.length > 0 && !selectedWarehouseId) {
          setSelectedWarehouseId(whRes.data.data[0].id);
        }
      }
      if (pRes.data?.success) setProducts(pRes.data.data);
      if (txnRes.data?.success) setTransactions(txnRes.data.data);
      if (catRes.data?.success) setCategories(catRes.data.data);
    } catch (e) {
      console.error('Failed to load inventory', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetWhId = selectedWarehouseId || warehouses[0]?.id;
    if (!targetWhId) {
      alert('No warehouse location found in system.');
      return;
    }
    if (!selectedProductId) {
      alert('Please select a product.');
      return;
    }
    try {
      const res = await api.post('/inventory/adjust', {
        warehouse_id: targetWhId,
        product_id: selectedProductId,
        type: adjustType,
        quantity,
        unit_cost: unitCost,
        reason,
      });

      if (res.data?.success) {
        setShowAdjustModal(false);
        setSelectedProductId('');
        setAdjustCategoryId('');
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Stock adjustment failed');
    }
  };

  const handleOpenEditStock = (i: InventoryItem) => {
    setEditingInventory(i);
    setEditQuantity(i.quantity);
    setEditAvgCost(i.avg_cost);
    setShowEditStockModal(true);
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInventory) return;
    setIsUpdatingStock(true);
    try {
      const res = await api.put(`/inventory/stock/${editingInventory.id}`, {
        quantity: editQuantity,
        avg_cost: editAvgCost,
      });
      if (res.data?.success) {
        setShowEditStockModal(false);
        setEditingInventory(null);
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update stock balance');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const handleConfirmDeleteStock = async () => {
    if (!deletingInventory) return;
    setIsDeletingStock(true);
    try {
      const res = await api.delete(`/inventory/stock/${deletingInventory.id}`);
      if (res.data?.success) {
        setDeletingInventory(null);
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete stock balance');
    } finally {
      setIsDeletingStock(false);
    }
  };

  const filteredAdjustProducts = useMemo(() => {
    if (!adjustCategoryId) return products;
    return products.filter(
      (p) =>
        p.category_id === adjustCategoryId ||
        p.category?.id === adjustCategoryId ||
        p.category?.name === adjustCategoryId
    );
  }, [products, adjustCategoryId]);

  const stockColumns: Column<InventoryItem>[] = [
    {
      key: 'product',
      header: 'Product & Model',
      sortable: true,
      render: (i) => (
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{i.product.name}</p>
          <p className="text-[10px] text-gray-400">
            Brand: {i.product.brand?.name} • SKU: {i.variant?.sku || i.product.model_number || 'N/A'}
          </p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Stock Quantity',
      sortable: true,
      render: (i) => {
        const isLow = i.quantity <= (i.product.min_stock_alert || 5);
        return (
          <span className={`font-black text-sm ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>
            {i.quantity} units {isLow && '⚠️'}
          </span>
        );
      },
    },
    {
      key: 'avg_cost',
      header: 'Average Cost',
      sortable: true,
      render: (i) => formatCurrency(i.avg_cost),
    },
    {
      key: 'total_value',
      header: 'Total Valuation',
      sortable: true,
      render: (i) => (
        <span className="font-bold text-gray-900 dark:text-white">
          {formatCurrency(i.total_value)}
        </span>
      ),
    },
    ...(isAdmin
      ? ([
          {
            key: 'actions',
            header: 'Actions',
            render: (i: InventoryItem) => (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Edit Stock Balance (Admin Only)"
                  onClick={() => handleOpenEditStock(i)}
                  className="p-1.5 bg-solar-50 dark:bg-solar-950/50 hover:bg-solar-100 dark:hover:bg-solar-900/50 text-solar-600 dark:text-solar-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete Stock Record (Admin Only)"
                  onClick={() => setDeletingInventory(i)}
                  className="p-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ] as Column<InventoryItem>[])
      : []),
  ];

  const txnColumns: Column<any>[] = [
    {
      key: 'transaction_no',
      header: 'Transaction #',
      render: (t) => <span className="font-bold text-gray-900 dark:text-white">{t.transaction_no}</span>,
    },
    {
      key: 'type',
      header: 'Movement Type',
      render: (t) => {
        const isPositive = ['PURCHASE_IN', 'RETURN_IN', 'ADJUSTMENT_ADD'].includes(t.type);
        return (
          <Badge variant={isPositive ? 'success' : 'danger'} className="gap-1">
            {isPositive ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
            <span>{t.type.replace('_', ' ')}</span>
          </Badge>
        );
      },
    },
    {
      key: 'product_name',
      header: 'Product',
      render: (t) => <span className="font-semibold">{t.product_name}</span>,
    },
    {
      key: 'quantity',
      header: 'Qty Changed',
      render: (t) => <span className="font-bold">{t.quantity}</span>,
    },
    {
      key: 'balance',
      header: 'Balance Change',
      render: (t) => (
        <span className="text-[11px] text-gray-500">
          {t.before_qty} → <b>{t.after_qty}</b>
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (t) => formatDate(t.created_at),
    },
  ];


  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Inventory & Stock Control
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdjustModal(true)}
            className="px-4 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Adjust / Inward Stock</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex overflow-x-auto custom-scrollbar border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'balances'
              ? 'border-solar-600 text-solar-600 dark:text-solar-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Current Stock Balances
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'transactions'
              ? 'border-solar-600 text-solar-600 dark:text-solar-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Stock Movement Log ({transactions.length})
        </button>
      </div>

      {activeTab === 'balances' ? (
        <DataTable
          data={inventories}
          columns={stockColumns}
          isLoading={isLoading}
          searchPlaceholder="Search inventory by product, brand, category..."
          searchField={(i) => `${i.product.name} ${i.product.brand?.name} ${i.product.category?.name}`}
        />
      ) : (
        <DataTable
          data={transactions}
          columns={txnColumns}
          isLoading={isLoading}
          searchPlaceholder="Search movement logs..."
          searchField={(t) => `${t.transaction_no} ${t.product_name} ${t.type}`}
        />
      )}

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Manual Stock Inward / Adjustment"
        maxWidth="md"
      >
        <form onSubmit={handleAdjustStock} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Category Filter</label>
              <select
                value={adjustCategoryId}
                onChange={(e) => {
                  const catVal = e.target.value;
                  setAdjustCategoryId(catVal);
                  if (catVal) {
                    const currP = products.find((pr) => pr.id === selectedProductId);
                    if (currP && currP.category_id !== catVal && currP.category?.id !== catVal && currP.category?.name !== catVal) {
                      setSelectedProductId('');
                    }
                  }
                }}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-medium"
              >
                <option value="">-- All Categories ({categories.length}) --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Product *</label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => {
                  const prodId = e.target.value;
                  setSelectedProductId(prodId);
                  const p = products.find((pr) => pr.id === prodId);
                  if (p) {
                    setUnitCost(p.purchase_price);
                    if (p.category_id || p.category?.id) {
                      setAdjustCategoryId(p.category_id || p.category?.id || '');
                    }
                  }
                }}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-medium"
              >
                <option value="">-- Choose Product ({filteredAdjustProducts.length}) --</option>
                {filteredAdjustProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.model_number || 'Standard'}) {p.brand?.name ? `• ${p.brand.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Operation Type</label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value)}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl font-medium"
              >
                <option value="PURCHASE_IN">➕ Purchase Inward</option>
                <option value="RETURN_IN">➕ Customer Return</option>
                <option value="ADJUSTMENT_ADD">➕ Audit Adjustment (+)</option>
                <option value="DAMAGE_OUT">➖ Damaged Stock Write-off</option>
                <option value="ADJUSTMENT_SUB">➖ Stock Deduction (-)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Unit Cost (Rs.)</label>
            <input
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value))}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Remarks / Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Shipment arrival container #44"
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold text-xs rounded-xl shadow-md mt-2"
          >
            Apply Stock Adjustment
          </button>
        </form>
      </Modal>

      {/* Edit Stock Balance Modal (Admin Only) */}
      <Modal
        isOpen={showEditStockModal}
        onClose={() => setShowEditStockModal(false)}
        title="Edit Inventory Stock Record (Admin Only)"
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateStock} className="space-y-3">
          <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl text-xs space-y-1">
            <p className="font-bold text-gray-900 dark:text-white">{editingInventory?.product.name}</p>
            <p className="text-gray-500">Category: {editingInventory?.product.category?.name || 'General'}</p>
            <p className="text-gray-500">Model: {editingInventory?.product.model_number || 'Standard'}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Current In-Stock Quantity *
            </label>
            <input
              type="number"
              min="0"
              required
              value={editQuantity}
              onChange={(e) => setEditQuantity(Number(e.target.value))}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Average Unit Cost (Rs.) *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={editAvgCost}
              onChange={(e) => setEditAvgCost(Number(e.target.value))}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingStock}
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold text-xs rounded-xl shadow-md mt-2 transition-colors cursor-pointer"
          >
            {isUpdatingStock ? 'Saving Changes...' : 'Update Stock Balance'}
          </button>
        </form>
      </Modal>

      {/* Delete Stock Balance Confirmation (Admin Only) */}
      <ConfirmDialog
        isOpen={!!deletingInventory}
        title="Delete Stock Balance Record"
        message="Are you sure you want to delete this inventory balance entry? This will permanently remove the record for this product."
        variant="danger"
        confirmLabel="Yes, Delete Record"
        cancelLabel="Cancel"
        isLoading={isDeletingStock}
        onConfirm={handleConfirmDeleteStock}
        onClose={() => setDeletingInventory(null)}
        details={[
          { label: 'Product Name', value: deletingInventory?.product.name || '' },
          { label: 'Model', value: deletingInventory?.product.model_number || 'Standard' },
          { label: 'Current Quantity', value: `${deletingInventory?.quantity || 0} units` },
          { label: 'Valuation', value: formatCurrency(deletingInventory?.total_value || 0) },
        ]}
      />
    </div>
  );
};