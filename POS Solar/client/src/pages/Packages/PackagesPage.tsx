import React, { useEffect, useState } from 'react';
import { Boxes, Plus, Check, Zap, ArrowRight, Edit3, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SolarPackage } from '../../types';
import { useAuthStore } from '../../stores/authStore';

export const PackagesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'CEO';

  const [packages, setPackages] = useState<SolarPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Package Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCapacity, setCreateCapacity] = useState<number>(5);
  const [createType, setCreateType] = useState('ON_GRID');
  const [createPrice, setCreatePrice] = useState<number>(0);
  const [createDescription, setCreateDescription] = useState('');

  // Edit Package Modal (Admin Only)
  const [editingPkg, setEditingPkg] = useState<SolarPackage | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState<number>(0);
  const [editType, setEditType] = useState('ON_GRID');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDescription, setEditDescription] = useState('');

  // Delete Package Dialog (Admin Only)
  const [deletingPkg, setDeletingPkg] = useState<SolarPackage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      if (res.data?.success) {
        setPackages(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load packages', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/packages', {
        name: createName,
        capacity_kw: createCapacity,
        package_type: createType,
        base_price: createPrice,
        description: createDescription,
      });
      if (res.data?.success) {
        setShowCreateModal(false);
        setCreateName('');
        setCreateDescription('');
        setCreatePrice(0);
        fetchPackages();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create package');
    }
  };

  const handleOpenEdit = (pkg: SolarPackage) => {
    setEditingPkg(pkg);
    setEditName(pkg.name);
    setEditCapacity(pkg.capacity_kw);
    setEditType(pkg.package_type);
    setEditPrice(pkg.base_price);
    setEditDescription(pkg.description || '');
    setShowEditModal(true);
  };

  const handleUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkg) return;
    try {
      const res = await api.put(`/packages/${editingPkg.id}`, {
        name: editName,
        capacity_kw: editCapacity,
        package_type: editType,
        base_price: editPrice,
        description: editDescription,
      });
      if (res.data?.success) {
        setShowEditModal(false);
        setEditingPkg(null);
        fetchPackages();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update package');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPkg) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/packages/${deletingPkg.id}`);
      if (res.data?.success) {
        setDeletingPkg(null);
        fetchPackages();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete package');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Solar Packages
          </h2>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Package</span>
          </button>
        )}
      </div>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 bg-gray-200 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
          ))
        ) : packages.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-solar-50 dark:bg-slate-800 border border-solar-200 dark:border-slate-700 flex items-center justify-center text-solar-600 shadow-xs">
                <Boxes className="w-7 h-7 text-solar-600 dark:text-solar-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  No packages created yet
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Configure turnkey 5kW, 10kW or custom system packages with panels, inverters, and mounting kits.
                </p>
              </div>
            </div>
          </div>
        ) : (
          packages.map((pkg) => (
            <Card
              key={pkg.id}
              className="flex flex-col justify-between border-2 border-transparent hover:border-solar-500 transition-all shadow-sm hover:shadow-lg rounded-3xl relative"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="info" className="uppercase font-bold">
                      {pkg.package_type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xl font-black text-solar-600 dark:text-solar-400">
                      {pkg.capacity_kw} kW
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        title="Edit Package (Admin Only)"
                        onClick={() => handleOpenEdit(pkg)}
                        className="p-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-solar-100 dark:hover:bg-solar-900/50 text-gray-600 dark:text-gray-300 hover:text-solar-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete Package (Admin Only)"
                        onClick={() => setDeletingPkg(pkg)}
                        className="p-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-gray-600 dark:text-gray-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {pkg.name}
                </h3>
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mt-1 line-clamp-2">
                  {pkg.description || 'Complete turn-key solar system bundle.'}
                </p>

                {/* Pre-packaged Components */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
                  <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-wider">
                    Included Components:
                  </p>
                  <ul className="space-y-1.5 text-xs font-bold text-gray-900 dark:text-white">
                    {pkg.items?.map((it, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-solar-600 dark:text-solar-400 shrink-0 stroke-[3]" />
                        <span className="truncate">
                          <b className="font-black text-black dark:text-white">{it.default_quantity}x</b> {it.product?.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-gray-900 dark:text-white block uppercase tracking-wider">Base System Price</span>
                  <span className="text-lg font-black text-gray-900 dark:text-white">
                    {formatCurrency(pkg.base_price)}
                  </span>
                </div>
                <button
                  type="button"
                  className="px-3.5 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Use in Quote</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Package Modal (Admin Only) */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Solar Package"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePackage} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Package Name *</label>
            <input
              type="text"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. 15kW Commercial Standard Package"
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Capacity (kW) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={createCapacity}
                onChange={(e) => setCreateCapacity(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Package Type</label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                <option value="ON_GRID">On-Grid</option>
                <option value="HYBRID">Hybrid</option>
                <option value="OFF_GRID">Off-Grid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Base System Price (Rs.) *</label>
            <input
              type="number"
              required
              value={createPrice}
              onChange={(e) => setCreatePrice(Number(e.target.value))}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-solar-600"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              rows={3}
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Ideal for residential or light commercial net-metering..."
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
          >
            Create Solar Package
          </button>
        </form>
      </Modal>

      {/* Edit Package Modal (Admin Only) */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPkg(null);
        }}
        title="Edit Solar Package (Admin Only)"
        maxWidth="md"
      >
        <form onSubmit={handleUpdatePackage} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Package Name *</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Capacity (kW) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={editCapacity}
                onChange={(e) => setEditCapacity(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Package Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                <option value="ON_GRID">On-Grid</option>
                <option value="HYBRID">Hybrid</option>
                <option value="OFF_GRID">Off-Grid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Base System Price (Rs.) *</label>
            <input
              type="number"
              required
              value={editPrice}
              onChange={(e) => setEditPrice(Number(e.target.value))}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-solar-600"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
          >
            Update Package Details
          </button>
        </form>
      </Modal>

      {/* Delete Package Confirmation (Admin Only) */}
      <ConfirmDialog
        isOpen={!!deletingPkg}
        title="Delete Solar Package"
        message="Are you sure you want to permanently delete this turnkey solar package bundle? Quotations previously created will preserve their snapshot."
        variant="danger"
        confirmLabel="Yes, Delete Package"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingPkg(null)}
        details={[
          { label: 'Package Name', value: deletingPkg?.name || '' },
          { label: 'System Capacity', value: `${deletingPkg?.capacity_kw || 0} kW` },
          { label: 'Package Type', value: deletingPkg?.package_type?.replace('_', ' ') || '' },
          { label: 'Base Price', value: formatCurrency(deletingPkg?.base_price || 0) },
        ]}
      />
    </div>
  );
};