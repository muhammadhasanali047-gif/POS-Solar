import React, { useState, useEffect } from 'react';
import {
  Barcode,
  Search,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  Layers,
  Plus,
} from 'lucide-react';
import api from '../../lib/api';
import { formatDate, formatCurrency } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../stores/authStore';
import { Product, Warehouse } from '../../types';

export const SerialsPage: React.FC = () => {
  const { user } = useAuthStore();
  const canRegister = ['ADMIN', 'CEO', 'MANAGER'].includes(user?.role || '');

  const [searchQuery, setSearchQuery] = useState('SN-GW10K-771201');
  const [historyData, setHistoryData] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string | null>(null);

  // Standalone Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [regSerialNo, setRegSerialNo] = useState('');
  const [regNotes, setRegNotes] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  useEffect(() => {
    const loadProductsAndWarehouses = async () => {
      try {
        const [prodRes, whRes] = await Promise.all([
          api.get('/products'),
          api.get('/inventory/warehouses'),
        ]);
        if (prodRes.data?.data) {
          const allProds: Product[] = prodRes.data.data;
          setProducts(allProds);
          // Default select first serialized product if available, else first product
          const firstSerialized = allProds.find((p) => p.is_serialized) || allProds[0];
          if (firstSerialized) {
            setSelectedProductId(firstSerialized.id);
            if (firstSerialized.variants && firstSerialized.variants.length > 0) {
              setSelectedVariantId(firstSerialized.variants[0].id);
            }
          }
        }
        if (whRes.data?.data) {
          const whs: Warehouse[] = whRes.data.data;
          setWarehouses(whs);
          if (whs.length > 0) {
            setSelectedWarehouseId(whs[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load products or warehouses for serial registration', err);
      }
    };
    loadProductsAndWarehouses();
  }, []);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod?.variants && prod.variants.length > 0) {
      setSelectedVariantId(prod.variants[0].id);
    } else {
      setSelectedVariantId('');
    }
  };

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery !== undefined ? customQuery : searchQuery).trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await api.get(`/serials/history/${encodeURIComponent(query)}`);
      if (res.data?.success) {
        setHistoryData(res.data.data);
      } else {
        setSearchError(res.data.error || 'Serial not found');
        setHistoryData(null);
      }
    } catch (err: any) {
      setSearchError(err.response?.data?.error || `Serial number '${query}' was not found in records.`);
      setHistoryData(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegisterSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSerial = regSerialNo.trim().toUpperCase();
    if (!cleanSerial) {
      setRegisterError('Please enter a valid serial number');
      return;
    }
    if (!selectedProductId) {
      setRegisterError('Please select a product');
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);

    try {
      const payload: any = {
        serial_no: cleanSerial,
        product_id: selectedProductId,
      };
      if (selectedVariantId) payload.variant_id = selectedVariantId;
      if (selectedWarehouseId) payload.warehouse_id = selectedWarehouseId;
      if (regNotes.trim()) payload.notes = regNotes.trim();

      const res = await api.post('/serials', payload);
      if (res.data?.success) {
        setShowRegisterModal(false);
        setRegSerialNo('');
        setRegNotes('');
        setRegisterSuccessMessage(`Serial number ${cleanSerial} successfully registered into inventory!`);
        setSearchQuery(cleanSerial);
        handleSearch(undefined, cleanSerial);
      } else {
        setRegisterError(res.data?.error || 'Failed to register serial number');
      }
    } catch (err: any) {
      setRegisterError(err.response?.data?.error || 'Failed to register serial number. It may already exist.');
    } finally {
      setIsRegistering(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Track a Serial Number
          </h2>
        </div>
        {canRegister && (
          <button
            onClick={() => {
              setRegisterError(null);
              setShowRegisterModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Register Serial Number
          </button>
        )}
      </div>

      {registerSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{registerSuccessMessage}</span>
          </div>
          <button
            onClick={() => setRegisterSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Global Search Bar */}
      <Card className="p-4">
        <form onSubmit={(e) => handleSearch(e)} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter exact serial number (e.g. SN-GW10K-771201, SN-PYL-355-11001)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-solar-500 font-mono text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-2.5 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            {isSearching ? 'Searching...' : 'Track Serial'}
          </button>
        </form>
      </Card>

      {searchError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-medium">
          {searchError}
        </div>
      )}

      {/* Serial Details and Lifecycle Timeline */}
      {historyData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product & Status Card */}
          <Card title="Product & Asset Profile" className="h-fit">
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-solar-50 dark:bg-solar-950/50 rounded-xl border border-solar-200 dark:border-solar-800">
                <span className="text-[10px] text-solar-700 dark:text-solar-400 font-bold uppercase tracking-wider">
                  Serial Number
                </span>
                <p className="text-sm font-mono font-black text-gray-900 dark:text-white">
                  {historyData.serial.serial_no}
                </p>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px]">Product:</span>
                <p className="font-bold text-gray-900 dark:text-white text-sm">
                  {historyData.serial.product?.name}
                </p>
                <p className="text-gray-500">
                  Brand: {historyData.serial.product?.brand?.name} • Model: {historyData.serial.product?.model_number || 'N/A'}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-gray-400">Current Asset Status:</span>
                <Badge
                  variant={
                    historyData.serial.status === 'INSTALLED' || historyData.serial.status === 'SOLD'
                      ? 'success'
                      : historyData.serial.status === 'DEFECTIVE'
                      ? 'danger'
                      : 'info'
                  }
                >
                  {historyData.serial.status}
                </Badge>
              </div>

              {historyData.customer && (
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 block text-[11px]">Assigned Customer:</span>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {historyData.customer.name}
                  </p>
                  <p className="text-gray-500">{historyData.customer.phone}</p>
                  <p className="text-gray-400 text-[10px]">{historyData.customer.address}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Right: Chronological Lifecycle History Timeline (2 Cols) */}
          <Card
            title="Complete Lifecycle History Timeline"
            subtitle="Full chronological trace from purchase inwards to warranty claims"
            className="lg:col-span-2"
          >
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-slate-800">
              {historyData.timeline?.map((item: any, idx: number) => (
                <div key={idx} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-solar-600 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-solar-600"></div>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {formatDate(item.date)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Standalone Serial Number Registration Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => {
          if (!isRegistering) {
            setShowRegisterModal(false);
            setRegisterError(null);
          }
        }}
        title="Register Serial Number (Inward Unit)"
        maxWidth="md"
      >
        <form onSubmit={handleRegisterSerial} className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Directly register an individual serialized item (solar inverter, battery, or panel) into shop stock.
          </p>

          {registerError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium">
              {registerError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Select Product <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-solar-500 text-gray-900 dark:text-white font-medium"
              required
            >
              <option value="">-- Choose Product --</option>
              {products.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name} {prod.model_number ? `(${prod.model_number})` : ''} {prod.is_serialized ? '★ Serialized' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Variant / Model Option
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-solar-500 text-gray-900 dark:text-white font-medium"
              >
                <option value="">Default / Base</option>
                {selectedProduct.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.sku})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Serial Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={regSerialNo}
                onChange={(e) => setRegSerialNo(e.target.value)}
                placeholder="Scan or type serial number (e.g. SN-INV-10K-0091)"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-solar-500 text-gray-900 dark:text-white uppercase"
                required
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Barcode scanner inputs are automatically supported.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Receiving Notes (Optional)
            </label>
            <textarea
              value={regNotes}
              onChange={(e) => setRegNotes(e.target.value)}
              placeholder="e.g. Direct inward stock, warranty replacement received, verified intact..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-solar-500 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isRegistering}
              onClick={() => {
                setShowRegisterModal(false);
                setRegisterError(null);
              }}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRegistering || !regSerialNo.trim() || !selectedProductId}
              className="px-4 py-2 text-xs font-bold bg-solar-600 hover:bg-solar-700 text-white rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isRegistering ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registering...
                </>
              ) : (
                'Register In Stock'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};