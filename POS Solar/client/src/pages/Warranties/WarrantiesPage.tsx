import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search, Filter, AlertTriangle, CheckCircle, Edit3, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Warranty } from '../../types';
import { useAuthStore } from '../../stores/authStore';

export const WarrantiesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Admin Edit Warranty
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
  const [showEditWarrantyModal, setShowEditWarrantyModal] = useState(false);
  const [editDurationMonths, setEditDurationMonths] = useState<number>(12);
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editEndDate, setEditEndDate] = useState('');
  const [editTerms, setEditTerms] = useState('');
  const [isUpdatingWarranty, setIsUpdatingWarranty] = useState(false);

  // Admin Delete Warranty
  const [deletingWarranty, setDeletingWarranty] = useState<Warranty | null>(null);
  const [isDeletingWarranty, setIsDeletingWarranty] = useState(false);

  useEffect(() => {
    loadWarranties();
  }, [filterStatus]);

  const loadWarranties = async () => {
    try {
      const url = filterStatus === 'ALL' ? '/warranties' : `/warranties?status=${filterStatus}`;
      const res = await api.get(url);
      if (res.data?.success) setWarranties(res.data.data);
    } catch (e) {
      console.error('Failed to load warranties', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditWarranty = (w: Warranty) => {
    setEditingWarranty(w);
    setEditDurationMonths(w.duration_months);
    setEditStatus(w.status);
    setEditEndDate(w.end_date ? new Date(w.end_date).toISOString().slice(0, 10) : '');
    setEditTerms(w.terms || '');
    setShowEditWarrantyModal(true);
  };

  const handleUpdateWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarranty) return;
    setIsUpdatingWarranty(true);
    try {
      const res = await api.put(`/warranties/${editingWarranty.id}`, {
        duration_months: editDurationMonths,
        status: editStatus,
        end_date: editEndDate ? new Date(editEndDate).toISOString() : undefined,
        terms: editTerms,
      });
      if (res.data?.success) {
        setShowEditWarrantyModal(false);
        setEditingWarranty(null);
        await loadWarranties();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update warranty certificate');
    } finally {
      setIsUpdatingWarranty(false);
    }
  };

  const handleConfirmDeleteWarranty = async () => {
    if (!deletingWarranty) return;
    setIsDeletingWarranty(true);
    try {
      const res = await api.delete(`/warranties/${deletingWarranty.id}`);
      if (res.data?.success) {
        setDeletingWarranty(null);
        await loadWarranties();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete warranty certificate');
    } finally {
      setIsDeletingWarranty(false);
    }
  };

  const columns: Column<Warranty>[] = [
    {
      key: 'warranty_no',
      header: 'Warranty #',
      render: (w) => <span className="font-bold text-gray-900 dark:text-white">{w.warranty_no}</span>,
    },
    {
      key: 'serial',
      header: 'Serial / Coverage Type',
      render: (w) =>
        w.serial_number?.serial_no ? (
          <span className="font-mono font-bold text-gray-900 dark:text-white">
            {w.serial_number.serial_no}
          </span>
        ) : (
          <Badge variant="default" className="font-bold text-gray-900 dark:text-white">
            ⚡ 25-Yr Performance Guarantee
          </Badge>
        ),
    },
    {
      key: 'product',
      header: 'Product & Model',
      render: (w) => {
        const prod = w.serial_number?.product || w.product;
        return (
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{prod?.name || 'Solar PV Equipment'}</p>
            <p className="text-[10px] text-gray-400">
              {w.warranty_type === 'PANEL_PERFORMANCE_25YR'
                ? 'Linear Power Output Guarantee (Year 25 >= 84.8%)'
                : `Brand: ${prod?.brand?.name || 'Verified Solar'}`}
            </p>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Registered Customer',
      render: (w) => (
        <div>
          <p className="font-bold">{w.customer?.name}</p>
          <p className="text-[10px] text-gray-400">{w.customer?.phone}</p>
        </div>
      ),
    },
    {
      key: 'duration_months',
      header: 'Duration',
      render: (w) => (
        <span className="font-bold text-gray-900 dark:text-white">
          {Math.round(w.duration_months / 12)} Years ({w.duration_months} Mo)
        </span>
      ),
    },
    {
      key: 'dynamic_status',
      header: 'Status',
      render: (w) => {
        const s = w.dynamic_status || w.status;
        const variants: any = {
          ACTIVE: 'success',
          EXPIRING_SOON: 'warning',
          EXPIRED: 'danger',
          CLAIMED: 'dealer',
          VOID: 'danger',
        };
        return <Badge variant={variants[s] || 'default'}>{s.replace('_', ' ')}</Badge>;
      },
    },
    {
      key: 'end_date',
      header: 'Expiry Date',
      render: (w) => formatDate(w.end_date),
    },
    ...(isAdmin
      ? ([
          {
            key: 'actions',
            header: 'Actions',
            render: (w: Warranty) => (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Edit Warranty (Admin Only)"
                  onClick={() => handleOpenEditWarranty(w)}
                  className="p-1.5 bg-solar-50 dark:bg-solar-950/50 hover:bg-solar-100 dark:hover:bg-solar-900/50 text-solar-600 dark:text-solar-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete Warranty (Admin Only)"
                  onClick={() => setDeletingWarranty(w)}
                  className="p-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ] as Column<Warranty>[])
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Warranties
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          {['ALL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterStatus === st
                  ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        data={warranties}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search warranty #, serial number, customer name..."
        searchField={(w) => `${w.warranty_no} ${w.serial_number?.serial_no} ${w.customer?.name}`}
        emptyTitle="No warranties found"
        emptyMessage="Warranties are automatically created and activated whenever serialized equipment is sold in POS."
      />

      {/* Edit Warranty Modal (Admin Only) */}
      <Modal
        isOpen={showEditWarrantyModal}
        onClose={() => setShowEditWarrantyModal(false)}
        title="Edit Warranty Certificate (Admin Only)"
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateWarranty} className="space-y-3">
          <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl text-xs space-y-1">
            <p className="font-bold text-gray-900 dark:text-white">Certificate: #{editingWarranty?.warranty_no}</p>
            <p className="text-gray-500">Customer: {editingWarranty?.customer?.name}</p>
            <p className="text-gray-500">
              Serial: {editingWarranty?.serial_number?.serial_no || 'Standard Coverage'}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Coverage Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-medium"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="VOID">VOID</option>
              <option value="CLAIMED">CLAIMED</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Duration (Months) *</label>
            <input
              type="number"
              min="1"
              required
              value={editDurationMonths}
              onChange={(e) => setEditDurationMonths(Number(e.target.value))}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Expiry Date</label>
            <input
              type="date"
              value={editEndDate}
              onChange={(e) => setEditEndDate(e.target.value)}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Warranty Terms / Notes</label>
            <textarea
              rows={2}
              value={editTerms}
              onChange={(e) => setEditTerms(e.target.value)}
              placeholder="Terms and conditions or notes..."
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingWarranty}
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold text-xs rounded-xl shadow-md mt-2 cursor-pointer transition-colors"
          >
            {isUpdatingWarranty ? 'Saving Changes...' : 'Update Warranty Certificate'}
          </button>
        </form>
      </Modal>

      {/* Delete Warranty Confirmation (Admin Only) */}
      <ConfirmDialog
        isOpen={!!deletingWarranty}
        title="Delete Warranty Certificate"
        message="Are you sure you want to delete this warranty certificate? Any associated claims will also be removed."
        variant="danger"
        confirmLabel="Yes, Delete Warranty"
        cancelLabel="Cancel"
        isLoading={isDeletingWarranty}
        onConfirm={handleConfirmDeleteWarranty}
        onClose={() => setDeletingWarranty(null)}
        details={[
          { label: 'Warranty #', value: deletingWarranty?.warranty_no || '' },
          { label: 'Customer', value: deletingWarranty?.customer?.name || '' },
          {
            label: 'Serial Number',
            value: deletingWarranty?.serial_number?.serial_no || 'Standard Coverage',
          },
          { label: 'Status', value: deletingWarranty?.status || 'ACTIVE' },
        ]}
      />
    </div>
  );
};