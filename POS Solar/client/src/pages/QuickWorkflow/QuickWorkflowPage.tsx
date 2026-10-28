import React, { useEffect, useState, useMemo } from 'react';
import {
  Layers,
  UserPlus,
  FileText,
  ShoppingCart,
  CreditCard,
  Printer,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Zap,
  Phone,
  MapPin,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Search,
  Check,
  Building2,
  Package,
  Calendar,
  Clock,
} from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { usePrinterStore } from '../../stores/printerStore';
import { useAuthStore } from '../../stores/authStore';
import { PrinterSettingsModal } from '../../components/print/PrinterSettingsModal';
import { PrintableDocument } from '../../components/print/PrintableDocument';
import { Customer, Product, Category, Warehouse } from '../../types';
import { CustomerLedgerModal } from '../../components/customers/CustomerLedgerModal';
import { PaymentMethodSelect } from '../../components/ui/PaymentMethodSelect';

type WorkflowStep = 'inventory' | 'customer' | 'quotation' | 'invoice' | 'payment';

export const QuickWorkflowPage: React.FC = () => {
  const { settings, updateSettings, triggerPrint } = usePrinterStore();
  const { user } = useAuthStore();

  // Active Workflow Tab
  const [activeStep, setActiveStep] = useState<WorkflowStep>('inventory');

  // Master Data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Printer Settings Modal
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // ==========================================
  // 1. INVENTORY & STOCK STATE
  // ==========================================
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategoryId, setNewProdCategoryId] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState<number | ''>('');
  const [newSalePrice, setNewSalePrice] = useState<number | ''>('');
  const [stockProductId, setStockProductId] = useState('');
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [productSuccessMsg, setProductSuccessMsg] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // ==========================================
  // 2. CUSTOMER STATE
  // ==========================================
  const [custName, setCustName] = useState('Ilyas Solar Client');
  const [custPhone, setCustPhone] = useState('+92 300 9876543');
  const [custCity, setCustCity] = useState('Multan');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [customerSuccessMsg, setCustomerSuccessMsg] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // ==========================================
  // 3. QUOTATION STATE
  // ==========================================
  const [quotationId, setQuotationId] = useState(`QT-${Date.now().toString().slice(-4)}`);
  const [quotationItems, setQuotationItems] = useState<
    { productId: string; name: string; quantity: number; unitPrice: number; totalPrice: number }[]
  >([]);
  const [quotationInstallationFee, setQuotationInstallationFee] = useState<number>(25000);
  const [quotationTransportFee, setQuotationTransportFee] = useState<number>(10000);
  const [quotationDiscount, setQuotationDiscount] = useState<number>(0);
  const [isSavingQuotation, setIsSavingQuotation] = useState(false);

  // ==========================================
  // 4. INVOICE STATE
  // ==========================================
  const [invoiceId, setInvoiceId] = useState(`INV-${Date.now().toString().slice(-4)}`);
  const [invoiceItems, setInvoiceItems] = useState<
    { productId: string; name: string; quantity: number; unitPrice: number; totalPrice: number }[]
  >([]);
  const [invoiceAdvancePaid, setInvoiceAdvancePaid] = useState<number>(10000);
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState('CASH');
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const [invoiceTaxRate, setInvoiceTaxRate] = useState<number>(18);
  const [invoiceTaxAmount, setInvoiceTaxAmount] = useState<number>(0);
  const [isInvoiceTaxManual, setIsInvoiceTaxManual] = useState<boolean>(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  // ==========================================
  // 5. PAYMENT & LEDGER STATE ("ILYAS" Box)
  // ==========================================
  const [payOtherAmount, setPayOtherAmount] = useState<number>(40000);
  const [payOtherMethod, setPayOtherMethod] = useState('CASH');
  const [payOtherRef, setPayOtherRef] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [pRes, cRes, catRes, whRes] = await Promise.all([
        api.get('/products'),
        api.get('/customers'),
        api.get('/products/categories'),
        api.get('/inventory/warehouses'),
      ]);

      if (pRes.data?.success) setProducts(pRes.data.data);
      if (cRes.data?.success) {
        setCustomers(cRes.data.data);
        if (cRes.data.data.length > 0 && !activeCustomer) {
          const foundIlyas = cRes.data.data.find((c: Customer) =>
            c.name.toLowerCase().includes('ilyas')
          );
          setActiveCustomer(foundIlyas || cRes.data.data[0]);
        }
      }
      if (catRes.data?.success) {
        setCategories(catRes.data.data);
        if (catRes.data.data.length > 0 && !newProdCategoryId) {
          setNewProdCategoryId(catRes.data.data[0].id);
        }
      }
      if (whRes.data?.success) setWarehouses(whRes.data.data);
    } catch (e) {
      console.error('Failed to load Quick Workflow data', e);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 1. INVENTORY ACTIONS
  // -------------------------------------------------------------
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return alert('Please enter product name');
    setIsSavingProduct(true);
    try {
      const targetCatId = newProdCategoryId || categories[0]?.id;
      const res = await api.post('/products', {
        name: newProdName,
        category_id: targetCatId,
        brand_id: products[0]?.brand_id || 'default',
        purchase_price: Number(newPurchasePrice) || 0,
        sale_price: Number(newSalePrice) || 0,
      });

      if (res.data?.success) {
        const createdProd = res.data.data;
        if (stockQuantity > 0 && warehouses[0]?.id) {
          await api.post('/inventory/adjust', {
            warehouse_id: warehouses[0].id,
            product_id: createdProd.id,
            type: 'PURCHASE_IN',
            quantity: Number(stockQuantity),
            unit_cost: Number(newPurchasePrice) || 0,
            reason: 'Initial stock intake via Quick Flow',
          });
        }

        setProductSuccessMsg(`Product "${createdProd.name}" saved with stock!`);
        setTimeout(() => setProductSuccessMsg(''), 3000);
        setNewProdName('');
        setNewPurchasePrice('');
        setNewSalePrice('');
        loadAllData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save product');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleSaveStockOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockProductId) return alert('Please select a product');
    setIsSavingStock(true);
    try {
      const prod = products.find((p) => p.id === stockProductId);
      const res = await api.post('/inventory/adjust', {
        warehouse_id: warehouses[0]?.id,
        product_id: stockProductId,
        type: 'PURCHASE_IN',
        quantity: Number(stockQuantity),
        unit_cost: prod?.purchase_price || 0,
        reason: 'Stock added via Quick Flow',
      });

      if (res.data?.success) {
        setProductSuccessMsg(`Added ${stockQuantity} units to stock!`);
        setTimeout(() => setProductSuccessMsg(''), 3000);
        loadAllData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add stock');
    } finally {
      setIsSavingStock(false);
    }
  };

  // -------------------------------------------------------------
  // 2. CUSTOMER ACTIONS
  // -------------------------------------------------------------
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) return alert('Name & Phone are required');
    setIsSavingCustomer(true);
    try {
      const res = await api.post('/customers', {
        name: custName,
        phone: custPhone,
        city: custCity || 'Multan',
        customer_type: 'INDIVIDUAL',
      });

      if (res.data?.success) {
        const created = res.data.data;
        setActiveCustomer(created);
        setCustomerSuccessMsg(`Customer "${created.name}" registered and selected!`);
        setTimeout(() => setCustomerSuccessMsg(''), 3000);
        loadAllData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // -------------------------------------------------------------
  // 3. QUOTATION ACTIONS
  // -------------------------------------------------------------
  const addQuotationItem = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const existingIndex = quotationItems.findIndex((it) => it.productId === prodId);
    if (existingIndex > -1) {
      const updated = [...quotationItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setQuotationItems(updated);
    } else {
      setQuotationItems([
        ...quotationItems,
        {
          productId: prod.id,
          name: prod.name,
          quantity: 1,
          unitPrice: prod.sale_price || 0,
          totalPrice: prod.sale_price || 0,
        },
      ]);
    }
  };

  const removeQuotationItem = (index: number) => {
    setQuotationItems(quotationItems.filter((_, idx) => idx !== index));
  };

  const updateQuotationItemQuantity = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty);
    const updated = [...quotationItems];
    updated[index].quantity = qty;
    updated[index].totalPrice = qty * updated[index].unitPrice;
    setQuotationItems(updated);
  };

  const updateQuotationItemPrice = (index: number, newPrice: number) => {
    const price = Math.max(0, newPrice);
    const updated = [...quotationItems];
    updated[index].unitPrice = price;
    updated[index].totalPrice = updated[index].quantity * price;
    setQuotationItems(updated);
  };

  const quotationSubtotal = useMemo(() => {
    return quotationItems.reduce((acc, it) => acc + it.totalPrice, 0);
  }, [quotationItems]);

  const quotationGrandTotal = useMemo(() => {
    return Math.max(
      0,
      quotationSubtotal +
        Number(quotationInstallationFee || 0) +
        Number(quotationTransportFee || 0) -
        Number(quotationDiscount || 0)
    );
  }, [quotationSubtotal, quotationInstallationFee, quotationTransportFee, quotationDiscount]);

  const handleSaveAndPrintQuotation = async () => {
    if (!activeCustomer) return alert('Select or register a customer first');
    if (quotationItems.length === 0) return alert('Add at least one item');
    setIsSavingQuotation(true);
    try {
      const payload = {
        customer_id: activeCustomer.id,
        items: quotationItems.map((it) => ({
          product_id: it.productId,
          description: it.name,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          total_price: it.totalPrice,
        })),
        installation_charges: Number(quotationInstallationFee || 0),
        transport_charges: Number(quotationTransportFee || 0),
        discount: Number(quotationDiscount || 0),
      };

      const res = await api.post('/quotations', payload);
      if (res.data?.success) {
        const savedQ = res.data.data;
        triggerPrint({
          docType: 'quotation',
          docNumber: savedQ.quotation_no || quotationId,
          date: new Date().toLocaleDateString(),
          customerName: activeCustomer.name,
          customerPhone: activeCustomer.phone,
          customerCity: activeCustomer.city || custCity,
          items: quotationItems.map((it) => ({
            name: it.name,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            total_price: it.totalPrice,
          })),
          subtotal: quotationSubtotal,
          discount: quotationDiscount,
          installationCharges: quotationInstallationFee,
          transportCharges: quotationTransportFee,
          grandTotal: quotationGrandTotal,
          paidAmount: 0,
          balanceDue: quotationGrandTotal,
          notes: 'Quotation proposal valid for 7 days.',
        });
        setQuotationId(`QT-${Date.now().toString().slice(-4)}`);
        setQuotationItems([]);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save quotation');
    } finally {
      setIsSavingQuotation(false);
    }
  };

  // -------------------------------------------------------------
  // 4. INVOICE ACTIONS
  // -------------------------------------------------------------
  const addInvoiceItem = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const existingIndex = invoiceItems.findIndex((it) => it.productId === prodId);
    if (existingIndex > -1) {
      const updated = [...invoiceItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setInvoiceItems(updated);
    } else {
      setInvoiceItems([
        ...invoiceItems,
        {
          productId: prod.id,
          name: prod.name,
          quantity: 1,
          unitPrice: prod.sale_price || 0,
          totalPrice: prod.sale_price || 0,
        },
      ]);
    }
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, idx) => idx !== index));
  };

  const updateInvoiceItemQuantity = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty);
    const updated = [...invoiceItems];
    updated[index].quantity = qty;
    updated[index].totalPrice = qty * updated[index].unitPrice;
    setInvoiceItems(updated);
  };

  const updateInvoiceItemPrice = (index: number, newPrice: number) => {
    const price = Math.max(0, newPrice);
    const updated = [...invoiceItems];
    updated[index].unitPrice = price;
    updated[index].totalPrice = updated[index].quantity * price;
    setInvoiceItems(updated);
  };

  const invoiceSubtotal = useMemo(() => {
    return invoiceItems.reduce((acc, it) => acc + it.totalPrice, 0);
  }, [invoiceItems]);

  useEffect(() => {
    if (!isInvoiceTaxManual) {
      setInvoiceTaxAmount(Math.round(invoiceSubtotal * (invoiceTaxRate / 100)));
    }
  }, [invoiceSubtotal, invoiceTaxRate, isInvoiceTaxManual]);

  const handleSetInvoiceTaxRate = (rate: number) => {
    setIsInvoiceTaxManual(false);
    setInvoiceTaxRate(rate);
    setInvoiceTaxAmount(Math.round(invoiceSubtotal * (rate / 100)));
  };

  const handleSetInvoiceTaxAmount = (amount: number) => {
    setIsInvoiceTaxManual(true);
    setInvoiceTaxAmount(amount);
    if (invoiceSubtotal > 0) {
      const derivedRate = Math.round((amount / invoiceSubtotal) * 1000) / 10;
      setInvoiceTaxRate(derivedRate);
    }
  };

  const invoiceGrandTotal = useMemo(() => {
    return Math.max(0, invoiceSubtotal - Number(invoiceDiscount || 0) + Number(invoiceTaxAmount || 0));
  }, [invoiceSubtotal, invoiceDiscount, invoiceTaxAmount]);

  const invoiceBalanceDue = useMemo(() => {
    return Math.max(0, invoiceGrandTotal - Number(invoiceAdvancePaid || 0));
  }, [invoiceGrandTotal, invoiceAdvancePaid]);

  const handleSaveAndPrintInvoice = async () => {
    if (!activeCustomer) return alert('Select or register a customer first');
    if (invoiceItems.length === 0) return alert('Select at least one product');
    setIsSavingInvoice(true);
    try {
      const payload = {
        customer_id: activeCustomer.id,
        items: invoiceItems.map((it) => ({
          product_id: it.productId,
          quantity: it.quantity,
          unit_price: it.unitPrice,
        })),
        tax: Number(invoiceTaxAmount || 0),
        discount: Number(invoiceDiscount || 0),
        paid_amount: Number(invoiceAdvancePaid || 0),
        payment_method: invoicePaymentMethod,
        notes: `Quick Flow Sale. Advance: ${formatCurrency(invoiceAdvancePaid)}. Balance: ${formatCurrency(invoiceBalanceDue)}`,
      };

      const res = await api.post('/sales', payload);
      if (res.data?.success) {
        const savedSale = res.data.data;
        const tax = Number(invoiceTaxAmount || 0);
        const taxedTotal = invoiceGrandTotal;

        triggerPrint({
          docType: 'invoice',
          docNumber: savedSale.invoice_no || invoiceId,
          date: new Date().toLocaleDateString(),
          customerName: activeCustomer.name,
          customerPhone: activeCustomer.phone,
          customerCity: activeCustomer.city || custCity,
          customerCnic: activeCustomer.cnic || '35202-9876543-1',
          salespersonName: user?.full_name ? `${user.full_name} (Sales Desk)` : 'Engr. Usman Tariq (Sales Desk)',
          validityDays: 'Expired 2 Days',
          isDealLock: true,
          taxRate: invoiceTaxRate,
          untaxedAmount: invoiceSubtotal,
          tax,
          taxedTotal,
          items: invoiceItems.map((it) => ({
            name: it.name,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            total_price: it.totalPrice,
            tax_rate: invoiceTaxRate,
          })),
          subtotal: invoiceSubtotal,
          discount: invoiceDiscount,
          grandTotal: invoiceGrandTotal,
          paidAmount: Number(invoiceAdvancePaid || 0),
          balanceDue: invoiceBalanceDue,
          paymentMethod: invoicePaymentMethod,
          notes: 'Standard 25-year panel performance, 5-year inverter warranty.',
        });
        setInvoiceId(`INV-${Date.now().toString().slice(-4)}`);
        setInvoiceItems([]);
        loadAllData();
        // Automatically switch to Payment step to show the new ledger!
        setActiveStep('payment');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save invoice');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  // -------------------------------------------------------------
  // 5. PAYMENT & LEDGER ACTIONS
  // -------------------------------------------------------------
  const handleRecordPayOther = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return alert('Select a customer');
    if (!payOtherAmount || Number(payOtherAmount) <= 0) return alert('Enter valid payment amount');
    setIsRecordingPayment(true);
    try {
      const res = await api.post(`/customers/${activeCustomer.id}/payments`, {
        amount: Number(payOtherAmount),
        payment_method: payOtherMethod,
        transaction_ref: payOtherRef || `PAY-${Date.now().toString().slice(-4)}`,
        notes: `Remaining balance payment for ${activeCustomer.name}`,
      });

      if (res.data?.success) {
        setPaymentSuccessMsg(`Payment of ${formatCurrency(payOtherAmount)} received & recorded!`);
        setTimeout(() => setPaymentSuccessMsg(''), 4000);
        triggerPrint({
          docType: 'payment_receipt',
          docNumber: `RCP-${Date.now().toString().slice(-4)}`,
          date: new Date().toLocaleString(),
          customerName: activeCustomer.name,
          customerPhone: activeCustomer.phone,
          customerCity: activeCustomer.city,
          items: [
            {
              name: `Account Balance Payment (${payOtherMethod})`,
              quantity: 1,
              unit_price: Number(payOtherAmount),
              total_price: Number(payOtherAmount),
            },
          ],
          subtotal: Number(payOtherAmount),
          grandTotal: Number(payOtherAmount),
          paidAmount: Number(payOtherAmount),
          balanceDue: Math.max(0, (activeCustomer.outstanding_balance || 0) - Number(payOtherAmount)),
          paymentMethod: payOtherMethod,
          notes: `Official Payment Voucher for customer account ${activeCustomer.customer_no}`,
        });
        loadAllData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Filtered Products for table
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 10);
    return products.filter((p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // Stepper items list
  const stepsList: { key: WorkflowStep; number: string; title: string; subtitle: string; icon: any }[] = [
    { key: 'inventory', number: '1', title: 'Inventory & Stock', subtitle: 'P.P, S.P & Inward', icon: Layers },
    { key: 'customer', number: '2', title: 'Customer Profile', subtitle: 'Name, Phone & City', icon: UserPlus },
    { key: 'quotation', number: '3', title: 'Quotation Proposal', subtitle: 'Solar Project Estimate', icon: FileText },
    { key: 'invoice', number: '4', title: 'Invoice & POS Billing', subtitle: 'P & Q with Advance', icon: ShoppingCart },
    { key: 'payment', number: '5', title: 'Payment & Ledger', subtitle: 'Advance & Balance Due', icon: CreditCard },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header Bar (Direct clean header, matching Quotations) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Solar Business Operations
          </h2>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CLEAN WORKFLOW STEPPER TABS (No Cramming!) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {stepsList.map((step) => {
          const isActive = activeStep === step.key;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setActiveStep(step.key)}
              className={`px-4 py-3.5 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center ${
                isActive
                  ? 'bg-solar-600 text-white border-solar-600 shadow-md scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-300 hover:border-solar-400 hover:bg-solar-50/50 dark:hover:bg-slate-800/60'
              }`}
            >
              <p className={`text-xs font-black truncate ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {step.title}
              </p>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: INVENTORY & STOCK (Full Spacious Page) */}
      {/* ========================================================================= */}
      {activeStep === 'inventory' && (
        <div className="space-y-6 animate-fadeIn">
          {productSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-2xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{productSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form 1: Add New Product (6 Cols) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-slate-800 mb-5">
                <div className="w-9 h-9 rounded-xl bg-solar-100 dark:bg-solar-900/40 text-solar-600 flex items-center justify-center font-black">
                  1A
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">Add New Solar Product</h3>
                </div>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Product Full Name & Specification
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. Longi Hi-MO 6 585W Monofacial Solar Panel"
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      P.P. (Purchase Price / Cost)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-bold">Rs.</span>
                      <input
                        type="number"
                        value={newPurchasePrice}
                        onChange={(e) => setNewPurchasePrice(e.target.value ? Number(e.target.value) : '')}
                        placeholder="18000"
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      S.P. (Sale Price / Retail)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-solar-600 font-bold">Rs.</span>
                      <input
                        type="number"
                        value={newSalePrice}
                        onChange={(e) => setNewSalePrice(e.target.value ? Number(e.target.value) : '')}
                        placeholder="20500"
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-black text-solar-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Equipment Category</label>
                    <select
                      value={newProdCategoryId}
                      onChange={(e) => setNewProdCategoryId(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      Initial Inward Quantity (Q)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(Number(e.target.value))}
                      className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="w-full py-3 bg-solar-600 hover:bg-solar-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSavingProduct ? 'Saving Product...' : 'Save Product to Inventory'}</span>
                </button>
              </form>
            </div>

            {/* Form 2: Quick Stock Inward to Existing (6 Cols) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-slate-800 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-black">
                    1B
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Quick Stock Intake (P & Q)</h3>
                  </div>
                </div>

                <form onSubmit={handleSaveStockOnly} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      Select Existing Product (P)
                    </label>
                    <select
                      value={stockProductId}
                      onChange={(e) => setStockProductId(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-medium"
                    >
                      <option value="">-- Choose Product from Catalog --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} • (Current Stock: {p.availableStock ?? 0} units)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Quantity to Add (Q)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(Number(e.target.value))}
                        className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Target Warehouse</label>
                      <div className="p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-400 font-semibold truncate">
                        {warehouses[0]?.name || 'Multan Main Warehouse'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingStock || !stockProductId}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    <Layers className="w-4 h-4 text-solar-400" />
                    <span>{isSavingStock ? 'Updating Stock...' : 'Save & Inward Stock'}</span>
                  </button>
                </form>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800 mt-6 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Live Catalog Overview</p>
                  <p className="text-[11px] text-gray-400">{products.length} registered products in database</p>
                </div>
                <button
                  type="button"
                  onClick={loadAllData}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg font-bold text-[11px] hover:bg-gray-100"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </div>

          {/* Navigation to Next Step */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setActiveStep('customer')}
              className="px-6 py-3 bg-solar-600 hover:bg-solar-700 text-white rounded-2xl font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Next Step: Customer Registration</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: CUSTOMER PROFILE (Full Spacious Page) */}
      {/* ========================================================================= */}
      {activeStep === 'customer' && (
        <div className="space-y-6 animate-fadeIn">
          {customerSuccessMsg && (
            <div className="p-3.5 bg-solar-50 dark:bg-solar-950/40 border border-solar-200 dark:border-solar-800 text-solar-800 dark:text-solar-200 text-xs font-bold rounded-2xl flex items-center gap-2">
              <Check className="w-4 h-4 text-solar-600 dark:text-solar-400" />
              <span>{customerSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Customer Form (6 Cols) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-slate-800 mb-5">
                <div className="w-9 h-9 rounded-xl bg-solar-100 dark:bg-solar-900/40 text-solar-600 dark:text-solar-400 flex items-center justify-center font-black">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">Register Client / Customer</h3>
                </div>
              </div>

              <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
                <div>
                  <label className="font-black text-gray-900 dark:text-white block mb-1">
                    Customer Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="e.g. Ilyas Khan / Tariq Mehmood"
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-base text-gray-900 dark:text-white focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-black text-gray-900 dark:text-white block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-xs text-gray-900 dark:text-white focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500"
                    />
                  </div>

                  <div>
                    <label className="font-black text-gray-900 dark:text-white block mb-1">City / Region</label>
                    <input
                      type="text"
                      value={custCity}
                      onChange={(e) => setCustCity(e.target.value)}
                      placeholder="Multan / Lahore / Bahawalpur"
                      className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-xs text-gray-900 dark:text-white focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="w-full py-3 bg-solar-600 hover:bg-solar-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSavingCustomer ? 'Saving Customer...' : 'Save & Select Customer'}</span>
                </button>
              </form>
            </div>

            {/* Currently Active Customer Card (6 Cols) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-solar-50 text-solar-700 dark:bg-solar-950/40 dark:text-solar-300 border border-solar-200 dark:border-solar-800 font-black text-[11px] uppercase tracking-wider">
                    Active Customer for Billing
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-500 dark:text-slate-400">
                    {activeCustomer?.customer_no || 'CUST-001'}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                  {activeCustomer?.name || 'ILYAS (Solar Client)'}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-700 dark:text-slate-300 mt-2">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-solar-600 dark:text-solar-400" />
                    {activeCustomer?.phone || '+92 300 9876543'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-solar-600 dark:text-solar-400" />
                    {activeCustomer?.city || custCity || 'Multan'}
                  </span>
                </div>

                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                  <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-gray-700 dark:text-slate-300 uppercase font-black block">Current Ledger Balance</span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(activeCustomer?.outstanding_balance ?? 0)}
                    </span>
                  </div>
                  <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-gray-700 dark:text-slate-300 uppercase font-black block">Total Invoiced</span>
                    <span className="text-lg font-black text-solar-600 dark:text-solar-400">
                      {formatCurrency(50000)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fast Switcher */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800/80">
                <label className="text-[11px] font-black text-gray-900 dark:text-white block mb-1.5">
                  Or Select Existing Customer from Records:
                </label>
                <select
                  value={activeCustomer?.id || ''}
                  onChange={(e) => {
                    const found = customers.find((c) => c.id === e.target.value);
                    if (found) setActiveCustomer(found);
                  }}
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.phone} ({c.city || 'Multan'})
                    </option>
                  ))}
                </select>
              </div>

              {/* View Khata Button */}
              {activeCustomer && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowLedgerModal(true)}
                    className="w-full py-2.5 px-4 bg-solar-50 hover:bg-solar-100 text-solar-800 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-solar-300 border border-solar-200 dark:border-solar-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-solar-600" />
                    <span>View Customer Account Ledger</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveStep('inventory')}
              className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Inventory</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStep('quotation')}
              className="px-6 py-3 bg-solar-600 hover:bg-solar-700 text-white rounded-2xl font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Next Step: Build Quotation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: QUOTATION PROPOSAL (Full Spacious Page) */}
      {/* ========================================================================= */}
      {activeStep === 'quotation' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-solar-100 dark:bg-solar-900/40 text-solar-600 dark:text-solar-400 flex items-center justify-center font-black">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">
                    Solar Quotation Builder
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-solar-50 dark:bg-solar-950/40 text-solar-700 dark:text-solar-400 border border-solar-200 dark:border-solar-800 rounded-xl font-mono text-xs font-bold">
                  Quotation #{quotationId}
                </span>
              </div>
            </div>

            {/* Line Items Selector */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-8">
                <label className="font-black text-gray-900 dark:text-white block mb-1 text-xs">
                  Pick Solar Equipment to Add
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addQuotationItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500"
                >
                  <option value="">+ Click to choose equipment (Panels, Inverter, Battery, Structure)...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.sale_price)} ({p.availableStock ?? 0} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4 flex items-center justify-end text-xs font-bold text-gray-900 dark:text-white">
                <span>Items in quote: <b>{quotationItems.length}</b> lines</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white font-black border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-12 text-center font-black">#</th>
                    <th className="p-3 font-black">Product Description</th>
                    <th className="p-3 w-36 text-center font-black">Quantity</th>
                    <th className="p-3 w-40 text-right font-black">Unit Rate</th>
                    <th className="p-3 w-32 text-right font-black">Line Total</th>
                    <th className="p-3 w-16 text-center font-black">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {quotationItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-600 dark:text-gray-400 font-bold">
                        No equipment added to proposal yet. Select components from the dropdown above.
                      </td>
                    </tr>
                  ) : (
                    quotationItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 text-center text-gray-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-gray-900 dark:text-white">{item.name}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQuotationItemQuantity(idx, item.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 flex items-center justify-center text-gray-800 dark:text-gray-200 hover:bg-solar-100 hover:border-solar-600 hover:text-solar-700 active:scale-95 transition-all cursor-pointer font-bold"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                updateQuotationItemQuantity(idx, isNaN(val) ? 1 : val);
                              }}
                              className="w-16 h-7 text-center font-black text-xs text-gray-900 dark:text-white bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuotationItemQuantity(idx, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 flex items-center justify-center text-gray-800 dark:text-gray-200 hover:bg-solar-100 hover:border-solar-600 hover:text-solar-700 active:scale-95 transition-all cursor-pointer font-bold"
                              title="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[11px] font-bold text-gray-500">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateQuotationItemPrice(idx, isNaN(val) ? 0 : val);
                              }}
                              className="w-24 h-7 text-right px-2 font-black text-xs text-gray-900 dark:text-white bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500 hover:border-solar-400 transition-colors"
                              title="Click to edit unit price / rate"
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right font-black text-solar-600 dark:text-solar-400">
                          {formatCurrency(item.totalPrice)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeQuotationItem(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Addons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-slate-800">
              <div className="space-y-3 text-xs">
                <span className="font-black text-gray-900 dark:text-white block">Optional Engineering Addons:</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-900 dark:text-white">Installation Fee (Rs.)</label>
                    <input
                      type="number"
                      value={quotationInstallationFee}
                      onChange={(e) => setQuotationInstallationFee(Number(e.target.value))}
                      className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-900 dark:text-white">Transport & Delivery (Rs.)</label>
                    <input
                      type="number"
                      value={quotationTransportFee}
                      onChange={(e) => setQuotationTransportFee(Number(e.target.value))}
                      className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-gray-800 dark:text-gray-200">
                  <span>Equipment Subtotal:</span>
                  <span>{formatCurrency(quotationSubtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800 dark:text-gray-200">
                  <span>Services & Transport:</span>
                  <span>+{formatCurrency(quotationInstallationFee + quotationTransportFee)}</span>
                </div>
                <div className="flex justify-between font-black text-base text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-slate-800">
                  <span>Total Proposal Value:</span>
                  <span className="text-solar-600 dark:text-solar-400 font-black">
                    {formatCurrency(quotationGrandTotal)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isSavingQuotation || quotationItems.length === 0}
                  onClick={handleSaveAndPrintQuotation}
                  className="w-full py-3 bg-solar-600 hover:bg-solar-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isSavingQuotation ? 'Saving...' : 'Save & Print Quotation Now'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveStep('customer')}
              className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Customer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStep('invoice')}
              className="px-6 py-3 bg-solar-600 hover:bg-solar-700 text-white rounded-2xl font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Next Step: Invoice & Billing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: INVOICE & POS BILLING (Full Spacious Page) */}
      {/* ========================================================================= */}
      {activeStep === 'invoice' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-solar-100 dark:bg-solar-900/40 text-solar-600 dark:text-solar-400 flex items-center justify-center font-black">
                  4
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">
                    Invoice & POS Billing (P & Q)
                  </h3>
                </div>
              </div>
              <span className="px-3 py-1 bg-solar-50 dark:bg-solar-950/40 text-solar-700 dark:text-solar-400 border border-solar-200 dark:border-solar-800 rounded-xl font-mono text-xs font-bold">
                Invoice #{invoiceId}
              </span>
            </div>

            {/* Product Selector */}
            <div>
              <label className="font-black text-gray-900 dark:text-white block mb-1 text-xs">
                Select Equipment (P) & Quantity (Q)
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addInvoiceItem(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500"
              >
                <option value="">+ Add Product to Invoice (P & Q)...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.sale_price)} ({p.availableStock ?? 0} in stock)
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Line Items Table */}
            <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white font-black border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-12 text-center font-black">#</th>
                    <th className="p-3 font-black">Product Description</th>
                    <th className="p-3 w-36 text-center font-black">Qty (Q)</th>
                    <th className="p-3 w-40 text-right font-black">Unit Price</th>
                    <th className="p-3 w-32 text-right font-black">Total Price</th>
                    <th className="p-3 w-16 text-center font-black">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {invoiceItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-600 dark:text-gray-400 font-bold">
                        No equipment added yet. Pick products above to build the invoice.
                      </td>
                    </tr>
                  ) : (
                    invoiceItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 text-center text-gray-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-gray-900 dark:text-white">{item.name}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateInvoiceItemQuantity(idx, item.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 flex items-center justify-center text-gray-800 dark:text-gray-200 hover:bg-solar-100 hover:border-solar-600 hover:text-solar-700 active:scale-95 transition-all cursor-pointer font-bold"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                updateInvoiceItemQuantity(idx, isNaN(val) ? 1 : val);
                              }}
                              className="w-16 h-7 text-center font-black text-xs text-gray-900 dark:text-white bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500"
                            />
                            <button
                              type="button"
                              onClick={() => updateInvoiceItemQuantity(idx, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 flex items-center justify-center text-gray-800 dark:text-gray-200 hover:bg-solar-100 hover:border-solar-600 hover:text-solar-700 active:scale-95 transition-all cursor-pointer font-bold"
                              title="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[11px] font-bold text-gray-500">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateInvoiceItemPrice(idx, isNaN(val) ? 0 : val);
                              }}
                              className="w-24 h-7 text-right px-2 font-black text-xs text-gray-900 dark:text-white bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500 hover:border-solar-400 transition-colors"
                              title="Click to edit unit price / rate"
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right font-black text-solar-600 dark:text-solar-400">
                          {formatCurrency(item.totalPrice)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeInvoiceItem(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Advance Payment, Discount, Tax & Totals Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-slate-800">
              <div className="space-y-4">
                {/* Advance Payment (Booking Deposit) */}
                <div className="p-4 bg-solar-50/70 dark:bg-solar-950/30 rounded-2xl border-2 border-solar-600 dark:border-solar-600 space-y-3">
                  <span className="font-black text-solar-800 dark:text-solar-200 block text-xs uppercase tracking-wider">
                    Advance Payment (Booking Deposit)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-black text-gray-900 dark:text-white block mb-1">
                        Advance Paid (Rs.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={invoiceAdvancePaid || ''}
                        onChange={(e) => setInvoiceAdvancePaid(Number(e.target.value))}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-solar-600 dark:border-solar-500 rounded-xl font-black text-solar-700 dark:text-solar-300 text-sm focus:outline-none focus:ring-2 focus:ring-solar-500"
                      />
                    </div>

                    <div>
                      <PaymentMethodSelect
                        label="Payment Mode"
                        value={invoicePaymentMethod}
                        onChange={(val) => setInvoicePaymentMethod(val)}
                      />
                    </div>
                  </div>
                </div>

                {/* Discount */}
                <div>
                  <label className="text-xs font-black text-gray-900 dark:text-white block mb-1">
                    Discount (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={invoiceDiscount || ''}
                    onChange={(e) => setInvoiceDiscount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-solar-500"
                  />
                </div>
              </div>

              {/* Right Column: Editable Tax & Grand Total */}
              <div className="space-y-3">
                {/* Editable Tax Card */}
                <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                      <span>Sales Tax / GST</span>
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                        Editable
                      </span>
                    </label>
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 font-mono">
                      {invoiceTaxRate}% = {formatCurrency(invoiceTaxAmount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 block mb-1">
                        Tax Amount (Rs.)
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={invoiceTaxAmount === 0 ? '' : invoiceTaxAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleSetInvoiceTaxAmount(isNaN(val) ? 0 : val);
                        }}
                        placeholder="0 (Rs.)"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-black text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        title="Directly edit tax amount in Rupees"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 block mb-1">
                        Tax Rate (%)
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={invoiceTaxRate === 0 ? '' : invoiceTaxRate}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleSetInvoiceTaxRate(isNaN(val) ? 0 : val);
                        }}
                        placeholder="0%"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-black text-center text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        title="Edit tax percentage rate"
                      />
                    </div>
                  </div>

                  {/* Quick 1-Click Tax Presets */}
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 dark:border-amber-900/40 text-[10px]">
                    <span className="text-gray-600 dark:text-gray-400 font-bold">Quick Presets:</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetInvoiceTaxRate(0)}
                        className={`px-2 py-0.5 rounded font-black border transition-all cursor-pointer ${
                          invoiceTaxAmount === 0
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-700 hover:bg-gray-100'
                        }`}
                      >
                        0% (Exempt)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetInvoiceTaxRate(5)}
                        className={`px-2 py-0.5 rounded font-black border transition-all cursor-pointer ${
                          invoiceTaxRate === 5
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-700 hover:bg-gray-100'
                        }`}
                      >
                        5%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetInvoiceTaxRate(18)}
                        className={`px-2 py-0.5 rounded font-black border transition-all cursor-pointer ${
                          invoiceTaxRate === 18
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-700 hover:bg-gray-100'
                        }`}
                      >
                        18% GST
                      </button>
                    </div>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-gray-700 dark:text-gray-300">
                    <span>Subtotal (Untaxed):</span>
                    <span>{formatCurrency(invoiceSubtotal)}</span>
                  </div>
                  {invoiceDiscount > 0 && (
                    <div className="flex justify-between font-bold text-rose-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(invoiceDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-amber-700 dark:text-amber-400">
                    <span>Sales Tax ({invoiceTaxRate}%):</span>
                    <span>+{formatCurrency(invoiceTaxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-black text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-slate-800">
                    <span>Taxed Grand Total:</span>
                    <span className="text-sm">{formatCurrency(invoiceGrandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-solar-600 dark:text-solar-400 font-black">
                    <span>Advance Received:</span>
                    <span>{formatCurrency(invoiceAdvancePaid)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 font-black text-sm pt-2 border-t border-gray-200 dark:border-slate-800">
                    <span>Balance Outstanding Due:</span>
                    <span>{formatCurrency(invoiceBalanceDue)}</span>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingInvoice || invoiceItems.length === 0}
                    onClick={handleSaveAndPrintInvoice}
                    className="w-full py-3.5 bg-solar-600 hover:bg-solar-700 text-white rounded-xl font-black text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-3"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isSavingInvoice ? 'Processing...' : 'Save & Print Official Invoice'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveStep('quotation')}
              className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Quotation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStep('payment')}
              className="px-6 py-3 bg-solar-600 hover:bg-solar-700 text-white rounded-2xl font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Next Step: Payment Ledger</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: PAYMENT & LEDGER ("ILYAS" Box - Full Spacious Page) */}
      {/* ========================================================================= */}
      {activeStep === 'payment' && (
        <div className="space-y-6 animate-fadeIn">
          {paymentSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-2xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{paymentSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Featured Customer Ledger Box (7 Cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-7 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-solar-600 dark:text-solar-400">
                    Customer Ledger Card
                  </span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg text-xs font-mono font-bold">
                    {activeCustomer?.customer_no || 'CUST-001'}
                  </span>
                </div>

                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                  {activeCustomer?.name || 'ILYAS (Solar Client)'}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-700 dark:text-slate-300 mt-2">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-solar-600 dark:text-solar-400" />
                    {activeCustomer?.phone || '+92 300 9876543'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-solar-600 dark:text-solar-400" />
                    {activeCustomer?.city || custCity || 'Multan'}
                  </span>
                </div>

                {/* Advance & Balance Box from sketch */}
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 rounded-2xl">
                    <span className="text-[11px] font-black uppercase tracking-wider text-solar-700 dark:text-solar-400 block mb-1">
                      [ 10,000 ] Advance Received
                    </span>
                    <p className="text-2xl font-black text-solar-700 dark:text-solar-400">
                      {formatCurrency(10000)}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 rounded-2xl">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                      Remaining Balance Outstanding
                    </span>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(activeCustomer?.outstanding_balance ?? 40000)}
                    </p>
                  </div>
                </div>

                {/* View Full Khata / Ledger Button */}
                <button
                  type="button"
                  onClick={() => setShowLedgerModal(true)}
                  className="mt-6 w-full py-3 px-4 bg-solar-600 hover:bg-solar-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Open Customer Account Ledger</span>
                </button>
              </div>

              <div className="mt-6 pt-4 text-xs font-bold text-gray-600 dark:text-slate-400 border-t border-gray-100 dark:border-slate-800 flex justify-between">
                <span>Account Status: Active</span>
                <span>Branch: Multan Main Operations</span>
              </div>
            </div>

            {/* Pay Other Form (5 Cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-7 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-solar-600" />
                  <h4 className="text-base font-black text-gray-900 dark:text-white">
                    Pay Other (Record Payment)
                  </h4>
                </div>

                <form onSubmit={handleRecordPayOther} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      Amount to Pay (Rs.)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={payOtherAmount}
                      onChange={(e) => setPayOtherAmount(Number(e.target.value))}
                      placeholder="e.g. 40000"
                      className="w-full p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-black text-lg text-solar-600 dark:text-solar-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <PaymentMethodSelect
                        label="Payment Mode"
                        value={payOtherMethod}
                        onChange={(val) => setPayOtherMethod(val)}
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Slip / Ref #
                      </label>
                      <input
                        type="text"
                        value={payOtherRef}
                        onChange={(e) => setPayOtherRef(e.target.value)}
                        placeholder="e.g. HBL-9821"
                        className="w-full p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isRecordingPayment}
                    className="w-full py-3.5 bg-solar-600 hover:bg-solar-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer mt-3"
                  >
                    <Printer className="w-4 h-4" />
                    <span>
                      {isRecordingPayment ? 'Recording Receipt...' : 'Pay Other & Print Receipt'}
                    </span>
                  </button>
                </form>
              </div>

              <p className="text-[11px] text-gray-400 text-center mt-5">
                Automatically decrements customer accounts receivable.
              </p>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="flex justify-start pt-2">
            <button
              type="button"
              onClick={() => setActiveStep('invoice')}
              className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Invoice & POS Billing</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden Dedicated Printable Area for Instant Hardware Output */}
      <PrintableDocument />

      {/* Printer Configuration Modal */}
      <PrinterSettingsModal
        isOpen={showPrinterModal}
        onClose={() => setShowPrinterModal(false)}
      />

      {/* Customer Dynamic Khata / Ledger Modal */}
      <CustomerLedgerModal
        isOpen={showLedgerModal}
        onClose={() => setShowLedgerModal(false)}
        customer={activeCustomer}
        onPaymentRecorded={() => {
          loadAllData();
        }}
      />
    </div>
  );
};
