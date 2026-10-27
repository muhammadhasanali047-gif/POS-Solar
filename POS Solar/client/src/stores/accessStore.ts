import { create } from 'zustand';
import api from '../lib/api';
import { NavItemKey } from '../components/layout/Sidebar';

export type UserRole = 'ADMIN' | 'CEO' | 'MANAGER' | 'CASHIER';

export interface TabDefinition {
  key: NavItemKey;
  label: string;
  section: 'Overview' | 'Sales' | 'Inventory' | 'Service' | 'Admin';
  description: string;
  subTabs?: { key: string; label: string; description?: string }[];
}

export const ALL_TAB_DEFINITIONS: TabDefinition[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    section: 'Overview',
    description: 'Executive KPI metrics, revenue charts, and quick shortcut cards',
  },
  {
    key: 'quick-flow',
    label: 'Quick Flow',
    section: 'Sales',
    description: '1-screen rapid billing, quotations, and quick sale conversion',
  },
  {
    key: 'pos',
    label: 'Sales & POS',
    section: 'Sales',
    description: 'Full POS counter register, customer invoice generation, and receipt printing',
    subTabs: [
      { key: 'pos-counter', label: 'POS Billing Counter', description: 'Real-time cart and payment checkout' },
      { key: 'pos-history', label: 'Sales Invoices History', description: 'Past sales, receipt re-print, and search' },
      { key: 'pos-returns', label: 'Refunds & Returns', description: 'Process customer returns and ledger adjustments' },
    ],
  },
  {
    key: 'quotations',
    label: 'Quotations',
    section: 'Sales',
    description: 'Detailed formal solar project proposals, PDF generation, and quotation approval',
    subTabs: [
      { key: 'quotation-builder', label: 'Create New Quotation', description: 'Custom solar system sizing and pricing' },
      { key: 'quotation-list', label: 'Saved Quotations', description: 'View, edit, convert to sale, or print PDF' },
    ],
  },
  {
    key: 'packages',
    label: 'Solar Packages',
    section: 'Sales',
    description: 'Pre-assembled turn-key complete solar bundles (e.g. 5kW, 10kW On-Grid/Hybrid)',
    subTabs: [
      { key: 'package-catalog', label: 'Active Packages', description: 'Browse and edit package bundles' },
      { key: 'package-create', label: 'Build New Package', description: 'Assemble panels, inverters, and accessories' },
    ],
  },
  {
    key: 'customers',
    label: 'Customers CRM',
    section: 'Sales',
    description: 'Customer directory, credit ledgers, installation history, and statements',
    subTabs: [
      { key: 'customer-list', label: 'Customer Directory', description: 'Manage accounts and contact details' },
      { key: 'customer-ledger', label: 'Account Ledger', description: 'Debit/credit balance and statement printing' },
    ],
  },
  {
    key: 'products',
    label: 'Product Catalog',
    section: 'Inventory',
    description: 'Solar panels, inverters, batteries, cables, mounting structures, and accessories',
    subTabs: [
      { key: 'product-list', label: 'All Products', description: 'Inventory prices, models, and specifications' },
      { key: 'product-categories', label: 'Category Management', description: 'Create and organize categories' },
      { key: 'product-brands', label: 'Brand Directory', description: 'Manage solar equipment manufacturers' },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory & Stock',
    section: 'Inventory',
    description: 'Real-time stock balance, warehouse tracking, and inventory adjustments',
    subTabs: [
      { key: 'stock-balances', label: 'Warehouse Stock', description: 'Available and reserved quantities' },
      { key: 'stock-adjust', label: 'Manual Adjustments', description: 'Reconcile physical stock counts' },
      { key: 'stock-transfers', label: 'Inter-Branch Transfers', description: 'Transfer stock between locations' },
    ],
  },
  {
    key: 'serials',
    label: 'Track a Serial Number',
    section: 'Inventory',
    description: 'Individual barcode / serial number tracking from PO inwarding to customer warranty',
    subTabs: [
      { key: 'serial-search', label: 'Serial Lookup', description: 'Instant tracking of equipment lifecycle' },
      { key: 'serial-register', label: 'Serial Registration', description: 'Assign serials to stock and warranty' },
    ],
  },
  {
    key: 'suppliers',
    label: 'Purchases & Suppliers',
    section: 'Inventory',
    description: 'Vendor management, purchase order inwarding, and supplier payment ledgers',
    subTabs: [
      { key: 'po-inward', label: 'Purchase Inwarding', description: 'Confirm incoming supplier stock' },
      { key: 'po-history', label: 'PO Records History', description: 'View and track all past vendor orders' },
      { key: 'supplier-ledger', label: 'Supplier Accounts', description: 'Manage vendor payables and ledgers' },
    ],
  },
  {
    key: 'installations',
    label: 'Installations',
    section: 'Service',
    description: 'Solar site execution, technical teams, job status, and commissioning',
    subTabs: [
      { key: 'install-active', label: 'Active Jobs', description: 'Sites scheduled or in progress' },
      { key: 'install-completed', label: 'Completed Jobs', description: 'Finalized commissions and handover logs' },
    ],
  },
  {
    key: 'warranties',
    label: 'Warranties',
    section: 'Service',
    description: 'Serial warranty certificates, customer validity periods, and warranty terms',
    subTabs: [
      { key: 'warranty-active', label: 'Active Certificates', description: 'Current equipment under warranty' },
      { key: 'warranty-expired', label: 'Expiring Soon', description: 'Certificates approaching expiry date' },
    ],
  },
  {
    key: 'claims',
    label: 'Warranty Claims',
    section: 'Service',
    description: 'Customer RMA warranty replacements, fault diagnosis, and manufacturer claims',
    subTabs: [
      { key: 'claims-open', label: 'Open RMA Claims', description: 'Under technical diagnosis and repair' },
      { key: 'claims-resolved', label: 'Resolved RMAs', description: 'Replaced or refunded equipment' },
    ],
  },
  {
    key: 'settings',
    label: 'System & Users',
    section: 'Admin',
    description: 'Staff account management, branch profile, and multi-PC offline sync',
    subTabs: [
      { key: 'settings-users', label: 'Staff Accounts', description: 'Create and manage user logins' },
      { key: 'settings-sync', label: 'Offline Sync & Cloud', description: 'Multi-PC local SQLite and Cloud sync' },
      { key: 'settings-branch', label: 'Branch Profile', description: 'Business address and contact info' },
    ],
  },
  {
    key: 'access',
    label: 'Access Control',
    section: 'Admin',
    description: 'Configure and customize tab access permissions for each role in the system',
  },
];

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  dashboard: ['ADMIN', 'CEO', 'MANAGER', 'CASHIER'],
  'quick-flow': ['ADMIN', 'CEO', 'MANAGER', 'CASHIER'],
  pos: ['ADMIN', 'CEO', 'MANAGER', 'CASHIER'],
  quotations: ['ADMIN', 'CEO', 'MANAGER', 'CASHIER'],
  packages: ['ADMIN', 'CEO', 'MANAGER'],
  customers: ['ADMIN', 'CEO', 'MANAGER', 'CASHIER'],
  products: ['ADMIN', 'CEO', 'MANAGER'],
  inventory: ['ADMIN', 'CEO', 'MANAGER'],
  serials: ['ADMIN', 'CEO', 'MANAGER'],
  suppliers: ['ADMIN', 'CEO', 'MANAGER'],
  installations: ['ADMIN', 'CEO', 'MANAGER'],
  warranties: ['ADMIN', 'CEO', 'MANAGER'],
  claims: ['ADMIN', 'CEO', 'MANAGER'],
  settings: ['ADMIN', 'CEO'],
  access: ['ADMIN', 'CEO'],
};

