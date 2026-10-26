import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, CheckCircle, Wrench, Clock, FileText, Edit3, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { WarrantyClaim, Warranty } from '../../types';
import { useAuthStore } from '../../stores/authStore';

export const ClaimsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);

  // New Claim Form
  const [warrantyId, setWarrantyId] = useState('');
  const [complaint, setComplaint] = useState('');
  const [claimType, setClaimType] = useState('REPAIR');
  const [technician, setTechnician] = useState('');

  // Resolution Form
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED');
  const [diagnosis, setDiagnosis] = useState('');
  const [repairDetails, setRepairDetails] = useState('');
  const [replacementSerial, setReplacementSerial] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  // Admin Edit Claim
  const [editingClaim, setEditingClaim] = useState<WarrantyClaim | null>(null);
  const [showEditClaimModal, setShowEditClaimModal] = useState(false);
  const [editClaimType, setEditClaimType] = useState('REPAIR');
  const [editComplaint, setEditComplaint] = useState('');
  const [editTechnician, setEditTechnician] = useState('');
  const [editClaimStatus, setEditClaimStatus] = useState('RECEIVED');
  const [editClaimDiagnosis, setEditClaimDiagnosis] = useState('');
  const [editClaimRepairDetails, setEditClaimRepairDetails] = useState('');
  const [editClaimPartsUsed, setEditClaimPartsUsed] = useState('');
  const [editClaimReplacementSerial, setEditClaimReplacementSerial] = useState('');
  const [editServiceCost, setEditServiceCost] = useState<number>(0);
  const [editWarrantyCost, setEditWarrantyCost] = useState<number>(0);
  const [editClaimResolution, setEditClaimResolution] = useState('');
  const [isUpdatingClaim, setIsUpdatingClaim] = useState(false);

  // Admin Delete Claim
  const [deletingClaim, setDeletingClaim] = useState<WarrantyClaim | null>(null);
  const [isDeletingClaim, setIsDeletingClaim] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cRes, wRes] = await Promise.all([api.get('/claims'), api.get('/warranties')]);
      if (cRes.data?.success) setClaims(cRes.data.data);
      if (wRes.data?.success) setWarranties(wRes.data.data);
    } catch (e) {
      console.error('Failed to load claims', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = warranties.find((w) => w.id === warrantyId);
    if (!w) return alert('Select a warranty');

    try {
      const res = await api.post('/claims', {
        warranty_id: w.id,
        customer_id: w.customer_id,
        serial_number_id: w.serial_number_id,
        complaint,
        claim_type: claimType,
        assigned_technician: technician,
      });

      if (res.data?.success) {
        setShowAddModal(false);
        setComplaint('');
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to file claim');
    }
  };

  const handleResolveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;

    try {
      const res = await api.put(`/claims/${selectedClaim.id}`, {
        status: resolutionStatus,
        diagnosis,
        repair_details: repairDetails,
        replacement_serial_no: replacementSerial || null,
        resolution: resolutionNote,
      });

      if (res.data?.success) {
        setShowResolveModal(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update claim');
    }
  };

  const handleOpenEditClaim = (c: WarrantyClaim) => {
    setEditingClaim(c);
    setEditClaimType(c.claim_type || 'REPAIR');
    setEditComplaint(c.complaint || '');
    setEditTechnician(c.assigned_technician || '');
    setEditClaimStatus(c.status || 'RECEIVED');
    setEditClaimDiagnosis(c.diagnosis || '');
    setEditClaimRepairDetails(c.repair_details || '');
    setEditClaimPartsUsed(c.parts_used || '');
    setEditClaimReplacementSerial(c.replacement_serial_no || '');
    setEditServiceCost(c.service_cost || 0);
    setEditWarrantyCost(c.warranty_cost || 0);
    setEditClaimResolution(c.resolution || '');
    setShowEditClaimModal(true);
  };

  const handleUpdateClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClaim) return;
    setIsUpdatingClaim(true);
    try {
      const res = await api.put(`/claims/${editingClaim.id}`, {
        claim_type: editClaimType,
        complaint: editComplaint,
        assigned_technician: editTechnician,
        status: editClaimStatus,
        diagnosis: editClaimDiagnosis,
        repair_details: editClaimRepairDetails,
        parts_used: editClaimPartsUsed,
        replacement_serial_no: editClaimReplacementSerial || null,
        service_cost: editServiceCost,
        warranty_cost: editWarrantyCost,
        resolution: editClaimResolution,
      });
      if (res.data?.success) {
        setShowEditClaimModal(false);
        setEditingClaim(null);
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update claim');
    } finally {
      setIsUpdatingClaim(false);
    }
  };

  const handleConfirmDeleteClaim = async () => {
    if (!deletingClaim) return;
    setIsDeletingClaim(true);
    try {
      const res = await api.delete(`/claims/${deletingClaim.id}`);
      if (res.data?.success) {
        setDeletingClaim(null);
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete warranty claim');
    } finally {
      setIsDeletingClaim(false);
    }
  };

  const columns: Column<WarrantyClaim>[] = [
    {
      key: 'claim_no',
      header: 'Claim #',
      render: (c) => <span className="font-bold text-gray-900 dark:text-white">{c.claim_no}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (c) => (
        <div>
          <p className="font-bold">{c.customer?.name}</p>
          <p className="text-[10px] text-gray-400">{c.customer?.phone}</p>
        </div>
      ),
    },
    {
      key: 'claim_type',
      header: 'Type',
      render: (c) => <Badge variant="info">{c.claim_type}</Badge>,
    },
    {
      key: 'complaint',
      header: 'Complaint Problem',
      render: (c) => <p className="text-xs text-gray-700 dark:text-gray-300 max-w-xs truncate">{c.complaint}</p>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => {
        const variants: any = {
          RECEIVED: 'warning',
          INSPECTING: 'info',
          APPROVED: 'dealer',
          RESOLVED: 'success',
          CLOSED: 'default',
          REJECTED: 'danger',
        };
        return <Badge variant={variants[c.status] || 'default'}>{c.status}</Badge>;
      },
    },
    {
      key: 'created_at',
      header: 'Filed Date',
      render: (c) => formatDate(c.created_at),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedClaim(c);
              setDiagnosis(c.diagnosis || '');
              setRepairDetails(c.repair_details || '');
              setResolutionNote(c.resolution || '');
              setShowResolveModal(true);
            }}
            className="px-2.5 py-1 bg-solar-50 dark:bg-solar-950/50 hover:bg-solar-600 hover:text-white text-solar-700 dark:text-solar-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Manage RMA
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                title="Edit Claim (Admin Only)"
                onClick={() => handleOpenEditClaim(c)}
                className="p-1.5 bg-solar-50 dark:bg-solar-950/50 hover:bg-solar-100 dark:hover:bg-solar-900/50 text-solar-600 dark:text-solar-400 rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Delete Claim (Admin Only)"
                onClick={() => setDeletingClaim(c)}
                className="p-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
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
            Warranty Claims & RMA Processing
          </h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>+ File Warranty Claim</span>
        </button>
      </div>

      <DataTable
        data={claims}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search claim #, customer, serial number..."
        searchField={(c) => `${c.claim_no} ${c.customer?.name} ${c.complaint}`}
      />

      {/* File Claim Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="File Warranty Claim"
        maxWidth="md"
      >
        <form onSubmit={handleCreateClaim} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Active Warranty Certificate *</label>
            <select
              required
              value={warrantyId}
              onChange={(e) => setWarrantyId(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
            >
              <option value="">-- Choose Warranty --</option>
              {warranties.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.warranty_no} — SN: {w.serial_number?.serial_no} ({w.customer?.name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Claim Type</label>
              <select
                value={claimType}
                onChange={(e) => setClaimType(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
              >
                <option value="REPAIR">Site Repair</option>
                <option value="REPLACEMENT">Replacement (RMA)</option>
                <option value="INSPECTION">Inspection & Diagnosis</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Assigned Technician</label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="e.g. Engr. Usman"
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Customer Complaint Details *</label>
            <textarea
              required
              rows={3}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Describe error code, tripping behavior, or customer complaint..."
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md mt-2"
          >
            Submit Claim
          </button>
        </form>
      </Modal>

      {/* Resolve / Manage RMA Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title={`Manage RMA Claim — #${selectedClaim?.claim_no}`}
        maxWidth="md"
      >
        {selectedClaim && (
          <form onSubmit={handleResolveClaim} className="space-y-3 text-xs">
            <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border">
              <p className="font-bold text-gray-900 dark:text-white">
                Complaint: {selectedClaim.complaint}
              </p>
              <p className="text-gray-400 mt-1">Client: {selectedClaim.customer?.name}</p>
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Lifecycle Status</label>
              <select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl font-bold"
              >
                <option value="INSPECTING">Under Inspection</option>
                <option value="APPROVED">Approved for Replacement</option>
                <option value="RESOLVED">Resolved & Repaired</option>
                <option value="CLOSED">Closed</option>
                <option value="REJECTED">Rejected (Out of Scope)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Diagnosis Findings</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Surge protector tripped, logic board burnt"
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                Replacement Serial Number (If Swapped)
              </label>
              <input
                type="text"
                value={replacementSerial}
                onChange={(e) => setReplacementSerial(e.target.value)}
                placeholder="e.g. SN-GW10K-771203"
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Final Resolution Remarks</label>
              <textarea
                rows={2}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Summary of actions taken..."
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md mt-2"
            >
              Update Claim Record
            </button>
          </form>
        )}
      </Modal>

      {/* Edit Claim Modal (Admin Only) */}
      <Modal
        isOpen={showEditClaimModal}
        onClose={() => setShowEditClaimModal(false)}
        title="Edit Warranty Claim Details (Admin Only)"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateClaimSubmit} className="space-y-3 text-xs">
          <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl space-y-1">
            <p className="font-bold text-gray-900 dark:text-white">Claim #{editingClaim?.claim_no}</p>
            <p className="text-gray-500">Customer: {editingClaim?.customer?.name} ({editingClaim?.customer?.phone})</p>
            <p className="text-gray-500">Equipment: {editingClaim?.warranty?.serial_number?.product?.name || 'Covered Unit'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Claim Type</label>
              <select
                value={editClaimType}
                onChange={(e) => setEditClaimType(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-medium"
              >
                <option value="REPAIR">REPAIR</option>
                <option value="REPLACEMENT">REPLACEMENT</option>
                <option value="INSPECTION">INSPECTION</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Lifecycle Status</label>
              <select
                value={editClaimStatus}
                onChange={(e) => setEditClaimStatus(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="RECEIVED">RECEIVED</option>
                <option value="INSPECTING">INSPECTING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Complaint Problem Description *</label>
            <textarea
              rows={2}
              required
              value={editComplaint}
              onChange={(e) => setEditComplaint(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Assigned Technician</label>
              <input
                type="text"
                value={editTechnician}
                onChange={(e) => setEditTechnician(e.target.value)}
                placeholder="Technician name..."
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Replacement Serial (If Swapped)</label>
              <input
                type="text"
                value={editClaimReplacementSerial}
                onChange={(e) => setEditClaimReplacementSerial(e.target.value)}
                placeholder="Serial number..."
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Diagnosis Findings</label>
            <input
              type="text"
              value={editClaimDiagnosis}
              onChange={(e) => setEditClaimDiagnosis(e.target.value)}
              placeholder="Diagnosis details..."
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Service Cost (Rs.)</label>
              <input
                type="number"
                min="0"
                value={editServiceCost}
                onChange={(e) => setEditServiceCost(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">Warranty Cost (Rs.)</label>
              <input
                type="number"
                min="0"
                value={editWarrantyCost}
                onChange={(e) => setEditWarrantyCost(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Final Resolution Remarks</label>
            <textarea
              rows={2}
              value={editClaimResolution}
              onChange={(e) => setEditClaimResolution(e.target.value)}
              placeholder="Resolution remarks..."
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingClaim}
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md mt-2 cursor-pointer transition-colors"
          >
            {isUpdatingClaim ? 'Saving Changes...' : 'Update Warranty Claim'}
          </button>
        </form>
      </Modal>

      {/* Delete Claim Confirmation (Admin Only) */}
      <ConfirmDialog
        isOpen={!!deletingClaim}
        title="Delete Warranty Claim"
        message="Are you sure you want to delete this warranty claim record? This action cannot be undone."
        variant="danger"
        confirmLabel="Yes, Delete Claim"
        cancelLabel="Cancel"
        isLoading={isDeletingClaim}
        onConfirm={handleConfirmDeleteClaim}
        onClose={() => setDeletingClaim(null)}
        details={[
          { label: 'Claim #', value: deletingClaim?.claim_no || '' },
          { label: 'Customer', value: deletingClaim?.customer?.name || '' },
          { label: 'Status', value: deletingClaim?.status || '' },
          { label: 'Complaint', value: deletingClaim?.complaint || '' },
        ]}
      />
    </div>
  );
};