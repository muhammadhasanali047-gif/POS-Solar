import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { ChevronDown, Check, Plus, X, Lock, ShieldCheck, Settings2, Trash2 } from 'lucide-react';

export interface PaymentMethodOption {
  id: string;
  name: string;
  subtitle?: string;
  isCustom?: boolean;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'CASH', name: 'Cash', subtitle: 'Standard cash on hand' },
  { id: 'BANK_TRANSFER', name: 'Bank Transfer', subtitle: 'Direct bank / IBAN transfer' },
  { id: 'CHEQUE', name: 'Cheque', subtitle: 'Bank cheque payment' },
  { id: 'ONLINE', name: 'Online Transfer', subtitle: 'Digital wallet / Raast / Online' },
];

const STORAGE_KEY = 'solar_custom_payment_methods';

export interface PaymentMethodSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  showLabel?: boolean;
}

export const PaymentMethodSelect: React.FC<PaymentMethodSelectProps> = ({
  label = 'Payment Method',
  value,
  onChange,
  className = '',
  required = false,
  showLabel = true,
}) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'CEO';

  const [customMethods, setCustomMethods] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['Meezan Bank', 'HBL', 'JazzCash', 'EasyPaisa'];
    } catch {
      return ['Meezan Bank', 'HBL', 'JazzCash', 'EasyPaisa'];
    }
  });

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newMethodInput, setNewMethodInput] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Combine default + custom methods
  const allOptions: PaymentMethodOption[] = [
    ...DEFAULT_PAYMENT_METHODS,
    ...customMethods.map((m) => ({
      id: m,
      name: m,
      subtitle: 'Custom payment option',
      isCustom: true,
    })),
  ];

  // Sync input text with current value
  useEffect(() => {
    if (!value) {
      setInputText('');
      return;
    }
    const matched = allOptions.find(
      (o) => o.id.toLowerCase() === value.toLowerCase() || o.name.toLowerCase() === value.toLowerCase()
    );
    if (matched) {
      setInputText(matched.name);
    } else {
      setInputText(value);
    }
  }, [value, customMethods]);

  // Persist custom methods
  const saveCustomMethods = (newList: string[]) => {
    setCustomMethods(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch (e) {
      console.error('Failed to save custom payment methods to localStorage', e);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (isAdmin && inputText.trim()) {
          const matched = allOptions.find(
            (o) => o.name.toLowerCase() === inputText.trim().toLowerCase() || o.id === inputText.trim()
          );
          if (matched) {
            onChange(matched.id);
          } else {
            // Commit typed custom string
            handleCreateAndSelect(inputText.trim());
          }
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [inputText, allOptions, isAdmin]);

  const handleCreateAndSelect = (customName: string) => {
    const trimmed = customName.trim();
    if (!trimmed) return;

    // Check if it's already in custom methods or defaults
    const existsInDefaults = DEFAULT_PAYMENT_METHODS.some(
      (m) => m.name.toLowerCase() === trimmed.toLowerCase() || m.id.toLowerCase() === trimmed.toLowerCase()
    );
    const existsInCustom = customMethods.some((m) => m.toLowerCase() === trimmed.toLowerCase());

    if (!existsInDefaults && !existsInCustom) {
      const updated = [...customMethods, trimmed];
      saveCustomMethods(updated);
    }

    setInputText(trimmed);
    onChange(trimmed);
    setIsOpen(false);
  };

  const handleDeleteCustomMethod = (methodToDelete: string) => {
    const updated = customMethods.filter((m) => m !== methodToDelete);
    saveCustomMethods(updated);
    if (value === methodToDelete) {
      onChange('CASH');
    }
  };

  const handleAddNewFromModal = () => {
    const trimmed = newMethodInput.trim();
    if (!trimmed) return;
    if (!customMethods.includes(trimmed)) {
      saveCustomMethods([...customMethods, trimmed]);
    }
    setNewMethodInput('');
  };

  // Filtered options based on user typing
  const filteredOptions = allOptions.filter((o) =>
    o.name.toLowerCase().includes(inputText.trim().toLowerCase())
  );

  const exactMatchExists = allOptions.some(
    (o) => o.name.toLowerCase() === inputText.trim().toLowerCase()
  );

  const showCreateOption = isAdmin && inputText.trim().length > 0 && !exactMatchExists;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isAdmin) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    const totalItems = filteredOptions.length + (showCreateOption ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const selected = filteredOptions[highlightedIndex];
        setInputText(selected.name);
        onChange(selected.id);
        setIsOpen(false);
      } else if (showCreateOption && (highlightedIndex === filteredOptions.length || highlightedIndex === -1)) {
        handleCreateAndSelect(inputText);
      } else if (filteredOptions.length > 0) {
        const selected = filteredOptions[0];
        setInputText(selected.name);
        onChange(selected.id);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Label and Role Permission Indicator */}
      {showLabel && (
        <div className="flex items-center justify-between mb-1 gap-1">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>

          <div className="flex items-center gap-1.5">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                <ShieldCheck className="w-2.5 h-2.5" />
                Admin Edit
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60"
                title="Only Admin has permission to edit payment methods"
              >
                <Lock className="w-2.5 h-2.5" />
                Admin Only
              </span>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsManageModalOpen(true)}
                className="p-1 text-gray-400 hover:text-solar-600 dark:hover:text-solar-400 transition-colors rounded"
                title="Manage Custom Payment Methods"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input / Combobox */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={!isAdmin}
          value={inputText}
          placeholder={isAdmin ? 'Type or choose payment method...' : 'Default Payment Method (Locked)'}
          onFocus={() => {
            if (isAdmin) setIsOpen(true);
          }}
          onChange={(e) => {
            if (!isAdmin) return;
            setInputText(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          title={!isAdmin ? 'Payment Method is locked. Only Admin can edit this dropdown.' : 'Click to select or type a custom payment method'}
          className={`w-full p-2.5 pr-14 text-xs font-semibold rounded-xl border transition-all shadow-xs ${
            !isAdmin
              ? 'bg-gray-100 dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 cursor-not-allowed select-none'
              : 'bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-solar-500/20 focus:border-solar-500 cursor-text'
          }`}
        />

        {/* Action icons */}
        <div className="absolute right-2 flex items-center gap-1">
          {!isAdmin ? (
            <div
              className="p-1 text-amber-600 dark:text-amber-400"
              title="Locked: Only Admin / CEO can edit this dropdown"
            >
              <Lock className="w-3.5 h-3.5" />
            </div>
          ) : (
            <>
              {inputText && (
                <button
                  type="button"
                  onClick={() => {
                    setInputText('');
                    onChange('');
                    setIsOpen(true);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-md"
                  title="Clear"
                  tabIndex={-1}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(!isOpen);
                  if (!isOpen && inputRef.current) inputRef.current.focus();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-md"
                title="Toggle payment methods"
                tabIndex={-1}
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-solar-600' : ''
                  }`}
                />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Non-admin helper text */}
      {!isAdmin && (
        <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400/90 font-medium flex items-center gap-1">
          <Lock className="w-2.5 h-2.5 flex-shrink-0" />
          <span>Ye dropdown sirf Admin ko edit karne ka option hai.</span>
        </p>
      )}

      {/* Dropdown Menu (Only opens for Admin) */}
      {isAdmin && isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto py-1">
          {/* Quick Create Custom Option */}
          {showCreateOption && (
            <button
              type="button"
              onClick={() => handleCreateAndSelect(inputText)}
              className="w-full text-left px-3 py-2 text-xs font-bold text-solar-700 dark:text-solar-400 bg-solar-50/80 dark:bg-solar-950/40 hover:bg-solar-100 dark:hover:bg-solar-900/50 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0 text-solar-600" />
              <span>
                Add custom payment method: <span className="underline">"{inputText.trim()}"</span>
              </span>
            </button>
          )}

          {/* List of Options */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected =
                value === opt.id ||
                opt.name.toLowerCase() === value.toLowerCase() ||
                opt.name.toLowerCase() === inputText.trim().toLowerCase();

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setInputText(opt.name);
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-solar-50 dark:bg-solar-950/40 text-solar-800 dark:text-solar-300 font-bold'
                      : idx === highlightedIndex
                      ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate flex items-center gap-1.5 font-semibold">
                      {opt.name}
                      {opt.isCustom && (
                        <span className="text-[9px] uppercase px-1 py-0.2 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded">
                          Custom
                        </span>
                      )}
                    </span>
                    {opt.subtitle && (
                      <span className="text-[10px] text-gray-400 truncate">{opt.subtitle}</span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-solar-600 flex-shrink-0" />}
                </button>
              );
            })
          ) : !showCreateOption ? (
            <div className="px-3 py-3 text-center text-xs text-gray-400">
              No matching payment methods found
            </div>
          ) : null}
        </div>
      )}

      {/* Admin Manage Payment Methods Modal */}
      {isAdmin && isManageModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-solar-50 dark:bg-solar-950 text-solar-600">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Manage Payment Methods
                  </h3>
                  <p className="text-[11px] text-gray-500">Only Admin can add, edit, or remove custom payment options</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Method Form */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Add New Payment Method
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Meezan Bank, JazzCash, Nayapay..."
                  value={newMethodInput}
                  onChange={(e) => setNewMethodInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewFromModal();
                    }
                  }}
                  className="flex-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-solar-500 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddNewFromModal}
                  disabled={!newMethodInput.trim()}
                  className="px-3 py-2 bg-solar-600 hover:bg-solar-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* List of Custom Methods */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                Saved Payment Methods
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {/* Standard Methods (Protected) */}
                {DEFAULT_PAYMENT_METHODS.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{m.name}</span>
                      <span className="text-[10px] text-gray-400">({m.subtitle})</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-medium">
                      Default
                    </span>
                  </div>
                ))}

                {/* Custom Methods (Deletable) */}
                {customMethods.map((cm) => (
                  <div
                    key={cm}
                    className="flex items-center justify-between p-2 rounded-xl bg-solar-50/40 dark:bg-solar-950/20 border border-solar-100 dark:border-solar-900/30 text-xs group"
                  >
                    <span className="font-bold text-gray-800 dark:text-gray-100">{cm}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomMethod(cm)}
                      className="p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      title={`Delete "${cm}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