const STORAGE_KEY = 'solar_pos_tab_permissions_v1';

interface AccessStore {
  permissions: Record<string, string[]>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchPermissions: () => Promise<void>;
  updatePermissions: (newPerms: Record<string, string[]>) => Promise<boolean>;
  toggleRoleForTab: (tabKey: string, role: string) => void;
  setRolesForTab: (tabKey: string, roles: string[]) => void;
  resetToDefaults: () => Promise<boolean>;
  isTabAllowed: (tabKey: string, role?: string) => boolean;
}

export const useAccessStore = create<AccessStore>((set, get) => ({
  permissions: (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_PERMISSIONS, ...JSON.parse(saved) };
    } catch {}
    return { ...DEFAULT_PERMISSIONS };
  })(),
  isLoading: false,
  isSaving: false,
  error: null,

  fetchPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/roles/access');
      if (res.data?.success && res.data.data?.permissions) {
        const perms = { ...DEFAULT_PERMISSIONS, ...res.data.data.permissions };
        set({ permissions: perms });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
        } catch {}
      }
    } catch (e: any) {
      console.warn('Could not fetch server permissions, using cached permissions', e.message);
    } finally {
      set({ isLoading: false });
    }
  },

  updatePermissions: async (newPerms: Record<string, string[]>) => {
    set({ isSaving: true, error: null });
    try {
      // Admin is always guaranteed access
      const sanitized: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(newPerms)) {
        sanitized[k] = Array.from(new Set(['ADMIN', ...v]));
      }

      set({ permissions: sanitized });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      } catch {}

      const res = await api.post('/roles/access', { permissions: sanitized });
      if (res.data?.success) {
        set({ isSaving: false });
        return true;
      }
      return false;
    } catch (err: any) {
      set({ isSaving: false, error: err.response?.data?.error || 'Failed to update permissions' });
      return false;
    }
  },

  toggleRoleForTab: (tabKey: string, role: string) => {
    const cur = get().permissions[tabKey] || ['ADMIN'];
    let next: string[];
    if (cur.includes(role)) {
      if (role === 'ADMIN') return; // Cannot remove ADMIN
      next = cur.filter((r) => r !== role);
    } else {
      next = [...cur, role];
    }
    const updated = { ...get().permissions, [tabKey]: next };
    set({ permissions: updated });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  },

  setRolesForTab: (tabKey: string, roles: string[]) => {
    const ensured = Array.from(new Set(['ADMIN', ...roles]));
    const updated = { ...get().permissions, [tabKey]: ensured };
    set({ permissions: updated });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  },

  resetToDefaults: async () => {
    return get().updatePermissions(DEFAULT_PERMISSIONS);
  },

  isTabAllowed: (tabKey: string, role?: string) => {
    if (!role) return false;
    if (role === 'ADMIN') return true;
    const allowed = get().permissions[tabKey] || DEFAULT_PERMISSIONS[tabKey] || ['ADMIN', 'CEO'];
    return allowed.includes(role);
  },
}));
