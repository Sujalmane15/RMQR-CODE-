// URBAN MART CRM & SUPERMARKET MANAGEMENT SYSTEM - TYPE DEFINITIONS

export type UserRole = "ADMIN" | "CASHIER" | "GRN_OPERATOR";

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  counter_assigned?: string; // e.g. "Counter 1 (POS)", "Counter 2 (GRN)"
  is_active: boolean;
  created_at: string;
}

export interface UserSession {
  token: string;
  user: Omit<User, "password_hash">;
  expires_at: number;
}

export type GSTRate = 0 | 5 | 12 | 18 | 28;

export type ProductUnit = "PCS" | "KG" | "PACK" | "LTR" | "GM" | "BOX";

export interface Product {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  hsn: string;
  unit: ProductUnit;
  mrp: number;               // Maximum Retail Price (tax inclusive)
  purchase_rate: number;     // Supplier Purchase Price (ex-tax or cost)
  selling_price: number;     // Store POS Selling Price (tax inclusive)
  gst_rate: GSTRate;         // 0, 5, 12, 18, 28
  stock_qty: number;         // Current in-stock quantity
  min_stock_alert: number;   // Reorder threshold
  is_active: boolean;
  batch_number?: string;
  expiry_date?: string;      // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface ProductBatch {
  id: string;
  product_id: string;
  batch_number: string;
  mfg_date: string;
  expiry_date: string;
  purchase_rate: number;
  mrp: number;
  selling_price: number;
  stock_qty: number;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  gstin: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  payment_terms_days: number;
  outstanding_balance: number;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyalty_points: number;
  total_spend: number;
  visits_count: number;
  last_visit?: string;
  created_at: string;
}

export type GRNStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface GRNItem {
  id: string;
  product_id: string;
  barcode: string;
  product_name: string;
  unit: ProductUnit;
  batch_number: string;
  mfg_date: string;
  expiry_date: string;
  invoiced_qty: number;
  received_qty: number;
  damaged_qty: number;
  shortage_qty: number;
  accepted_qty: number;     // received_qty - damaged_qty
  purchase_rate: number;
  mrp: number;
  selling_price: number;
  gst_rate: GSTRate;
  tax_amount: number;
  total_amount: number;
}

