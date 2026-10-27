import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  Barcode,
  FileText,
  Boxes,
  ShoppingCart,
  Users,
  Truck,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  X,
  User as UserIcon,
  LogOut,
  Printer,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../context/ThemeContext';
import { PrinterSettingsModal } from '../print/PrinterSettingsModal';

export type NavItemKey =
  | 'quick-flow'
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'serials'
  | 'quotations'
  | 'packages'
  | 'pos'
  | 'customers'
  | 'suppliers'
  | 'installations'
  | 'warranties'
  | 'claims'
  | 'expenses'
  | 'dealers'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItemConfig {
  key: NavItemKey;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
  isSharedDealer?: boolean;
}

interface NavSectionConfig {
  id: string;
  title: string;
  items: NavItemConfig[];
}

const STORAGE_KEY = 'solar_sidebar_sections_state';

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const role = user?.role || 'MANAGER';

  const isExecutive = role === 'ADMIN' || role === 'CEO';

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300';
      case 'CEO':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300';
      case 'CASHIER':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300';
      case 'MANAGER':
      default:
        return 'bg-solar-100 text-solar-800 dark:bg-solar-900/40 dark:text-solar-300 border-solar-300';
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'ADMIN':
        return 'Administrator';
      case 'CEO':
        return 'Executive CEO';
      case 'CASHIER':
        return 'Sales & Counter Staff';
      case 'MANAGER':
      default:
        return 'Operations Staff';
    }
  };

  const handleNavSelect = (tab: NavItemKey) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  // Section collapsible state with localStorage persistence
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      sales: true,
      inventory: true,
      service: true,
      admin: true,
    };
  });

  const toggleSection = (id: string) => {
    setSectionsOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // 5 Canonical Sections definitions
  const rawSections: NavSectionConfig[] = [
    {
      id: 'sales',
      title: 'Sales',
      items: [
        { key: 'quick-flow', label: 'Quick Flow', icon: Zap },
        { key: 'pos', label: 'Sales & POS', icon: ShoppingCart, badge: 'POS' },
        { key: 'quotations', label: 'Quotations', icon: FileText },
        { key: 'packages', label: 'Solar Packages', icon: Boxes },
        { key: 'customers', label: 'Customers CRM', icon: Users },
      ],
    },
    {
      id: 'inventory',
      title: 'Inventory',
      items: [
        { key: 'products', label: 'Product Catalog', icon: Package },
        { key: 'inventory', label: 'Inventory & Stock', icon: Layers },
        { key: 'serials', label: 'Track a Serial Number', icon: Barcode },
        { key: 'suppliers', label: 'Purchases & Suppliers', icon: Truck },
      ],
    },
    {
      id: 'service',
      title: 'Service',
      items: [
        { key: 'installations', label: 'Installations', icon: Wrench },
        { key: 'warranties', label: 'Warranties', icon: ShieldCheck },
        { key: 'claims', label: 'Warranty Claims', icon: AlertTriangle },
      ],
    },
    {
      id: 'admin',
      title: 'Admin',
      items: [{ key: 'settings', label: 'System & Users', icon: Settings }],
    },
  ];

  // Auto-redirect if tab is in removed finance section
  useEffect(() => {
    if (['expenses', 'dealers', 'reports'].includes(currentTab)) {
      onSelectTab('dashboard');
    }
  }, [currentTab, onSelectTab]);

  // Auto-redirect if user is on a restricted tab
  useEffect(() => {
    if (['expenses', 'dealers', 'reports'].includes(currentTab)) {
      onSelectTab('dashboard');
    } else if (!isExecutive && currentTab === 'settings') {
      onSelectTab('dashboard');
    }
  }, [isExecutive, currentTab, onSelectTab]);

  // Filter sections and items based on role
  const filteredSections: NavSectionConfig[] = rawSections
    .map((section) => {
      let filteredItems: NavItemConfig[] = [];

      if (!isExecutive) {
        // Staff members (Cashier, Sales Staff, Operations) see all operational tools
        // (Customer CRM, Quotations, POS, Packages, Catalog, Stock, Serials, Installations, Warranties)
        // Only Admin settings are restricted
        if (section.id !== 'admin') {
          filteredItems = section.items;
        }
      } else {
        // CEO & Admin see everything including System Settings
        filteredItems = section.items;
      }

      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter((section) => section.items.length > 0);

  // Auto-open section if the current tab is inside it
  useEffect(() => {
    for (const sec of filteredSections) {
      if (sec.items.some((i) => i.key === currentTab)) {
        if (!sectionsOpen[sec.id]) {
          setSectionsOpen((prev) => ({ ...prev, [sec.id]: true }));
        }
        break;
      }
    }
  }, [currentTab]);

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          title="Close navigation"
        />
      )}

      <aside
        className={`bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 flex flex-col select-none
          fixed inset-y-0 left-0 z-50 lg:static lg:z-20
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-56'}
        `}
      >
        {/* Top Brand Header with POS AlpSolar */}
        <div className="h-16 px-3 flex items-center justify-between border-b border-gray-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={() => handleNavSelect('dashboard')}
            className="flex-1 flex items-center text-left focus:outline-none group overflow-hidden"
            title="POS AlpSolar - Go to Dashboard"
          >
            {!isCollapsed ? (
              <div className="flex items-baseline text-[21px] font-black tracking-tight select-none">
                <span className="text-solar-600 dark:text-solar-400 mr-1.5">POS</span>
                <span className="text-solar-800 dark:text-white">Alp</span>
                <span className="text-solar-500">Solar</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center mx-auto text-center leading-none select-none">
                <span className="text-[10px] font-black text-solar-500 uppercase">POS</span>
                <span className="text-xs font-black text-solar-800 dark:text-white mt-0.5">AS</span>
              </div>
            )}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors lg:hidden shrink-0 ml-1"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0 ml-1 hidden lg:block"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-3 custom-scrollbar">
          {/* Always Visible: Dashboard button */}
          <div>
            <button
              type="button"
              onClick={() => handleNavSelect('dashboard')}
              className={`w-full group flex items-center px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all relative cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-solar-600 text-white shadow-sm font-semibold'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:text-black dark:hover:text-white'
              }`}
              title={isExecutive ? 'CEO Executive Overview' : 'Staff Operations Portal'}
            >
              {isCollapsed ? (
                <LayoutDashboard className="w-4 h-4 mx-auto" />
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">
                    {isExecutive ? 'Executive Overview' : 'Operations Portal'}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                      currentTab === 'dashboard'
                        ? 'bg-white/20 text-white'
                        : isExecutive
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {isExecutive ? 'CEO' : 'Staff'}
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* 5 Collapsible Sections */}
          {filteredSections.map((section) => {
            const isOpen = sectionsOpen[section.id] ?? true;
            const hasActiveChild = section.items.some((i) => i.key === currentTab);

            return (
              <div key={section.id} className="space-y-1">
                {/* Section Header */}
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] uppercase font-black tracking-wider text-gray-900 dark:text-white hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span className={hasActiveChild ? 'text-solar-600 dark:text-solar-400 font-black' : 'font-black'}>
                      {section.title}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-gray-900 dark:text-white transition-transform duration-200 ${
                        isOpen ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>
                ) : (
                  <div className="h-px bg-gray-100 dark:bg-slate-800 my-2" />
                )}

                {/* Section Items */}
                {(isOpen || isCollapsed) && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.key;

                      const itemClasses = `group flex items-center px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all relative w-full cursor-pointer ${
                        isActive
                          ? 'bg-solar-600 text-white shadow-sm font-semibold'
                          : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:text-black dark:hover:text-white'
                      }`;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleNavSelect(item.key)}
                          className={itemClasses}
                          title={item.label}
                        >
                          {isCollapsed ? (
                            <Icon className="w-4 h-4 mx-auto" />
                          ) : (
                            <div className="flex-1 text-left flex items-center justify-between">
                              <span className="truncate">{item.label}</span>
                              {item.badge && (
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    isActive
                                      ? 'bg-white/20 text-white'
                                      : 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white border border-gray-300 dark:border-slate-700'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Utility Options Under Admin: Printer & Dark Theme */}
          <div className="pt-2.5 mt-2 border-t border-gray-100 dark:border-slate-800 space-y-1">
            <button
              type="button"
              onClick={() => setShowPrinterModal(true)}
              className="group flex items-center px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all relative w-full cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:text-black dark:hover:text-white"
              title="Connect Printer & Slip Settings"
            >
              {isCollapsed ? (
                <Printer className="w-4 h-4 mx-auto text-gray-700 dark:text-gray-300 group-hover:text-solar-600" />
              ) : (
                <div className="flex-1 text-left flex items-center justify-between">
                  <span className="truncate flex items-center gap-2">
                    <Printer className="w-4 h-4 text-gray-700 dark:text-gray-300 group-hover:text-solar-600 shrink-0" />
                    <span>Printer Settings</span>
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white border border-gray-300 dark:border-slate-700 uppercase tracking-wider">
                    SLIP
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="group flex items-center px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all relative w-full cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:text-black dark:hover:text-white"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {isCollapsed ? (
                theme === 'light' ? (
                  <Moon className="w-4 h-4 mx-auto text-gray-700 dark:text-gray-300 group-hover:text-solar-600" />
                ) : (
                  <Sun className="w-4 h-4 mx-auto text-amber-400" />
                )
              ) : (
                <div className="flex-1 text-left flex items-center justify-between">
                  <span className="truncate flex items-center gap-2">
                    {theme === 'light' ? (
                      <Moon className="w-4 h-4 text-gray-700 dark:text-gray-300 group-hover:text-solar-600 shrink-0" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>{theme === 'light' ? 'Dark Theme' : 'Light Theme'}</span>
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                    theme === 'dark'
                      ? 'bg-amber-400/20 text-amber-400 border-amber-400/30'
                      : 'bg-gray-100 text-gray-900 border-gray-300'
                  }`}>
                    {theme === 'dark' ? 'DARK' : 'LIGHT'}
                  </span>
                </div>
              )}
            </button>
          </div>
        </nav>

        {/* User Profile & Logout Block (Directly under System & Users) */}
        <div className="p-2.5 sm:p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/60 shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left leading-tight">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[130px]">
                    {user?.full_name || 'Staff User'}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeColor()}`}>
                      {getRoleLabel()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-0.5">
              <div
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0"
                title={`${user?.full_name} (${user?.role})`}
              >
                <UserIcon className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Printer Connection & Settings Modal */}
        <PrinterSettingsModal
          isOpen={showPrinterModal}
          onClose={() => setShowPrinterModal(false)}
        />
      </aside>
    </>
  );
};