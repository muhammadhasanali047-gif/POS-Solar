import React, { useEffect, useState } from 'react';
import {
  Sun,
  Moon,
  Wifi,
  WifiOff,
  RefreshCw,
  Printer,
  Menu,
} from 'lucide-react';
import { useSyncStore } from '../../stores/syncStore';
import { useTheme } from '../../context/ThemeContext';
import { PrinterSettingsModal } from '../print/PrinterSettingsModal';

interface NavbarProps {
  currentTab?: string;
  onOpenPos?: () => void;
  onToggleMobileSidebar?: () => void;
}

const tabConfig: Record<string, { title: string; subtitle: string; badge?: string }> = {
  dashboard: { title: 'Overview', subtitle: 'Executive Dashboard & Real-Time Performance', badge: 'Live Metrics' },
  'quick-flow': { title: 'Quick Flow', subtitle: 'End-to-End Solar Business Operations', badge: 'Workflow' },
  pos: { title: 'Sales & POS', subtitle: 'Direct Equipment Billing & Cart', badge: 'Active Register' },
  quotations: { title: 'Quotations', subtitle: 'Customer Proposals & Project Estimates' },
  packages: { title: 'Solar Packages', subtitle: 'Pre-Packaged Systems & Equipment Bundles' },
  customers: { title: 'Customers CRM', subtitle: 'Client Database, Ledgers & Receivables' },
  products: { title: 'Product Catalog', subtitle: 'Panels, Inverters, Batteries & Structures' },
  inventory: { title: 'Inventory & Stock', subtitle: 'Warehouse Levels & Quantities' },
  serials: { title: 'Serial Tracking', subtitle: 'Barcode Verification & Movement' },
  suppliers: { title: 'Suppliers & Purchases', subtitle: 'Vendor Ledger & Inward Shipments' },
  installations: { title: 'Installations', subtitle: 'Site Visits & Project Execution' },
  warranties: { title: 'Warranties', subtitle: 'Equipment Coverage & Claims' },
  claims: { title: 'Warranty Claims', subtitle: 'RMA & Replacement Workflow' },
  settings: { title: 'System & Users', subtitle: 'Access Controls & Configurations' },
};

const StatusTooltip: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen((prev) => !prev)}
    >
      <div className="cursor-pointer">{children}</div>
      {isOpen && (
        <div className="absolute top-full mt-2.5 right-0 z-50 w-56 p-2.5 bg-gray-900 dark:bg-slate-800 text-white rounded-xl shadow-2xl border border-gray-700/80 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <p className="font-bold text-[11px] text-solar-400">{title}</p>
          <p className="text-[10px] text-gray-300 mt-1 leading-snug">{description}</p>
        </div>
      )}
    </div>
  );
};

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onToggleMobileSidebar }) => {
  const { isOnline, isSyncing, pendingCount, checkHealth, triggerSync } = useSyncStore();
  const { theme, toggleTheme } = useTheme();
  const [showPrinterModal, setShowPrinterModal] = useState(false);

  // Network health poller every 5 seconds
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const currentInfo = (currentTab && tabConfig[currentTab]) || tabConfig.dashboard;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-3 sm:px-5 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors select-none">
      {/* Left: Mobile hamburger menu & Overview / Section Title */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="p-1.5 -ml-1 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 lg:hidden transition-colors cursor-pointer shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0 select-none">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none truncate">
              {currentInfo.title}
            </h1>
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-0.5 truncate hidden xs:block">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Offline / Pending Sync Indicator */}
        {!isOnline ? (
          <StatusTooltip
            title="Offline"
            description="Working locally without internet. Changes will sync automatically when reconnected."
          >
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 text-xs font-medium">
              <WifiOff className="w-3.5 h-3.5 text-rose-600" />
              <span>Offline ({pendingCount} pending)</span>
            </div>
          </StatusTooltip>
        ) : isSyncing ? (
          <StatusTooltip
            title="Syncing..."
            description="Uploading offline transactions and stock movements to the central database."
          >
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-medium animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span>Syncing ({pendingCount})...</span>
            </div>
          </StatusTooltip>
        ) : pendingCount > 0 ? (
          <StatusTooltip
            title="Sync Pending"
            description="Click to upload offline queued transactions to the central database now."
          >
            <button
              type="button"
              onClick={triggerSync}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Wifi className="w-3.5 h-3.5 text-amber-600" />
              <span>{pendingCount} Pending Sync</span>
            </button>
          </StatusTooltip>
        ) : null}

        {/* Printer Connection & Settings Button */}
        <button
          type="button"
          onClick={() => setShowPrinterModal(true)}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-solar-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Connect Printer & Slip Settings"
        >
          <Printer className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>
      </div>

      <PrinterSettingsModal
        isOpen={showPrinterModal}
        onClose={() => setShowPrinterModal(false)}
      />
    </header>
  );
};

export default Navbar;
