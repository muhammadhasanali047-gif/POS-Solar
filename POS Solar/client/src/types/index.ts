export type UserRole = 'ADMIN' | 'CEO' | 'MANAGER' | 'CASHIER';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  branch_id?: string | null;
  branch?: Branch | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  is_main: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  _count?: { products: number };
}

export interface Brand {
  id: string;
  name: string;
  country?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  _count?: { products: number };
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  wattage?: number | null;
  voltage?: number | null;
  capacity?: string | null;
  technology?: string | null;
  dimensions?: string | null;
  weight?: number | null;
  warranty_years: number;
  purchase_price: number;
  sale_price: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  brand_id: string;
  model_number?: string | null;
  description?: string | null;
  is_serialized: boolean;
  min_stock_alert: number;
  purchase_price: number;
  sale_price: number;
  is_active: boolean;
  category?: Category;
  brand?: Brand;
  variants?: ProductVariant[];
  totalStock?: number;
  availableStock?: number;
  isLowStock?: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  branch_id?: string | null;
  location?: string | null;
  is_active: boolean;
  branch?: Branch;
}

export interface InventoryItem {
  id: string;
  warehouse_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  reserved_qty: number;
  available_qty: number;
  avg_cost: number;
  total_value?: number;
  is_low_stock?: boolean;
  product: Product;
  variant?: ProductVariant | null;
  warehouse: Warehouse;
}

export interface SerialNumber {
  id: string;
  serial_no: string;
  product_id: string;
  variant_id?: string | null;
  warehouse_id?: string | null;
  status: 'IN_STOCK' | 'RESERVED' | 'SOLD' | 'INSTALLED' | 'CLAIMED' | 'DEFECTIVE';
  current_customer_id?: string | null;
  sale_item_id?: string | null;
  purchase_item_id?: string | null;
  purchase_date?: string | null;
  sale_date?: string | null;
  warranty_end_date?: string | null;
  notes?: string | null;
  product?: Product;
  variant?: ProductVariant | null;
  warehouse?: Warehouse | null;
}

export interface SolarPackageItem {
  id: string;
  package_id: string;
  product_id: string;
  variant_id?: string | null;
  default_quantity: number;
  notes?: string | null;
  product?: Product;
  variant?: ProductVariant | null;
}

export interface SolarPackage {
  id: string;
  package_no: string;
  name: string;
  capacity_kw: number;
  package_type: 'ON_GRID' | 'HYBRID' | 'OFF_GRID';
  description?: string | null;
  base_price: number;
  is_active: boolean;
  items?: SolarPackageItem[];
}

export interface Customer {
  id: string;
  customer_no: string;
  name: string;
  customer_type: 'INDIVIDUAL' | 'COMMERCIAL';
  phone: string;
  alt_phone?: string | null;
  email?: string | null;
  cnic?: string | null;
  address?: string | null;
  city?: string | null;
  credit_limit: number;
  outstanding_balance: number;
  notes?: string | null;
  _count?: { sales: number; quotations: number; installations: number };
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string;
  variant_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_custom: boolean;
}

export interface Quotation {
  id: string;
  quotation_no: string;
  customer_id: string;
  package_id?: string | null;
  system_capacity_kw?: number | null;
  subtotal: number;
  discount: number;
  tax: number;
  installation_charges: number;
  transport_charges: number;
  grand_total: number;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_SALE';
  validity_date?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  customer?: Customer;
  package?: SolarPackage | null;
  items?: QuotationItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
  profit: number;
  serial_numbers_json?: string | null;
}

export interface Payment {
  id: string;
  payment_no: string;
  sale_id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  transaction_ref?: string | null;
  payment_date: string;
  received_by?: string | null;
  notes?: string | null;
}

export interface Sale {
  id: string;
  invoice_no: string;
  quotation_id?: string | null;
  customer_id: string;
  dealer_id?: string | null;
  salesperson_id?: string | null;
  system_capacity_kw?: number | null;
  subtotal: number;
  discount: number;
  tax: number;
  installation_charges: number;
  transport_charges: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  payment_status: 'UNPAID' | 'PARTIAL' | 'PAID';
  order_status: 'COMPLETED' | 'CANCELLED';
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  customer?: Customer;
  dealer?: Dealer | null;
  items?: SaleItem[];
  payments?: Payment[];
}

