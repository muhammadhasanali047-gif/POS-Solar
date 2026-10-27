import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, X } from 'lucide-react';

export interface CreatableSelectOption {
  id: string;
  name: string;
  subtitle?: string;
}

interface CreatableSelectProps {
  label?: string;
  required?: boolean;
  value: string; // Could be an option ID or a custom string name
  onChange: (value: string, selectedOption?: CreatableSelectOption) => void;
  options: CreatableSelectOption[];
  placeholder?: string;
  className?: string;
  actionButton?: React.ReactNode;
}

export const CreatableSelect: React.FC<CreatableSelectProps> = ({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = '-- Choose or Type --',
  className = '',
  actionButton,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal display text when external value or options change
  useEffect(() => {
    if (!value) {
      setInputText('');
      return;
    }
    const matched = options.find((o) => o.id === value || o.name.toLowerCase() === value.toLowerCase());
    if (matched) {
      setInputText(matched.name);
    } else {
      setInputText(value);
    }
  }, [value, options]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If user typed something and closed without explicitly selecting, commit what they typed
        if (inputText.trim()) {
          const matched = options.find(
            (o) => o.name.toLowerCase() === inputText.trim().toLowerCase() || o.id === inputText.trim()
          );
          if (matched) {
            onChange(matched.id, matched);
          } else {
            onChange(inputText.trim());
          }
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [inputText, options, onChange]);

  // Filtered list
  const filteredOptions = options.filter((o) =>
    o.name.toLowerCase().includes(inputText.trim().toLowerCase())
  );

  const exactMatchExists = options.some(
    (o) => o.name.toLowerCase() === inputText.trim().toLowerCase()
  );

  const showCreateOption = inputText.trim().length > 0 && !exactMatchExists;

  const handleSelectOption = (opt: CreatableSelectOption) => {
    setInputText(opt.name);
    onChange(opt.id, opt);
    setIsOpen(false);
  };

  const handleSelectCustom = (customText: string) => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    setInputText(trimmed);
    onChange(trimmed);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputText('');
    onChange('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else if (showCreateOption && (highlightedIndex === filteredOptions.length || highlightedIndex === -1)) {
        handleSelectCustom(inputText);
      } else if (filteredOptions.length > 0) {
        handleSelectOption(filteredOptions[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {actionButton}
        </div>
      )}

      {/* Input / Combobox control */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          required={required && !value}
          value={inputText}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setInputText(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="w-full p-2.5 pr-14 text-xs font-medium bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs"
        />

        {/* Right Action Icons (Clear + Dropdown Chevron) */}
        <div className="absolute right-2 flex items-center gap-1">
          {inputText && (
            <button
              type="button"
              onClick={handleClear}
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
            title="Toggle dropdown"
            tabIndex={-1}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-emerald-600' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto py-1">
          {/* Create new option when typing custom text */}
          {showCreateOption && (
            <button
              type="button"
              onClick={() => handleSelectCustom(inputText)}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Add custom: <span className="font-bold underline">"{inputText.trim()}"</span>
              </span>
            </button>
          )}

          {/* Existing Options */}
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
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold'
                      : idx === highlightedIndex
                      ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate">{opt.name}</span>
                    {opt.subtitle && (
                      <span className="text-[10px] text-gray-400 truncate">{opt.subtitle}</span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                </button>
              );
            })
          ) : !showCreateOption ? (
            <div className="px-3 py-3 text-center text-xs text-gray-400">
              No matching options found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
