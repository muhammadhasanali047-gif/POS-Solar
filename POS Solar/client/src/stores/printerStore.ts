import { create } from 'zustand';

export interface PrinterSettings {
  printerName: string;
  paperSize: '80mm' | '58mm' | 'a4';
  autoPrintOnSave: boolean;
  companyName: string;
  tagline: string;
  phone: string;
  address: string;
  city: string;
  ntn: string;
  terms: string;
  footerNote: string;
}

export interface PrintItem {
  id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  model?: string | null;
  serials?: string[];
  tax_rate?: number;
  tax_amount?: number;
}

export interface PrintDocumentData {
  docType: 'invoice' | 'quotation' | 'payment_receipt' | 'test' | 'customer_ledger' | 'installation_certificate';
  docNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string | null;
  customerCity?: string | null;
  customerAddress?: string | null;
  customerCnic?: string | null;
  customerNtn?: string | null;
  salespersonName?: string | null;
  validityDays?: number | string;
  expiryDate?: string | null;
  isDealLock?: boolean;
  items: PrintItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  taxRate?: number;
  untaxedAmount?: number;
  taxedTotal?: number;
  installationCharges?: number;
  transportCharges?: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentMethod?: string | null;
  notes?: string | null;
  systemCapacity?: string;
  technicianName?: string;
  installationStatus?: string;
  completedDate?: string;
  checklistSummary?: string[];
  testResultsSummary?: { [key: string]: string | number };
  ledgerEntries?: Array<{
    date: string;
    ref_no: string;
    description: string;
    debit: number;
    credit: number;
    running_balance: number;
  }>;
}

const STORAGE_KEY = 'solar_pos_printer_settings_v3';

const DEFAULT_SETTINGS: PrinterSettings = {
  printerName: 'HP LaserJet Professional P1566',
  paperSize: 'a4',
  autoPrintOnSave: true,
  companyName: 'Alp Solar Sale and Service Center',
  tagline: 'Authorised Center: AlpSolar (A Ligoo Brand) & J.I Energies Solar Solutions',
  phone: '+92 302 3333499',
  address: 'MA Jinnah Road near Bank Al Habib, Chowk Kumhara',
  city: 'Multan',
  ntn: 'NTN: 8945210-4',
  terms: '1. Standard equipment warranty as per manufacturer terms.\n2. Inverter warranty 5 years, Panels 25 years performance.\n3. Physical or burnt damages are not covered under warranty.',
  footerNote: 'Thank you for choosing Alp Solar & J.I Energies! Clean Energy, Bright Future.',
};

function loadSavedSettings(): PrinterSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load printer settings', e);
  }
  return DEFAULT_SETTINGS;
}

interface PrinterState {
  settings: PrinterSettings;
  activeDoc: PrintDocumentData | null;
  isPrinting: boolean;
  updateSettings: (newSettings: Partial<PrinterSettings>) => void;
  setPrintDocument: (doc: PrintDocumentData | null) => void;
  triggerPrint: (doc: PrintDocumentData) => void;
}

export const usePrinterStore = create<PrinterState>((set, get) => ({
  settings: loadSavedSettings(),
  activeDoc: null,
  isPrinting: false,

  updateSettings: (newSettings) => {
    set((state) => {
      const merged = { ...state.settings, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {
        console.error('Failed to save printer settings', e);
      }
      return { settings: merged };
    });
  },

  setPrintDocument: (doc) => set({ activeDoc: doc }),

  triggerPrint: (doc) => {
    set({ activeDoc: doc, isPrinting: true });

    // Allow DOM to render the printable document, then trigger system print dialog
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        set({ isPrinting: false });
      }, 1000);
    }, 150);
  },
}));
