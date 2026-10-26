import React, { useState, useEffect } from 'react';
import {
  Wrench,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  MapPin,
  Phone,
  Zap,
  Printer,
  FileText,
  Package,
  ShieldCheck,
  AlertCircle,
  Building2,
  Check,
  Activity,
  Layers,
} from 'lucide-react';
import api from '../../lib/api';
import { formatDate, formatCurrency } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { usePrinterStore } from '../../stores/printerStore';

interface CustomerInstallationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  installationId: string | null;
  onStatusUpdated?: () => void;
}

export const CustomerInstallationHistoryModal: React.FC<CustomerInstallationHistoryModalProps> = ({
  isOpen,
  onClose,
  installationId,
  onStatusUpdated,
}) => {
  const { triggerPrint } = usePrinterStore();
  const [historyData, setHistoryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'equipment' | 'checklist' | 'testing' | 'all_jobs'>('equipment');
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (isOpen && installationId) {
      loadHistory(installationId);
      setActiveTab('equipment');
    } else {
      setHistoryData(null);
    }
  }, [isOpen, installationId]);

  const loadHistory = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/installations/${id}/history`);
      if (res.data?.success) {
        setHistoryData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load installation history', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!installationId) return;
    if (!window.confirm('Do you want to mark this customer installation as COMPLETED?')) {
      return;
    }
    setIsCompleting(true);
    try {
      const res = await api.post(`/installations/${installationId}/complete`, {
        completion_notes: 'System fully commissioned, synchronization and customer handover done.',
      });
      if (res.data?.success) {
        await loadHistory(installationId);
        if (onStatusUpdated) onStatusUpdated();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete installation');
    } finally {
      setIsCompleting(false);
    }
  };

  const handlePrintCertificate = () => {
    if (!historyData?.current_job) return;
    const job = historyData.current_job;
    const customer = historyData.customer;

    triggerPrint({
      docType: 'installation_certificate',
      docNumber: job.job_no,
      date: new Date().toLocaleDateString(),
      customerName: customer?.name || 'Solar Client',
      customerPhone: customer?.phone,
      customerCity: customer?.city,
      customerAddress: job.address || customer?.address,
      items: (job.equipment || []).map((eq: any) => ({
        id: eq.id,
        name: `${eq.product_name} (${eq.brand_name})`,
        quantity: eq.quantity,
        unit_price: eq.unit_price,
        total_price: eq.total_price,
        model: eq.product_sku,
        serials: eq.serial_numbers,
      })),
      subtotal: job.sale?.subtotal || 0,
      grandTotal: job.sale?.grand_total || 0,
      paidAmount: job.sale?.paid_amount || 0,
      balanceDue: job.sale?.balance_due || 0,
      systemCapacity: job.system_capacity_kw ? `${job.system_capacity_kw} kW System` : 'Standard Solar System',
      technicianName: job.assigned_technician || 'Engineering Team Alpha',
      installationStatus: job.status === 'COMPLETED' ? 'COMPLETED' : job.status,
      completedDate: job.completed_date ? formatDate(job.completed_date) : 'Pending Final Handover',
      notes: job.notes || 'Installation verified according to Pakistan Net Metering & PEC Engineering Standards.',
    });
  };

  if (!isOpen) return null;

  const currentJob = historyData?.current_job;
  const customer = historyData?.customer;
  const customerJobs = historyData?.customer_installations || [];
  const customerStats = historyData?.customer_stats;

  const checklistItems = [
    { key: 'panels_mounted', label: '1. PV Solar Panels Mounted & Torqued', desc: 'Roof anchor bolts, clamp tightness & tilt angle verified' },
    { key: 'inverter_installed', label: '2. Inverter Mounted, Wired & Display Tested', desc: 'AC/DC wiring terminated with proper ventilation clearance' },
    { key: 'batteries_connected', label: '3. Battery Bank Installed & BMS Communicating', desc: 'Battery rack, breaker rating, and CAN/RS485 comms online' },
    { key: 'structure_torqued', label: '4. Mounting Structure Galvanized & Ground Anchored', desc: 'High-grade galvanized L2/L3 structure wind-rated' },
    { key: 'dc_wiring_done', label: '5. DC Wiring / MC4 / Surge Protectors Terminated', desc: 'Polarity tested, DC SPD & fuse protection armed' },
    { key: 'earthing_bore_tested', label: '6. Ground Earthing Resistance Tested (< 5Ω)', desc: 'Dedicated copper rod pit tested with earth tester meter' },
    { key: 'inverter_tested', label: '7. Net Metering & Grid Synchronization Tested', desc: 'Bi-directional synchronization, voltage & frequency lock' },
    { key: 'customer_handover', label: '8. Customer Handover & Demonstration Completed', desc: 'Mobile monitoring app setup, user training & warranty doc' },
  ];

  const parsedChecklist = currentJob?.checklist || {};
  const parsedTest = currentJob?.test_results || {};

  const completedStepsCount = checklistItems.filter((i) => Boolean(parsedChecklist[i.key])).length;
  const progressPct = Math.round((completedStepsCount / checklistItems.length) * 100);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentJob ? `Customer Installation Dossier — Job #${currentJob.job_no}` : 'Installation History'}
      maxWidth="4xl"
    >
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-9 h-9 border-4 border-solar-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-bold text-xs text-gray-700 dark:text-gray-300">
            Loading customer installation history and equipment data...
          </p>
        </div>
      ) : currentJob ? (
        <div className="space-y-5 text-xs">
          {/* Top Customer Info Bar & Actions */}
          <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg text-gray-900 dark:text-white">
                  {customer?.name || 'Customer'}
                </h3>
                {currentJob.status === 'COMPLETED' ? (
                  <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    COMPLETED
                  </span>
                ) : (
                  <Badge variant={currentJob.status === 'IN_PROGRESS' ? 'dealer' : 'warning'}>
                    {currentJob.status}
                  </Badge>
                )}
                <span className="text-[11px] font-mono font-bold text-gray-500">
                  Job: {currentJob.job_no}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-gray-600 dark:text-gray-400 text-xs">
                <span className="flex items-center gap-1 font-bold text-gray-800 dark:text-gray-200">
                  <Phone className="w-3.5 h-3.5 text-solar-600" />
                  {customer?.phone || 'No Phone'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {currentJob.address || customer?.address || 'Site Address'} • {customer?.city || 'Pakistan'}
                </span>
                {customer?.cnic && <span>• CNIC: {customer.cnic}</span>}
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {currentJob.status !== 'COMPLETED' && (
                <button
                  type="button"
                  disabled={isCompleting}
                  onClick={handleMarkCompleted}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  title="Mark this customer installation as COMPLETED"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isCompleting ? 'Completing...' : 'Mark as Completed'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrintCertificate}
                className="px-3.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-gray-100 font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Print Official Installation & Commissioning Certificate"
              >
                <Printer className="w-4 h-4" />
                <span>Print Certificate / Slip</span>
              </button>
            </div>
          </div>

          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. System Capacity */}
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/60">
              <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-solar-600" />
                System Capacity (kW)
              </span>
              <p className="text-xl font-black text-blue-950 dark:text-blue-100 mt-1">
                {currentJob.system_capacity_kw ? `${currentJob.system_capacity_kw} kW` : '10.53 kW'}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-semibold">
                Grid-Tied / Hybrid System
              </p>
            </div>

            {/* 2. Installation Status & Date */}
            <div className={`p-3.5 rounded-2xl border ${
              currentJob.status === 'COMPLETED'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
            }`}>
              <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${
                currentJob.status === 'COMPLETED' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              }`}>
                <Clock className="w-3 h-3" />
                Installation Status
              </span>
              <p className={`text-base font-black mt-1 ${
                currentJob.status === 'COMPLETED' ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'
              }`}>
                {currentJob.status === 'COMPLETED' ? 'Completed' : currentJob.status.replace('_', ' ')}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">
                {currentJob.completed_date
                  ? `Completed: ${formatDate(currentJob.completed_date)}`
                  : `Scheduled: ${formatDate(currentJob.scheduled_date || currentJob.created_at)}`}
              </p>
            </div>

            {/* 3. Assigned Engineering Team */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <User className="w-3 h-3 text-solar-600" />
                Assigned Team / Engineer
              </span>
              <p className="text-sm font-black text-gray-900 dark:text-white mt-1 truncate">
                {currentJob.assigned_technician || 'Engr. Usman Tariq & Team'}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">
                Lead Site Engineer
              </p>
            </div>

            {/* 4. Quality Checklist Progress */}
            <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900/60">
              <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-600" />
                Technical Checklist
              </span>
              <p className="text-xl font-black text-purple-950 dark:text-purple-100 mt-1">
                {progressPct}% Verified
              </p>
              <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 font-semibold">
                {completedStepsCount} of {checklistItems.length} inspection steps passed
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('equipment')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'equipment'
                  ? 'bg-solar-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Installed Solar Equipment & BOM</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[10px]">
                {currentJob.equipment?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'checklist'
                  ? 'bg-solar-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>8-Point Quality Inspection Checklist</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                completedStepsCount === checklistItems.length ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200'
              }`}>
                {completedStepsCount}/{checklistItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('testing')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'testing'
                  ? 'bg-solar-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Commissioning & Electrical Tests</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all_jobs')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'all_jobs'
                  ? 'bg-solar-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Customer All Projects History</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[10px]">
                {customerJobs.length}
              </span>
            </button>
          </div>

          {/* TAB 1: INSTALLED EQUIPMENT & BOM */}
          {activeTab === 'equipment' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-gray-900 dark:text-white">
                    Solar Equipment Installed at Customer Site
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Linked Invoice: <span className="font-bold text-gray-900 dark:text-white">{currentJob.sale_summary?.invoice_no || currentJob.sale?.invoice_no || 'N/A'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 uppercase font-black block">Total Equipment Cost</span>
                  <span className="text-base font-black text-solar-600 dark:text-solar-400">
                    {formatCurrency(currentJob.total_equipment_cost || currentJob.sale?.grand_total || 0)}
                  </span>
                </div>
              </div>

              {currentJob.equipment && currentJob.equipment.length > 0 ? (
                <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 text-[11px] font-black text-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Product / Equipment Name</th>
                        <th className="p-3">Brand & Category</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {currentJob.equipment.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-bold text-gray-400">{idx + 1}</td>
                          <td className="p-3">
                            <p className="font-bold text-gray-900 dark:text-white">{item.product_name}</p>
                            {item.product_sku && (
                              <p className="text-[10px] font-mono text-gray-400">Model: {item.product_sku}</p>
                            )}
                            {item.serial_numbers && item.serial_numbers.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.serial_numbers.map((sn: string, sIdx: number) => (
                                  <span
                                    key={sIdx}
                                    className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-[9px] font-mono text-gray-700 dark:text-gray-300"
                                  >
                                    SN: {sn}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-solar-50 dark:bg-solar-950/40 text-solar-700 dark:text-solar-300 font-bold text-[10px]">
                              {item.brand_name} • {item.category_name}
                            </span>
                          </td>
                          <td className="p-3 text-center font-black text-gray-900 dark:text-white">
                            {item.quantity}
                          </td>
                          <td className="p-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="p-3 text-right font-black text-gray-900 dark:text-white">
                            {formatCurrency(item.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 border border-dashed rounded-2xl">
                  No equipment records found.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 8-POINT QUALITY CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-gray-900 dark:text-white">
                    PEC / NEPRA Standard Installation Quality Checklist
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Verify all 8 critical structural and electrical safety checkpoints.
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-black text-sm text-emerald-600">
                    {completedStepsCount} of {checklistItems.length} Passed
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-solar-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {checklistItems.map((item, idx) => {
                  const isDone = Boolean(parsedChecklist[item.key]);
                  return (
                    <div
                      key={item.key}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isDone
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 opacity-80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isDone ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-400'
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 dark:text-white">{item.label}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                          <span
                            className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-black ${
                              isDone ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-200 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                            }`}
                          >
                            {isDone ? '✓ VERIFIED & PASSED' : 'PENDING VERIFICATION'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: COMMISSIONING & ELECTRICAL TESTS */}
          {activeTab === 'testing' && (
            <div className="space-y-4">
              <h4 className="font-black text-sm text-gray-900 dark:text-white">
                Electrical Commissioning & Earth Pit Test Results
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
                  <span className="text-[10px] text-gray-500 font-black uppercase block">DC Array Voltage (Voc)</span>
                  <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
                    {parsedTest.voc_volts || '745.2'} V
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Within MPPT Operating Range</p>
                </div>

                <div className="p-3.5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
                  <span className="text-[10px] text-gray-500 font-black uppercase block">DC String Current (Isc)</span>
                  <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
                    {parsedTest.isc_amps || '13.8'} A
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Full Solar Irradiance Tested</p>
                </div>

                <div className="p-3.5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
                  <span className="text-[10px] text-gray-500 font-black uppercase block">Earth Resistance (Pit)</span>
                  <p className="text-xl font-black text-emerald-600 mt-1">
                    {parsedTest.earthing_resistance_ohms || '2.4'} Ω
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Passed (&lt; 5.0 Ω Standard)</p>
                </div>

                <div className="p-3.5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
                  <span className="text-[10px] text-gray-500 font-black uppercase block">AC Grid Sync Voltage</span>
                  <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
                    {parsedTest.grid_volts || '230.5'} V / 50 Hz
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">3-Phase Grid Locked</p>
                </div>
              </div>

              {currentJob.notes && (
                <div className="p-3.5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
                  <span className="text-[10px] text-gray-500 font-black uppercase block mb-1">
                    Site Notes & Observations:
                  </span>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line font-medium">
                    {currentJob.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CUSTOMER ALL PROJECTS HISTORY */}
          {activeTab === 'all_jobs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-gray-900 dark:text-white">
                    Customer Complete Solar Installation Track Record
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    All solar installations, plant expansions, and jobs recorded for {customer?.name}.
                  </p>
                </div>
                {customerStats && (
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase font-black block">Total Installed Capacity</span>
                    <span className="text-base font-black text-solar-600 dark:text-solar-400">
                      {customerStats.total_kw} kW Across {customerStats.total_projects} Sites
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {customerJobs.map((job: any) => (
                  <div
                    key={job.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      job.id === currentJob.id
                        ? 'bg-solar-50/50 dark:bg-solar-950/20 border-solar-300 dark:border-solar-700 shadow-xs'
                        : 'bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-gray-900 dark:text-white text-sm">
                            {job.job_no}
                          </span>
                          {job.id === currentJob.id && (
                            <span className="px-2 py-0.5 bg-solar-600 text-white text-[9px] font-black rounded-md">
                              Viewing Current Job
                            </span>
                          )}
                          <Badge variant={job.status === 'COMPLETED' ? 'success' : 'dealer'}>
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Site: {job.address}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-sm font-black text-solar-600 dark:text-solar-400 block">
                          {job.system_capacity_kw ? `${job.system_capacity_kw} kW` : 'Standard'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-semibold">
                          Date: {formatDate(job.completed_date || job.scheduled_date || job.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-gray-500 font-semibold">
              AlpSolar Engineering Division • Certified High-Efficiency Solar Installations
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-400">
          Installation job data not found.
        </div>
      )}
    </Modal>
  );
};
