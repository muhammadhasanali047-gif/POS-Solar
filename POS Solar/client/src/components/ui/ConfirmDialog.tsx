import React from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

export interface ConfirmDetailItem {
  label: string;
  value: string | number | React.ReactNode;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: React.ReactNode | ConfirmDetailItem[];
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  details,
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleCancel = onClose || onCancel || (() => {});
  const resolvedConfirm = confirmLabel || confirmText || 'Confirm';
  const resolvedCancel = cancelLabel || cancelText || 'Cancel';
  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 w-full max-w-md overflow-hidden transform transition-all">
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-start gap-3 border-b border-gray-100 dark:border-slate-800/60">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDanger
                ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                : 'bg-solar-100 dark:bg-solar-950/50 text-solar-600 dark:text-solar-400'
            }`}
          >
            {isDanger ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details if provided */}
        {details && (
          <div className="px-5 py-3 bg-gray-50 dark:bg-slate-950/50 border-b border-gray-100 dark:border-slate-800/60 text-xs">
            {Array.isArray(details) ? (
              <div className="space-y-1.5">
                {details.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">{item.label}:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              details
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-solar-600 hover:bg-solar-700 shadow-solar-600/20'
            }`}
          >
            {isLoading ? 'Processing...' : resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
};