export interface GRNInvoice {
  id: string;
  grn_number: string;        // e.g. GRN-2026-00001
  supplier_id: string;
  supplier_name: string;
  supplier_invoice_no: string;
  supplier_invoice_date: string;
  delivery_challan_no?: string;
  vehicle_no?: string;
  items: GRNItem[];
  subtotal: number;
  total_tax: number;
  grand_total: number;
  status: GRNStatus;
  received_by: string;
  approved_by?: string;
  approved_at?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentMode = "CASH" | "UPI" | "CARD" | "SPLIT";

export interface PaymentSplit {
  mode: "CASH" | "UPI" | "CARD";
  amount: number;
  reference_no?: string;
}

export interface BillItem {
  product_id: string;
  barcode: string;
  name: string;
  unit: ProductUnit;
  mrp: number;
  selling_price: number;
  qty: number;
  gst_rate: GSTRate;
  discount_amount: number;   // discount off MRP/selling price
  taxable_value: number;     // Value before tax
  cgst: number;              // Central GST
  sgst: number;              // State GST
  igst: number;              // Inter-state GST (0 for local)
  cess: number;
  total: number;             // Final line total
}

export type BillStatus = "COMPLETED" | "HELD" | "CANCELLED" | "RETURNED" | "REFUNDED";

export interface Bill {
  id: string;
  invoice_number: string;    // e.g. UM-2026-00001
  date: string;              // ISO string
  cashier_id: string;
  cashier_name: string;
  counter_id: string;        // e.g. "POS-01"
  customer_id?: string;
  customer_phone?: string;
  customer_name?: string;
  items: BillItem[];
  total_items: number;
  total_qty: number;
  subtotal_mrp: number;      // Total MRP sum
  item_discount_total: number;
  bill_discount_percent: number;
  bill_discount_amount: number;
  taxable_subtotal: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  cess_total: number;
  total_tax: number;
  round_off: number;
  grand_total: number;
  payment_mode: PaymentMode;
  payments: PaymentSplit[];
  tender_amount: number;     // Cash tendered by customer
  change_returned: number;   // Change returned to customer
  loyalty_points_earned: number;
  loyalty_points_redeemed: number;
  status: BillStatus;
  notes?: string;
  created_at: string;
}

export interface HeldBill {
  id: string;
  held_at: string;
  cashier_id: string;
  cashier_name: string;
  customer_phone?: string;
  customer_name?: string;
  items: BillItem[];
  subtotal: number;
  note?: string;
}

export interface ReturnItem {
  product_id: string;
  barcode: string;
  name: string;
  returned_qty: number;
  unit_price: number;
  refund_amount: number;
  condition: "GOOD" | "DAMAGED";
  gst_rate: GSTRate;
}

export interface SalesReturn {
  id: string;
  return_number: string;     // e.g. RT-2026-00001
  original_invoice_number: string;
  original_bill_id: string;
  customer_phone?: string;
  return_date: string;
  items: ReturnItem[];
  refund_amount: number;
  refund_method: "CASH" | "CREDIT_NOTE";
  credit_note_code?: string;
  reason: string;
  processed_by: string;
  created_at: string;
}

export type ShiftStatus = "OPEN" | "CLOSED";

export interface CashierShift {
  id: string;
  shift_number: string;      // e.g. SH-2026-00001
  cashier_id: string;
  cashier_name: string;
  counter_id: string;
  opened_at: string;
  closed_at?: string;
  opening_float: number;     // Starting cash drawer amount (e.g. Rs 2,000)
  cash_sales: number;
  upi_sales: number;
  card_sales: number;
  total_sales: number;
  bills_count: number;
  cash_refunds: number;
  expected_cash: number;     // opening_float + cash_sales - cash_refunds
  actual_cash?: number;      // Counted at closing
  difference?: number;       // actual_cash - expected_cash
  status: ShiftStatus;
  closing_notes?: string;
}

export type ExpenseCategory =
  | "RENT"
  | "ELECTRICITY"
  | "SALARY"
  | "PACKAGING"
  | "MAINTENANCE"
  | "INTERNET_PHONE"
  | "MARKETING"
  | "OTHER";

export interface Expense {
  id: string;
  voucher_no: string;        // e.g. EXP-2026-00001
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  paid_to: string;
  payment_mode: "CASH" | "UPI" | "BANK_TRANSFER";
  recorded_by: string;
  created_at: string;
}

export type StockTransactionType =
  | "GRN_INWARD"
  | "POS_SALE"
  | "SALES_RETURN"
  | "DAMAGE_WRITE_OFF"
  | "MANUAL_ADJUSTMENT";

export interface StockLedgerEntry {
  id: string;
  product_id: string;
  barcode: string;
  product_name: string;
  transaction_type: StockTransactionType;
  reference_id: string;      // Invoice No, GRN No, Return No, etc.
  qty_change: number;        // Positive for inward/return, negative for sale/damage
  previous_stock: number;
  new_stock: number;
  unit_cost: number;
  total_value: number;
  timestamp: string;
  user_name: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  role: UserRole;
  action: string;
  module: string;            // "POS", "GRN", "INVENTORY", "AUTH", "SETTINGS", "DISCOUNTS"
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  timestamp: string;
}

export interface StoreConfig {
  store_name: string;
  branch_name: string;
  tagline: string;
  address_line1: string;
  address_line2: string;
  city: string;
  pincode: string;
  state: string;
  state_code: string;        // "27" for Maharashtra
  phone: string;
  email: string;
  gstin: string;
  fssai_lic_no: string;
  cin_no?: string;
  receipt_footer_msg: string;
  thermal_paper_size: "80mm" | "58mm" | "A4";
  auto_cut: boolean;
  currency_symbol: string;
  loyalty_points_per_100: number; // e.g. 1 point per Rs 100 spent
  loyalty_point_value: number;    // e.g. 1 point = Rs 1 discount
  supervisor_discount_limit_percent: number; // Disount > this requires supervisor/admin
}
