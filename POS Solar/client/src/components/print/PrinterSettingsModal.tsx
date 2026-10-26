import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { usePrinterStore, PrinterSettings } from '../../stores/printerStore';
import { Printer, Check, Sliders, FileText, Zap } from 'lucide-react';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, triggerPrint } = usePrinterStore();
  const [formData, setFormData] = useState<PrinterSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (field: keyof PrinterSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleTestPrint = () => {
    updateSettings(formData);
    triggerPrint({
      docType: 'test',
      docNumber: `TEST-${Date.now().toString().slice(-4)}`,
      date: new Date().toLocaleString(),
      customerName: 'Muhammad Asif (Test Customer)',
      customerPhone: '+92 300 1234567',
      customerCity: 'Multan',
      items: [
        {
          name: 'Longi Hi-MO 6 585W Solar Panel',
          quantity: 1,
          unit_price: 18500,
          total_price: 18500,
        },
        {
          name: 'Inverex Nitrox 10kW Hybrid Inverter',
          quantity: 1,
          unit_price: 385000,
          total_price: 385000,
        },
      ],
      subtotal: 403500,
      discount: 3500,
      grandTotal: 400000,
      paidAmount: 100000,
      balanceDue: 300000,
      paymentMethod: 'CASH',
      notes: 'Printer connection test successful. Hardware communication active.',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Printer Connection & Slip Settings" maxWidth="lg">
      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {/* Top Notification / Banner */}
        <div className="p-3 bg-solar-50 dark:bg-solar-950/40 border border-solar-200 dark:border-solar-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-solar-600 text-white flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white">Printer Connection & Formats</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Configure your USB/Thermal POS printer or desktop A4 laser printer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestPrint}
            className="px-3 py-1.5 bg-solar-600 hover:bg-solar-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Test Print Now</span>
          </button>
        </div>

        {/* Detected Hardware Badge */}
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <div>
              <p className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                Detected Hardware: HP LaserJet Professional P1566
              </p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                Port: USB001 • Status: Normal • Windows Default Printer: Active
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold self-start sm:self-auto shrink-0">
            USB Connected
          </span>
        </div>

        {/* Banner Preview Card */}
        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-2xs">
          <div className="flex justify-between items-center px-1 pb-1 text-[10px] font-bold text-gray-500 dark:text-gray-400">
            <span>OFFICIAL SHOP BANNER ON PRINT:</span>
            <span className="text-solar-600">AlpSolar (Left) • J.I Energies (Right)</span>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-100 dark:border-slate-800 bg-white">
            <img
              src="/banner.png"
              alt="AlpSolar & J.I Energies Banner"
              className="w-full h-auto max-h-14 object-cover"
            />
          </div>
        </div>

        {/* Paper Size & Hardware Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Select Paper / Printer Type
            </label>
            <select
              value={formData.paperSize}
              onChange={(e) => handleChange('paperSize', e.target.value)}
              className="w-full p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold"
            >
              <option value="80mm">80mm Thermal Receipt (Standard POS)</option>
              <option value="58mm">58mm Thermal Receipt (Compact POS)</option>
              <option value="a4">A4 Standard Invoice (Laser / Inkjet)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Auto-Print on Invoice / Sale Save
            </label>
            <div className="flex items-center gap-3 mt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoPrintOnSave}
                  onChange={(e) => handleChange('autoPrintOnSave', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-solar-600"></div>
              </label>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {formData.autoPrintOnSave ? 'Enabled (Auto Print Immediately)' : 'Disabled (Manual Click)'}
              </span>
            </div>
          </div>
        </div>

        {/* Store Information */}
        <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-3">
          <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs">
            <Sliders className="w-3.5 h-3.5 text-solar-600" />
            Store Header Printed on Invoices & Receipts
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Business / Shop Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Contact Phones</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Shop Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              Tax / NTN / STRN Number (Optional)
            </label>
            <input
              type="text"
              value={formData.ntn}
              onChange={(e) => handleChange('ntn', e.target.value)}
              placeholder="e.g. NTN: 8945210-4"
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              Warranty & Return Terms (Printed at bottom)
            </label>
            <textarea
              rows={2}
              value={formData.terms}
              onChange={(e) => handleChange('terms', e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl resize-none font-mono text-[10px]"
            />
          </div>

          <div>
            <label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Footer Thank You Message</label>
            <input
              type="text"
              value={formData.footerNote}
              onChange={(e) => handleChange('footerNote', e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Settings Saved!</span>
              </>
            ) : (
              <span>Save Printer Configuration</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