export interface Supplier {
  id: string;
  supplier_no: string;
  company_name: string;
  contact_person?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  total_purchased: number;
  amount_paid: number;
  outstanding_payable: number;
  notes?: string | null;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  serial_numbers_json?: string | null;
  serial_numbers?: string[];
  is_serialized?: boolean;
  product?: Product;
}

export interface Purchase {
  id: string;
  po_no: string;
  supplier_id: string;
  warehouse_id?: string | null;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: 'UNPAID' | 'PARTIAL' | 'PAID';
  status: 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  purchase_date: string;
  notes?: string | null;
  created_by?: string | null;
  supplier?: Supplier;
  items?: PurchaseItem[];
}

export interface Installation {
  id: string;
  job_no: string;
  sale_id: string;
  customer_id: string;
  address: string;
  system_capacity_kw?: number | null;
  scheduled_date?: string | null;
  completed_date?: string | null;
  assigned_technician?: string | null;
  status: 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  checklist_json?: string | null;
  test_results_json?: string | null;
  notes?: string | null;
  created_at: string;
  customer?: Customer;
  sale?: Sale;
}

export interface WarrantyClaim {
  id: string;
  claim_no: string;
  warranty_id: string;
  customer_id: string;
  serial_number_id: string;
  original_invoice_no?: string | null;
  complaint: string;
  claim_type: 'REPAIR' | 'REPLACEMENT' | 'INSPECTION';
  assigned_technician?: string | null;
  diagnosis?: string | null;
  repair_details?: string | null;
  parts_used?: string | null;
  replacement_serial_no?: string | null;
  service_cost: number;
  warranty_cost: number;
  status: 'RECEIVED' | 'INSPECTING' | 'APPROVED' | 'REJECTED' | 'RESOLVED' | 'CLOSED';
  resolution?: string | null;
  resolution_date?: string | null;
  internal_notes?: string | null;
  customer_remarks?: string | null;
  created_at: string;
  customer?: Customer;
  warranty?: Warranty;
}

export interface Warranty {
  id: string;
  warranty_no: string;
  serial_number_id?: string | null;
  product_id: string;
  customer_id: string;
  sale_id: string;
  warranty_type?: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  status: 'ACTIVE' | 'EXPIRED' | 'VOID' | 'CLAIMED';
  terms?: string | null;
  dynamic_status?: string;
  customer?: Customer;
  serial_number?: SerialNumber | null;
  product?: Product | null;
  claims?: WarrantyClaim[];
}

export interface Expense {
  id: string;
  expense_no: string;
  category: 'RENT' | 'SALARIES' | 'FUEL' | 'TRANSPORT' | 'INSTALLATION_LABOR' | 'MARKETING' | 'UTILITIES' | 'MAINTENANCE' | 'OFFICE' | 'OTHER';
  amount: number;
  payment_method: string;
  expense_date: string;
  paid_to?: string | null;
  description?: string | null;
  created_by?: string | null;
}

export interface Commission {
  id: string;
  commission_no: string;
  dealer_id: string;
  sale_id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID';
  paid_date?: string | null;
  payment_ref?: string | null;
  created_at: string;
  sale?: Sale;
}

export interface Dealer {
  id: string;
  dealer_no: string;
  name: string;
  company_name?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  commission_type: 'PERCENTAGE' | 'FIXED_PER_KW';
  commission_value: number;
  total_sales_volume: number;
  total_commission_earned: number;
  commission_paid: number;
  balance_payable: number;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string | null;
  sales?: Sale[];
  commissions?: Commission[];
  linkedCustomers?: Customer[];
  linkedInstallations?: Installation[];
  commissionSummary?: {
    totalEarned: number;
    pending: number;
    approved: number;
    paid: number;
    balancePayable: number;
  };
  _count?: { sales: number; commissions: number };
}