import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  Printer,
  UserPlus,
  Barcode,
  Layers,
  Zap,
  ChevronDown,
} from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { useCartStore } from '../../stores/cartStore';
import { Product, Customer, Dealer, Warehouse, Category } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { usePrinterStore, PrintDocumentData } from '../../stores/printerStore';
import { useAuthStore } from '../../stores/authStore';
import { PrintableDocument } from '../../components/print/PrintableDocument';

const CATEGORY_ORDER = [
  'Accessories & Protection',
  'Batteries',
  'Cables & Wiring',
  'Inverters',
  'Mounting Structure',
  'Solar Panels',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Accessories & Protection': '🛡️',
  'Batteries': '🔋',
  'Cables & Wiring': '🔌',
  'Inverters': '⚡',
  'Mounting Structure': '🏗️',
  'Solar Panels': '☀️',
};

export const PosPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showConfirmSale, setShowConfirmSale] = useState(false);

  // Success / Invoice Print Modal
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Quick Customer Creation Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Mobile Catalog vs Cart Switcher
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  const cart = useCartStore();
  const { settings, triggerPrint } = usePrinterStore();
  const { user } = useAuthStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prodRes, custRes, dlrRes, whRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/customers'),
        api.get('/dealers'),
        api.get('/inventory/warehouses'),
        api.get('/products/categories'),
      ]);

      if (prodRes.data?.success) setProducts(prodRes.data.data);
      if (custRes.data?.success) setCustomers(custRes.data.data);
      if (dlrRes.data?.success) setDealers(dlrRes.data.data);
      if (catRes.data?.success) setCategories(catRes.data.data);
      if (whRes.data?.success) {
        setWarehouses(whRes.data.data);
        if (whRes.data.data.length > 0 && !cart.warehouse_id) {
          cart.setWarehouseId(whRes.data.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load POS data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a.name);
      const idxB = CATEGORY_ORDER.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      p.category?.name === selectedCategory ||
      p.category_id === selectedCategory ||
      p.category?.id === selectedCategory ||
      p.category?.slug === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedProducts = useMemo(() => {
    const list: { name: string; icon: string; items: Product[] }[] = [];

    sortedCategories.forEach((cat) => {
      const catItems = products.filter(
        (p) => p.category_id === cat.id || p.category?.id === cat.id || p.category?.name === cat.name
      );
      if (catItems.length > 0) {
        list.push({
          name: cat.name,
          icon: CATEGORY_ICONS[cat.name] || '📦',
          items: catItems,
        });
      }
    });

    const uncategorized = products.filter(
      (p) =>
        !sortedCategories.some(
          (c) => p.category_id === c.id || p.category?.id === c.id || p.category?.name === c.name
        )
    );
    if (uncategorized.length > 0) {
      list.push({
        name: 'Other Equipment',
        icon: '📦',
        items: uncategorized,
      });
    }

    return list;
  }, [sortedCategories, products]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/customers', {
        name: newCustName,
        phone: newCustPhone,
      });
      if (res.data?.success) {
        setCustomers([res.data.data, ...customers]);
        cart.setCustomerId(res.data.data.id);
        setShowCustomerModal(false);
        setNewCustName('');
        setNewCustPhone('');
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to create customer');
    }
  };

  const handleInitiateCheckout = () => {
    if (!cart.customer_id) {
      alert('Please select or add a customer before checkout.');
      return;
    }
    if (cart.items.length === 0) {
      alert('Cart is empty. Please select products to sell.');
      return;
    }
    setShowConfirmSale(true);
  };

  const executeCheckout = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        customer_id: cart.customer_id,
        dealer_id: cart.dealer_id || null,
        warehouse_id: cart.warehouse_id || null,
        system_capacity_kw: cart.system_capacity_kw || null,
        items: cart.items.map((it) => ({
          product_id: it.product.id,
          variant_id: it.variant?.id || null,
          quantity: it.quantity,
          unit_price: it.unit_price,
          serial_numbers: it.serial_numbers,
        })),
        discount: cart.discount,
        tax: cart.tax,
        installation_charges: cart.installation_charges,
        transport_charges: cart.transport_charges,
        paid_amount: cart.paid_amount || cart.getGrandTotal(),
        payment_method: cart.payment_method,
        notes: cart.notes,
      };

      const res = await api.post('/sales', payload);
      if (res.data?.success) {
        const saleData = res.data.data;
        setCompletedSale(saleData);
        setShowPrintModal(true);
        setShowConfirmSale(false);

        // Instant Auto-Print Document Preparation
        const cust = customers.find((c) => c.id === cart.customer_id);
        const subtotal = cart.getSubtotal();
        const taxRate = 18;
        const tax = Math.round(subtotal * 0.18);
        const taxedGrandTotal = Math.round(subtotal * 1.18) - (cart.discount || 0) + (cart.installation_charges || 0) + (cart.transport_charges || 0);

        const printDoc: PrintDocumentData = {
          docType: 'invoice',
          docNumber: saleData.invoice_no,
          date: new Date().toLocaleDateString(),
          customerName: cust?.name || 'Walk-in Customer',
          customerPhone: cust?.phone,
          customerCity: cust?.city,
          customerCnic: cust?.cnic || '35202-9876543-1',
          salespersonName: user?.full_name ? `${user.full_name} (Sales Desk)` : 'Engr. Usman Tariq (Sales Desk)',
          validityDays: 'Expired 2 Days',
          isDealLock: true,
          taxRate,
          untaxedAmount: subtotal,
          tax,
          taxedTotal: taxedGrandTotal,
          items: cart.items.map((it) => ({
            name: it.product.name,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total_price: it.quantity * it.unit_price,
            model: it.product.model_number,
            serials: it.serial_numbers,
            tax_rate: 18,
          })),
          subtotal,
          discount: cart.discount,
          installationCharges: cart.installation_charges,
          transportCharges: cart.transport_charges,
          grandTotal: cart.getGrandTotal(),
          paidAmount: cart.paid_amount || cart.getGrandTotal(),
          balanceDue: cart.getBalanceDue(),
          paymentMethod: cart.payment_method,
          notes: cart.notes,
        };

        if (settings.autoPrintOnSave) {
          triggerPrint(printDoc);
        }

        cart.resetCart();
        loadData(); // refresh stock
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Checkout failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProductCard = (prod: Product) => {
    const available = prod.availableStock ?? 0;
    const isOutOfStock = available <= 0;

    return (
      <div
        key={prod.id}
        onClick={() => !isOutOfStock && cart.addItem(prod, prod.variants?.[0])}
        className={`bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between ${
          isOutOfStock
            ? 'opacity-50 border-gray-200 dark:border-slate-800 cursor-not-allowed'
            : 'border-gray-200 dark:border-slate-800 hover:border-solar-500 dark:hover:border-solar-500 hover:shadow-md cursor-pointer active:scale-95'
        }`}
      >
        <div>
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider truncate">
              {prod.brand?.name || 'Solar'}
            </span>
            {prod.is_serialized && (
              <Badge variant="default" className="text-[8px] sm:text-[9px] py-0 px-1 font-bold text-gray-900 dark:text-white border-gray-300">
                Serial
              </Badge>
            )}
          </div>
          <h4 className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight">
            {prod.name}
          </h4>
          <p className="text-[10px] sm:text-[11px] font-bold text-gray-700 dark:text-gray-300 mt-0.5 truncate">
            {prod.model_number || 'Standard'}
          </p>
        </div>

        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-1">
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-black text-gray-900 dark:text-white block truncate">
              {formatCurrency(prod.sale_price)}
            </span>
            <p className="text-[10px] font-black text-gray-900 dark:text-white truncate">
              {available} in stock
            </p>
          </div>
          <button
            type="button"
            disabled={isOutOfStock}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gray-100 hover:bg-gray-900 text-gray-900 hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-gray-200 dark:border-slate-700"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Top Banner & Mobile Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Point of Sale (POS) & Billing
          </h2>
        </div>

        {/* Mobile View Switcher (Catalog vs Cart) */}
        <div className="flex items-center gap-1 lg:hidden bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'catalog'
                ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Catalog ({filteredProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'cart'
                ? 'bg-solar-600 text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span>Cart</span>
            {cart.items.length > 0 && (
              <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {cart.items.reduce((acc, it) => acc + it.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main POS Interface: Split Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* Left Side: Product Catalog & Search (7 Cols) */}
        <div className={`lg:col-span-7 space-y-2.5 sm:space-y-3 ${mobileTab === 'cart' ? 'hidden lg:block' : 'block'}`}>
          {/* Search Bar (Clean Full-Width without Warehouse badge) */}
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-gray-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search solar panels, inverters, batteries, model #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-solar-500 text-gray-900 dark:text-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills / Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-solar-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-solar-400'
              }`}
            >
              <span>All ({products.length})</span>
            </button>

            {sortedCategories.map((cat) => {
              const count = products.filter(
                (p) => p.category_id === cat.id || p.category?.id === cat.id || p.category?.name === cat.name
              ).length;
              const isSelected = selectedCategory === cat.name || selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? 'all' : cat.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-solar-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-solar-400'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Product Catalog Display: Category-Wise Distribution */}
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-1 custom-scrollbar">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xs">
                No matching products found in catalog.
              </div>
            ) : selectedCategory === 'all' && !searchTerm ? (
              /* Grouped Distribution by Category */
              <div className="space-y-4 sm:space-y-5">
                {groupedProducts.map((group) => (
                  <div key={group.name} className="space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/80 dark:border-slate-800">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span>{group.name}</span>
                        <span className="text-[11px] font-bold text-gray-900 dark:text-white">({group.items.length})</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(group.name)}
                        className="text-[11px] text-gray-900 dark:text-white hover:underline font-bold cursor-pointer"
                      >
                        View only {group.name} →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      {group.items.map((prod) => renderProductCard(prod))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Flat Grid for Filtered Category or Search Query */
              <div className="space-y-2.5">
                {selectedCategory !== 'all' && (
                  <div className="flex items-center justify-between pb-1 text-xs">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>{selectedCategory}</span>
                      <span className="text-gray-900 dark:text-white font-bold">({filteredProducts.length} items)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className="text-gray-900 dark:text-white hover:underline font-bold cursor-pointer text-[11px]"
                    >
                      Show All Categories
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  {filteredProducts.map((prod) => renderProductCard(prod))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Invoice Cart & Checkout (5 Cols) */}
        <div className={`lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-3 sm:p-4.5 flex flex-col justify-between shadow-sm ${mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="space-y-4">
            {/* Customer & Dealer Selectors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-gray-900 dark:text-white">Customer</label>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="text-xs text-gray-900 dark:text-white font-black flex items-center gap-1 hover:text-solar-600 dark:hover:text-solar-400 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-gray-900 dark:text-white" />
                  <span>+ Quick Add</span>
                </button>
              </div>
              <select
                value={cart.customer_id}
                onChange={(e) => cart.setCustomerId(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-solar-500 text-gray-900 dark:text-white font-bold"
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - Bal: {formatCurrency(c.outstanding_balance)}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            {cart.items.length > 0 && (
              <div className="border-t border-b border-gray-100 dark:border-slate-800 py-2.5 max-h-56 overflow-y-auto space-y-2 custom-scrollbar">
                {cart.items.map((item) => (
                  <div
                    key={`${item.product.id}-${item.variant?.id}`}
                    className="p-2.5 bg-gray-50 dark:bg-slate-950 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {item.product.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-500">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            cart.updateUnitPrice(item.product.id, item.variant?.id, isNaN(val) ? 0 : val);
                          }}
                          className="w-20 h-5 px-1 text-xs font-black text-gray-900 dark:text-white bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded focus:outline-none focus:border-solar-500"
                          title="Click to edit unit price"
                        />
                        <span className="text-[10px] text-gray-400">each</span>
                      </div>
                    </div>

                    {/* Qty Steppers */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => cart.updateQuantity(item.product.id, item.variant?.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-gray-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => cart.updateQuantity(item.product.id, item.variant?.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right min-w-[75px]">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>

                    <button
                      onClick={() => cart.removeItem(item.product.id, item.variant?.id)}
                      className="p-1 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Charges, Discounts, and Payment Method */}
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-black text-gray-900 dark:text-white block mb-1">Discount (Rs.)</label>
                  <input
                    type="number"
                    value={cart.discount || ''}
                    onChange={(e) => cart.setDiscount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-900 dark:placeholder:text-gray-200 focus:outline-none focus:border-solar-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-900 dark:text-white block mb-1">Payment Method</label>
                  <select
                    value={cart.payment_method}
                    onChange={(e: any) => cart.setPaymentMethod(e.target.value)}
                    className="w-full p-2 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-black text-gray-900 dark:text-white focus:outline-none focus:border-solar-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-900 dark:text-white block mb-1">Amount Paid Now (Rs.)</label>
                <input
                  type="number"
                  value={cart.paid_amount || ''}
                  onChange={(e) => cart.setPaidAmount(Number(e.target.value))}
                  placeholder={String(cart.getGrandTotal())}
                  className="w-full p-2 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-black text-gray-900 dark:text-white placeholder:text-gray-900 dark:placeholder:text-gray-200 focus:outline-none focus:border-solar-500"
                />
              </div>

              {/* Collapsible Accordion for Additional Options */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="w-full py-2 px-2.5 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white hover:text-solar-600 dark:hover:text-solar-400 hover:border-solar-500 text-xs font-black flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>{showMoreOptions ? '− Less Options' : '+ More Options (Dealer, Installation, Transport, Notes)'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-900 dark:text-white transition-transform duration-200 ${showMoreOptions ? 'rotate-180' : ''}`} />
                </button>

                {showMoreOptions && (
                  <div className="mt-2 p-2.5 bg-gray-50/80 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 rounded-xl space-y-2">
                    {/* Referred Dealer */}
                    <div>
                      <label className="text-xs font-black text-gray-900 dark:text-white block mb-1">Referred Dealer / Agent</label>
                      <select
                        value={cart.dealer_id || ''}
                        onChange={(e) => cart.setDealerId(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white"
                      >
                        <option value="">Direct Sale (No Dealer Commission)</option>
                        {dealers.map((d) => (
                          <option key={d.id} value={d.id}>
                            🤝 {d.name} ({d.commission_value}{d.commission_type === 'PERCENTAGE' ? '%' : ' Rs/kW'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Installation and Transport Fees */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-black text-gray-900 dark:text-white block mb-1">Installation Fee (Rs.)</label>
                        <input
                          type="number"
                          value={cart.installation_charges || ''}
                          onChange={(e) => cart.setInstallationCharges(Number(e.target.value))}
                          placeholder="0"
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-900 dark:text-white block mb-1">Transport Fee (Rs.)</label>
                        <input
                          type="number"
                          value={cart.transport_charges || ''}
                          onChange={(e) => cart.setTransportCharges(Number(e.target.value))}
                          placeholder="0"
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-900"
                        />
                      </div>
                    </div>

                    {/* System Capacity */}
                    <div>
                      <label className="text-xs font-black text-gray-900 dark:text-white block mb-1">System Capacity (kW)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={cart.system_capacity_kw || ''}
                        onChange={(e) => cart.setSystemCapacityKw(Number(e.target.value))}
                        placeholder="e.g. 10.5"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Order Notes */}
                    <div>
                      <label className="text-xs font-black text-gray-900 dark:text-white block mb-1">Order Notes / Delivery Remarks</label>
                      <textarea
                        rows={2}
                        value={cart.notes || ''}
                        onChange={(e) => cart.setNotes(e.target.value)}
                        placeholder="Warranty notes, site details, special terms..."
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Checkout Totals & Button */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-white">
              <span>Subtotal:</span>
              <span>{formatCurrency(cart.getSubtotal())}</span>
            </div>
            <div className="flex justify-between text-base font-black text-gray-900 dark:text-white">
              <span>Grand Total:</span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(cart.getGrandTotal())}
              </span>
            </div>
            {cart.getBalanceDue() > 0 && (
              <div className="flex justify-between text-xs text-gray-900 dark:text-white font-black">
                <span>Remaining Balance Due:</span>
                <span>{formatCurrency(cart.getBalanceDue())}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isSubmitting || cart.items.length === 0}
              onClick={handleInitiateCheckout}
              className="w-full py-3 bg-solar-600 hover:bg-solar-700 text-white rounded-xl font-black text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-75 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Processing Order...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete Sale & Print Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Floating Cart Summary Button */}
      {mobileTab === 'catalog' && cart.items.length > 0 && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30 animate-in slide-in-from-bottom duration-200">
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className="w-full py-3 px-4 bg-solar-600 hover:bg-solar-700 text-white rounded-2xl shadow-2xl flex items-center justify-between font-bold text-xs cursor-pointer border border-solar-400/30"
          >
            <span className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black">
                {cart.items.reduce((acc, it) => acc + it.quantity, 0)} items
              </span>
              <span>View Cart & Checkout</span>
            </span>
            <span className="text-sm font-black text-white">{formatCurrency(cart.getGrandTotal())} →</span>
          </button>
        </div>
      )}

      {/* Quick Customer Add Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Quick Add Customer"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Customer Full Name</label>
            <input
              type="text"
              required
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="e.g. Tariq Mehmood"
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Phone Number</label>
            <input
              type="tel"
              required
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              placeholder="+92 300 1234567"
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-solar-600 text-white rounded-xl font-bold text-xs mt-2"
          >
            Save Customer
          </button>
        </form>
      </Modal>

      {/* Sale Completed & Invoice Print Modal */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Sale Invoice Completed"
        maxWidth="lg"
      >
        {completedSale && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Invoice #{completedSale.invoice_no} Generated!
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Inventory deducted, customer balance updated, and warranty registered.
                </p>
              </div>
              <Badge variant="success">Completed</Badge>
            </div>

            {/* Printable Slip Preview */}
            <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-gray-200 dark:border-slate-800 text-xs space-y-2">
              <div className="text-center pb-2 border-b border-gray-100 dark:border-slate-800">
                <h3 className="font-black text-sm text-gray-900 dark:text-white">Alp Solar Sale and Service Center</h3>
                <p className="text-[10px] text-gray-400">MA Jinnah Road near Bank Al Habib, Chowk Kumhara, Multan • Tel: +92 302 3333499</p>
              </div>

              <div className="flex justify-between text-[11px]">
                <span>Customer: <b>{completedSale.customer?.name}</b></span>
                <span>Date: {new Date(completedSale.created_at).toLocaleDateString()}</span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-slate-800 pt-1">
                {completedSale.items?.map((it: any, idx: number) => (
                  <div key={idx} className="py-1.5 flex justify-between">
                    <span>{it.quantity}x Item (ID: {it.product_id.slice(-6)})</span>
                    <span>{formatCurrency(it.total_price)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-slate-700 flex justify-between font-bold text-xs">
                <span>Grand Total:</span>
                <span>{formatCurrency(completedSale.grand_total)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Paid Amount:</span>
                <span>{formatCurrency(completedSale.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-amber-600 font-bold">
                <span>Balance Due:</span>
                <span>{formatCurrency(completedSale.balance_due)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const cust = customers.find((c) => c.id === completedSale.customer_id) || completedSale.customer;
                  const untaxed = completedSale.subtotal || completedSale.grand_total || 0;
                  const taxAmt = Math.round(untaxed * 0.18);
                  const taxedGrandTotal = Math.round(untaxed * 1.18) - (completedSale.discount || 0) + (completedSale.installation_charges || 0) + (completedSale.transport_charges || 0);

                  triggerPrint({
                    docType: 'invoice',
                    docNumber: completedSale.invoice_no,
                    date: new Date(completedSale.created_at).toLocaleDateString(),
                    customerName: cust?.name || 'Customer',
                    customerPhone: cust?.phone,
                    customerCity: cust?.city,
                    customerCnic: cust?.cnic || '35202-9876543-1',
                    salespersonName: user?.full_name ? `${user.full_name} (Sales Desk)` : 'Engr. Usman Tariq (Sales Desk)',
                    validityDays: 'Expired 2 Days',
                    isDealLock: true,
                    taxRate: 18,
                    untaxedAmount: untaxed,
                    tax: taxAmt,
                    taxedTotal: taxedGrandTotal,
                    items: completedSale.items?.map((it: any) => ({
                      name: it.product?.name || `Product (${it.product_id?.slice(-6)})`,
                      quantity: it.quantity,
                      unit_price: it.unit_price,
                      total_price: it.total_price,
                      tax_rate: 18,
                    })) || [],
                    subtotal: completedSale.subtotal,
                    discount: completedSale.discount,
                    installationCharges: completedSale.installation_charges,
                    transportCharges: completedSale.transport_charges,
                    grandTotal: completedSale.grand_total,
                    paidAmount: completedSale.paid_amount,
                    balanceDue: completedSale.balance_due,
                    paymentMethod: completedSale.payment_status,
                    notes: completedSale.notes,
                  });
                }}
                className="flex-1 py-2.5 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice / Thermal Slip ({settings.paperSize})</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Checkout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmSale}
        onClose={() => setShowConfirmSale(false)}
        onConfirm={executeCheckout}
        title="Confirm POS Sale Checkout"
        message="Are you sure you want to finalize this sale? This will deduct inventory and create the invoice."
        confirmLabel="Confirm & Finalize Sale"
        cancelLabel="Back to POS"
        isLoading={isSubmitting}
        details={[
          {
            label: 'Customer',
            value: customers.find((c) => c.id === cart.customer_id)?.name || 'None Selected',
          },
          {
            label: 'Total Items',
            value: `${cart.items.reduce((sum, it) => sum + it.quantity, 0)} units (${cart.items.length} distinct lines)`,
          },
          {
            label: 'Subtotal',
            value: formatCurrency(cart.getSubtotal()),
          },
          {
            label: 'Grand Total',
            value: formatCurrency(cart.getGrandTotal()),
          },
          {
            label: 'Amount Paid Now',
            value: formatCurrency(cart.paid_amount || cart.getGrandTotal()),
          },
          ...(cart.getBalanceDue() > 0
            ? [
                {
                  label: 'Remaining Balance Due',
                  value: formatCurrency(cart.getBalanceDue()),
                },
              ]
            : []),
          {
            label: 'Payment Method',
            value: cart.payment_method.replace('_', ' '),
          },
        ]}
      />

      {/* Hidden Dedicated Printable Area for Instant Hardware Output */}
      <PrintableDocument />
    </div>
  );
};