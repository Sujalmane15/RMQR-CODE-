// Comprehensive API Handler for all 12 Modules of Urban Mart
import { createSessionToken, verifyPassword, verifySessionToken } from "../lib/auth";
import { getDatabase } from "../lib/db/memory-db";
import { calculateCartTotals } from "../lib/tax";
import { BillItem, PaymentSplit } from "../types";

export interface ApiRequest {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: any;
  headers?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  data?: any;
  error?: string;
}

export async function handleApiRequest(req: ApiRequest): Promise<ApiResponse> {
  const db = getDatabase();
  const path = req.path.replace(/^\/api\/?/, "");
  const method = req.method.toUpperCase();

  // Helper auth extractor
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  let currentUser = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const session = verifySessionToken(token);
    if (session) {
      currentUser = db.getUserById(session.userId);
    }
  }

  // --- 1. AUTH MODULE ---
  if (path === "auth/login" && method === "POST") {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return { status: 400, error: "Email and password are required" };
    }
    const user = db.getUserByEmail(email);
    if (!user || !user.is_active) {
      return { status: 401, error: "Invalid email or account inactive" };
    }
    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { status: 401, error: "Invalid email or password" };
    }

    const session = createSessionToken(user);
    db.addAuditLog({
      user_id: user.id,
      user_name: user.name,
      role: user.role,
      action: "LOGIN",
      module: "AUTH",
      description: `User ${user.email} (${user.role}) logged in successfully`,
    });

    return { status: 200, data: session };
  }

  if (path === "auth/me" && method === "GET") {
    if (!currentUser) return { status: 401, error: "Unauthorized session" };
    const { password_hash, ...safeUser } = currentUser;
    return { status: 200, data: safeUser };
  }

  // --- 2. PRODUCTS MASTER & BARCODE SCANNER ---
  if (path === "products" && method === "GET") {
    const q = req.query?.q || "";
    if (q) {
      return { status: 200, data: db.searchProducts(q) };
    }
    return { status: 200, data: db.getProducts() };
  }

  if (path.startsWith("products/barcode/") && method === "GET") {
    const barcode = path.replace("products/barcode/", "");
    const product = db.getProductByBarcode(barcode);
    if (!product) return { status: 404, error: "Product not found for barcode" };
    return { status: 200, data: product };
  }

  if (path === "products" && method === "POST") {
    const product = db.createProduct(req.body);
    return { status: 201, data: product };
  }

  if (path.startsWith("products/") && method === "PUT") {
    const id = path.replace("products/", "");
    const updated = db.updateProduct(id, req.body);
    if (!updated) return { status: 404, error: "Product not found" };
    return { status: 200, data: updated };
  }

  if (path.startsWith("products/") && method === "DELETE") {
    const id = path.replace("products/", "");
    const ok = db.deleteProduct(id);
    return { status: ok ? 200 : 404, data: { success: ok } };
  }

  // --- 3. POS BILLING & CART TAX ENGINE ---
  if (path === "billing/calculate" && method === "POST") {
    const { items = [], discountPercent = 0, discountFixed = 0, isInterstate = false } = req.body || {};
    const result = calculateCartTotals(items, discountPercent, discountFixed, isInterstate);
    return { status: 200, data: result };
  }

  if (path === "billing/checkout" && method === "POST") {
    const {
      items,
      cashier_id,
      cashier_name,
      counter_id = "POS-01",
      customer_phone,
      customer_name,
      payment_mode = "CASH",
      payments = [],
      tender_amount = 0,
      bill_discount_percent = 0,
      bill_discount_amount = 0,
      notes,
    } = req.body || {};

    if (!items || !items.length) {
      return { status: 400, error: "Cannot checkout empty cart" };
    }

    const calc = calculateCartTotals(items, bill_discount_percent, bill_discount_amount);
    const finalPayments: PaymentSplit[] = payments.length
      ? payments
      : [{ mode: payment_mode, amount: calc.grand_total }];

    const changeReturned = Math.max(0, tender_amount - calc.grand_total);

    const bill = db.createBill({
      cashier_id: cashier_id || currentUser?.id || "cashier-01",
      cashier_name: cashier_name || currentUser?.name || "Billing Operator",
      counter_id,
      customer_phone,
      customer_name,
      items: calc.items,
      total_items: calc.total_items,
      total_qty: calc.total_qty,
      subtotal_mrp: calc.subtotal_mrp,
      item_discount_total: calc.item_discount_total,
      bill_discount_percent,
      bill_discount_amount: calc.bill_discount_amount,
      taxable_subtotal: calc.taxable_subtotal,
      cgst_total: calc.cgst_total,
      sgst_total: calc.sgst_total,
      igst_total: calc.igst_total,
      cess_total: 0,
      total_tax: calc.total_tax,
      round_off: calc.round_off,
      grand_total: calc.grand_total,
      payment_mode,
      payments: finalPayments,
      tender_amount,
      change_returned: changeReturned,
      loyalty_points_earned: Math.floor(calc.grand_total / 100),
      loyalty_points_redeemed: 0,
      status: "COMPLETED",
      notes,
    });

    return { status: 201, data: bill };
  }

  // --- 4. HELD BILLS (PARKED TRANSACTIONS) ---
  if (path === "billing/held" && method === "GET") {
    return { status: 200, data: db.getHeldBills() };
  }

  if (path === "billing/held" && method === "POST") {
    const { items, cashier_id, cashier_name, customer_phone, customer_name, subtotal, note } = req.body || {};
    if (!items || !items.length) return { status: 400, error: "Cart items required to park bill" };
    const held = db.holdBill({
      cashier_id: cashier_id || currentUser?.id || "cashier-01",
      cashier_name: cashier_name || currentUser?.name || "Cashier",
      customer_phone,
      customer_name,
      items,
      subtotal: subtotal || 0,
      note,
    });
    return { status: 201, data: held };
  }

  if (path.startsWith("billing/held/") && method === "DELETE") {
    const heldId = path.replace("billing/held/", "");
    const resumed = db.resumeBill(heldId);
    if (!resumed) return { status: 404, error: "Held bill not found" };
    return { status: 200, data: resumed };
  }

  // --- 5. BILL REPRINT & LOOKUP ---
  if (path.startsWith("billing/reprint/") && method === "GET") {
    const invoiceNo = path.replace("billing/reprint/", "");
    const bill = db.getBillByInvoiceNumber(invoiceNo);
    if (!bill) return { status: 404, error: "Invoice not found" };
    return { status: 200, data: bill };
  }

  // --- 6. SALES RETURNS & REFUNDS ---
  if (path === "billing/returns" && method === "GET") {
    return { status: 200, data: db.getSalesReturns() };
  }

  if (path === "billing/returns" && method === "POST") {
    const {
      original_invoice_number,
      customer_phone,
      items,
      refund_amount,
      refund_method = "CASH",
      reason,
      processed_by,
    } = req.body || {};

    if (!original_invoice_number || !items?.length) {
      return { status: 400, error: "Original invoice and return items required" };
    }

    const ret = db.createSalesReturn({
      original_invoice_number,
      original_bill_id: original_invoice_number,
      customer_phone,
      items,
      refund_amount: Number(refund_amount) || 0,
      refund_method,
      reason: reason || "Customer request",
      processed_by: processed_by || currentUser?.name || "Cashier",
    });

    return { status: 201, data: ret };
  }

  // --- 7. GRN / STOCK INWARD COUNTER ---
  if (path === "grn" && method === "GET") {
    return { status: 200, data: db.getGRNInvoices() };
  }

  if (path === "grn" && method === "POST") {
    const grn = db.createGRN(req.body);
    return { status: 201, data: grn };
  }

  if (path.startsWith("grn/") && path.endsWith("/approve") && method === "POST") {
    const grnId = path.replace("grn/", "").replace("/approve", "");
    const approver = req.body?.approved_by || currentUser?.name || "Admin";
    const approved = db.approveGRN(grnId, approver);
    if (!approved) return { status: 404, error: "GRN not found" };
    return { status: 200, data: approved };
  }

  // --- 8. CASHIER SHIFTS ---
  if (path === "shifts" && method === "GET") {
    return { status: 200, data: db.getShifts() };
  }

  if (path === "shifts/active" && method === "GET") {
    return { status: 200, data: db.getActiveShift() || null };
  }

  if (path === "shifts/open" && method === "POST") {
    const { cashier_id, cashier_name, counter_id, opening_float } = req.body || {};
    const shift = db.openShift(
      cashier_id || currentUser?.id || "cashier-01",
      cashier_name || currentUser?.name || "Billing Operator",
      counter_id || "POS-01",
      Number(opening_float) || 0
    );
    return { status: 201, data: shift };
  }

  if (path === "shifts/close" && method === "POST") {
    const { shift_id, actual_cash, closing_notes } = req.body || {};
    if (!shift_id) return { status: 400, error: "shift_id is required" };
    const closed = db.closeShift(shift_id, Number(actual_cash) || 0, closing_notes);
    if (!closed) return { status: 404, error: "Shift not found or already closed" };
    return { status: 200, data: closed };
  }

  // --- 9. SUPPLIERS CRM ---
  if (path === "suppliers" && method === "GET") {
    return { status: 200, data: db.getSuppliers() };
  }

  if (path === "suppliers" && method === "POST") {
    const sup = db.createSupplier(req.body);
    return { status: 201, data: sup };
  }

  // --- 10. CUSTOMERS CRM & LOYALTY ---
  if (path === "customers" && method === "GET") {
    const phone = req.query?.phone;
    if (phone) {
      const cust = db.getCustomerByPhone(phone);
      if (!cust) return { status: 404, error: "Customer not found" };
      return { status: 200, data: cust };
    }
    return { status: 200, data: db.getCustomers() };
  }

  if (path === "customers" && method === "POST") {
    const cust = db.createCustomer(req.body);
    return { status: 201, data: cust };
  }

  // --- 11. EXPENSES & P&L ---
  if (path === "expenses" && method === "GET") {
    return { status: 200, data: db.getExpenses() };
  }

  if (path === "expenses" && method === "POST") {
    const exp = db.recordExpense(req.body);
    return { status: 201, data: exp };
  }

  // --- 12. STOCK LEDGER & AUDIT TRAIL ---
  if (path === "stock-ledger" && method === "GET") {
    const prodId = req.query?.product_id;
    return { status: 200, data: db.getStockLedger(300, prodId) };
  }

  if (path === "audit-logs" && method === "GET") {
    return { status: 200, data: db.getAuditLogs(100) };
  }

  // --- DASHBOARD & STORE SETTINGS ---
  if (path === "dashboard" && method === "GET") {
    return { status: 200, data: db.getDashboardMetrics() };
  }

  if (path === "settings" && method === "GET") {
    return { status: 200, data: db.getStoreConfig() };
  }

  if (path === "settings" && method === "PUT") {
    const updated = db.updateStoreConfig(req.body, currentUser?.name || "Admin");
    return { status: 200, data: updated };
  }

  return { status: 404, error: `Endpoint ${method} /api/${path} not found` };
}
