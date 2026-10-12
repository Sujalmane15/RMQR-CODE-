// In-memory Database Engine with Atomic JSON Disk Persistence for Urban Mart
import fs from "fs";
import path from "path";
import {
  AuditLog,
  Bill,
  BillItem,
  CashierShift,
  Customer,
  Expense,
  GRNInvoice,
  GRNItem,
  HeldBill,
  PaymentSplit,
  Product,
  ProductBatch,
  SalesReturn,
  StockLedgerEntry,
  StoreConfig,
  Supplier,
  User,
} from "../../types";
import {
  getSeedCustomers,
  getSeedExpenses,
  getSeedProducts,
  getSeedStoreConfig,
  getSeedSuppliers,
  getSeedUsers,
} from "./seed-data";

export interface UrbanMartDatabaseState {
  store_config: StoreConfig;
  users: User[];
  products: Product[];
  product_batches: ProductBatch[];
  suppliers: Supplier[];
  customers: Customer[];
  grn_invoices: GRNInvoice[];
  bills: Bill[];
  held_bills: HeldBill[];
  sales_returns: SalesReturn[];
  shifts: CashierShift[];
  expenses: Expense[];
  stock_ledger: StockLedgerEntry[];
  audit_logs: AuditLog[];
  sequences: {
    invoice_seq: number;
    grn_seq: number;
    shift_seq: number;
    return_seq: number;
    expense_seq: number;
  };
}

export class UrbanMartDatabase {
  private state: UrbanMartDatabaseState;
  private filePath: string;
  private isPersisting = false;

  constructor(customFilePath?: string) {
    this.filePath =
      customFilePath ||
      path.resolve(process.cwd(), "urbanmart", "data", "urbanmart-db.json");
    this.state = this.loadOrInitialize();
  }

  private loadOrInitialize(): UrbanMartDatabaseState {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.products && parsed.users && parsed.sequences) {
          return parsed;
        }
      }
    } catch {
      // Fallback to fresh seed data on error
    }

    const initialState: UrbanMartDatabaseState = {
      store_config: getSeedStoreConfig(),
      users: getSeedUsers(),
      products: getSeedProducts(),
      product_batches: [],
      suppliers: getSeedSuppliers(),
      customers: getSeedCustomers(),
      grn_invoices: [],
      bills: [],
      held_bills: [],
      sales_returns: [],
      shifts: [],
      expenses: getSeedExpenses(),
      stock_ledger: [],
      sequences: {
        invoice_seq: 1,
        grn_seq: 1,
        shift_seq: 1,
        return_seq: 1,
        expense_seq: 4, // 3 seed expenses exist
      },
    };

    // Populate initial stock ledger from products
    for (const p of initialState.products) {
      initialState.stock_ledger.push({
        id: `led-init-${p.id}`,
        product_id: p.id,
        barcode: p.barcode,
        product_name: p.name,
        transaction_type: "GRN_INWARD",
        reference_id: "OPENING_STOCK",
        qty_change: p.stock_qty,
        previous_stock: 0,
        new_stock: p.stock_qty,
        unit_cost: p.purchase_rate,
        total_value: p.stock_qty * p.purchase_rate,
        timestamp: "2026-10-01T00:00:00.000Z",
        user_name: "System Initializer",
        notes: "Store opening inventory intake",
      });
    }

    this.saveToDisk(initialState);
    return initialState;
  }

  private saveToDisk(stateToSave?: UrbanMartDatabaseState): void {
    if (this.isPersisting) return;
    this.isPersisting = true;

    try {
      const data = stateToSave || this.state;
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tmpPath, this.filePath);
    } catch {
      // Best-effort atomic file write
    } finally {
      this.isPersisting = false;
    }
  }

  // Helper sequence formatters
  private nextInvoiceNumber(): string {
    const num = this.state.sequences.invoice_seq++;
    return `UM-2026-${String(num).padStart(5, "0")}`;
  }

  private nextGRNNumber(): string {
    const num = this.state.sequences.grn_seq++;
    return `GRN-2026-${String(num).padStart(5, "0")}`;
  }

  private nextShiftNumber(): string {
    const num = this.state.sequences.shift_seq++;
    return `SH-2026-${String(num).padStart(5, "0")}`;
  }

  private nextReturnNumber(): string {
    const num = this.state.sequences.return_seq++;
    return `RT-2026-${String(num).padStart(5, "0")}`;
  }

  private nextExpenseNumber(): string {
    const num = this.state.sequences.expense_seq++;
    return `EXP-2026-${String(num).padStart(5, "0")}`;
  }

  // --- Audit Logging ---
  public addAuditLog(entry: Omit<AuditLog, "id" | "timestamp">): AuditLog {
    const log: AuditLog = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.state.audit_logs.unshift(log);
    // Keep last 1000 logs
    if (this.state.audit_logs.length > 1000) {
      this.state.audit_logs.pop();
    }
    this.saveToDisk();
    return log;
  }

  public getAuditLogs(limit = 100): AuditLog[] {
    return this.state.audit_logs.slice(0, limit);
  }

  // --- Store Configuration ---
  public getStoreConfig(): StoreConfig {
    return { ...this.state.store_config };
  }

  public updateStoreConfig(updates: Partial<StoreConfig>, updatedBy: string): StoreConfig {
    this.state.store_config = { ...this.state.store_config, ...updates };
    this.addAuditLog({
      user_id: "admin",
      user_name: updatedBy,
      role: "ADMIN",
      action: "UPDATE_STORE_CONFIG",
      module: "SETTINGS",
      description: "Updated store details and printer configuration",
    });
    this.saveToDisk();
    return this.getStoreConfig();
  }

  // --- Users & RBAC ---
  public getUsers(): User[] {
    return [...this.state.users];
  }

  public getUserById(id: string): User | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.state.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );
  }

  public createUser(user: User): User {
    this.state.users.push(user);
    this.saveToDisk();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.state.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.state.users[idx] = { ...this.state.users[idx], ...updates };
    this.saveToDisk();
    return this.state.users[idx];
  }

  // --- Products Catalog ---
  public getProducts(): Product[] {
    return [...this.state.products];
  }

  public getProductById(id: string): Product | undefined {
    return this.state.products.find((p) => p.id === id);
  }

  public getProductByBarcode(barcode: string): Product | undefined {
    const clean = barcode.trim();
    return this.state.products.find(
      (p) => p.barcode === clean || p.sku.toLowerCase() === clean.toLowerCase()
    );
  }

  public searchProducts(query: string): Product[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.state.products;
    return this.state.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
    );
  }

  public createProduct(product: Omit<Product, "id" | "created_at" | "updated_at">): Product {
    const newProduct: Product = {
      ...product,
      id: `prd-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.products.push(newProduct);

    if (newProduct.stock_qty > 0) {
      this.state.stock_ledger.unshift({
        id: `led-${Date.now()}`,
        product_id: newProduct.id,
        barcode: newProduct.barcode,
        product_name: newProduct.name,
        transaction_type: "MANUAL_ADJUSTMENT",
        reference_id: "MANUAL_ADD",
        qty_change: newProduct.stock_qty,
        previous_stock: 0,
        new_stock: newProduct.stock_qty,
        unit_cost: newProduct.purchase_rate,
        total_value: newProduct.stock_qty * newProduct.purchase_rate,
        timestamp: new Date().toISOString(),
        user_name: "Admin",
        notes: "New product entry",
      });
    }

    this.saveToDisk();
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const idx = this.state.products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    const old = this.state.products[idx];
    const updated: Product = {
      ...old,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.state.products[idx] = updated;
    this.saveToDisk();
    return updated;
  }

  public deleteProduct(id: string): boolean {
    const idx = this.state.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.state.products.splice(idx, 1);
    this.saveToDisk();
    return true;
  }

  // --- Suppliers CRM ---
  public getSuppliers(): Supplier[] {
    return [...this.state.suppliers];
  }

  public getSupplierById(id: string): Supplier | undefined {
    return this.state.suppliers.find((s) => s.id === id);
  }

  public createSupplier(supplier: Omit<Supplier, "id" | "created_at">): Supplier {
    const s: Supplier = {
      ...supplier,
      id: `sup-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.state.suppliers.push(s);
    this.saveToDisk();
    return s;
  }

  // --- Customers CRM & Loyalty ---
  public getCustomers(): Customer[] {
    return [...this.state.customers];
  }

  public getCustomerByPhone(phone: string): Customer | undefined {
    const clean = phone.replace(/[^0-9]/g, "");
    return this.state.customers.find((c) => c.phone.replace(/[^0-9]/g, "") === clean);
  }

  public createCustomer(customer: Omit<Customer, "id" | "created_at">): Customer {
    const c: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.state.customers.push(c);
    this.saveToDisk();
    return c;
  }

  public updateCustomerLoyalty(
    customerId: string,
    pointsDelta: number,
    spendDelta: number
  ): Customer | undefined {
    const cust = this.state.customers.find((c) => c.id === customerId);
    if (!cust) return undefined;
    cust.loyalty_points = Math.max(0, cust.loyalty_points + pointsDelta);
    cust.total_spend = cust.total_spend + spendDelta;
    cust.visits_count += 1;
    cust.last_visit = new Date().toISOString();
    this.saveToDisk();
    return cust;
  }

  // --- POS Billing Counter Transactions ---
  public getBills(limit = 200): Bill[] {
    return this.state.bills.slice(0, limit);
  }

  public getBillById(id: string): Bill | undefined {
    return this.state.bills.find((b) => b.id === id);
  }

  public getBillByInvoiceNumber(invoiceNumber: string): Bill | undefined {
    const clean = invoiceNumber.trim().toUpperCase();
    return this.state.bills.find(
      (b) => b.invoice_number.toUpperCase() === clean
    );
  }

  /**
   * Completes a POS sale: atomically deducts stock, records ledger entry,
   * updates active cashier shift totals, accrues customer points, logs audit.
   */
  public createBill(billData: Omit<Bill, "id" | "invoice_number" | "created_at">): Bill {
    const invoiceNumber = this.nextInvoiceNumber();
    const billId = `bill-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newBill: Bill = {
      ...billData,
      id: billId,
      invoice_number: invoiceNumber,
      date: timestamp,
      created_at: timestamp,
      status: "COMPLETED",
    };

    // 1. Deduct Inventory & Record Perpetual Stock Ledger Entries
    for (const item of newBill.items) {
      const prod = this.state.products.find((p) => p.id === item.product_id);
      if (prod) {
        const prevStock = prod.stock_qty;
        prod.stock_qty = Math.max(0, prod.stock_qty - item.qty);
        prod.updated_at = timestamp;

        this.state.stock_ledger.unshift({
          id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          product_id: prod.id,
          barcode: prod.barcode,
          product_name: prod.name,
          transaction_type: "POS_SALE",
          reference_id: invoiceNumber,
          qty_change: -item.qty,
          previous_stock: prevStock,
          new_stock: prod.stock_qty,
          unit_cost: prod.purchase_rate,
          total_value: item.qty * prod.purchase_rate,
          timestamp,
          user_name: newBill.cashier_name,
          notes: `POS Bill ${invoiceNumber}`,
        });
      }
    }

    // 2. Update Active Cashier Shift
    const activeShift = this.getActiveShift(newBill.cashier_id);
    if (activeShift) {
      activeShift.bills_count += 1;
      activeShift.total_sales += newBill.grand_total;

      for (const p of newBill.payments) {
        if (p.mode === "CASH") {
          activeShift.cash_sales += p.amount;
        } else if (p.mode === "UPI") {
          activeShift.upi_sales += p.amount;
        } else if (p.mode === "CARD") {
          activeShift.card_sales += p.amount;
        }
      }
      activeShift.expected_cash =
        activeShift.opening_float + activeShift.cash_sales - activeShift.cash_refunds;
    }

    // 3. Update Customer Loyalty if customer provided
    if (newBill.customer_phone) {
      let cust = this.getCustomerByPhone(newBill.customer_phone);
      if (!cust && newBill.customer_name) {
        cust = this.createCustomer({
          name: newBill.customer_name,
          phone: newBill.customer_phone,
          loyalty_points: 0,
          total_spend: 0,
          visits_count: 0,
        });
      }
      if (cust) {
        const pointsEarned = Math.floor(
          newBill.grand_total / (this.state.store_config.loyalty_points_per_100 || 100)
        );
        const pointsRedeemed = newBill.loyalty_points_redeemed || 0;
        cust.loyalty_points = Math.max(0, cust.loyalty_points + pointsEarned - pointsRedeemed);
        cust.total_spend += newBill.grand_total;
        cust.visits_count += 1;
        cust.last_visit = timestamp;
      }
    }

    // 4. Save Bill & Audit Log
    this.state.bills.unshift(newBill);

    this.addAuditLog({
      user_id: newBill.cashier_id,
      user_name: newBill.cashier_name,
      role: "CASHIER",
      action: "CREATE_BILL",
      module: "POS",
      description: `Billed Invoice ${invoiceNumber} for ₹${newBill.grand_total} (${newBill.items.length} items)`,
      metadata: { invoiceNumber, total: newBill.grand_total, mode: newBill.payment_mode },
    });

    this.saveToDisk();
    return newBill;
  }

  // --- Held Bills (Parked Carts) ---
  public getHeldBills(): HeldBill[] {
    return [...this.state.held_bills];
  }

  public holdBill(heldData: Omit<HeldBill, "id" | "held_at">): HeldBill {
    const held: HeldBill = {
      ...heldData,
      id: `hld-${Date.now()}`,
      held_at: new Date().toISOString(),
    };
    this.state.held_bills.unshift(held);
    this.saveToDisk();
    return held;
  }

  public resumeBill(heldId: string): HeldBill | null {
    const idx = this.state.held_bills.findIndex((h) => h.id === heldId);
    if (idx === -1) return null;
    const [resumed] = this.state.held_bills.splice(idx, 1);
    this.saveToDisk();
    return resumed;
  }

  // --- Sales Returns & Refunds ---
  public getSalesReturns(): SalesReturn[] {
    return [...this.state.sales_returns];
  }

  public createSalesReturn(returnData: Omit<SalesReturn, "id" | "return_number" | "created_at">): SalesReturn {
    const returnNumber = this.nextReturnNumber();
    const timestamp = new Date().toISOString();

    const salesReturn: SalesReturn = {
      ...returnData,
      id: `rt-${Date.now()}`,
      return_number: returnNumber,
      return_date: timestamp,
      created_at: timestamp,
    };

    // Restore inventory if items are in GOOD condition
    for (const item of salesReturn.items) {
      if (item.condition === "GOOD") {
        const prod = this.state.products.find((p) => p.id === item.product_id);
        if (prod) {
          const prevStock = prod.stock_qty;
          prod.stock_qty += item.returned_qty;
          prod.updated_at = timestamp;

          this.state.stock_ledger.unshift({
            id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            product_id: prod.id,
            barcode: prod.barcode,
            product_name: prod.name,
            transaction_type: "SALES_RETURN",
            reference_id: returnNumber,
            qty_change: item.returned_qty,
            previous_stock: prevStock,
            new_stock: prod.stock_qty,
            unit_cost: prod.purchase_rate,
            total_value: item.returned_qty * prod.purchase_rate,
            timestamp,
            user_name: salesReturn.processed_by,
            notes: `Return against ${salesReturn.original_invoice_number}: ${salesReturn.reason}`,
          });
        }
      }
    }

    // If refund was cash, update active shift cash_refunds
    if (salesReturn.refund_method === "CASH") {
      const activeShift = this.state.shifts.find((s) => s.status === "OPEN");
      if (activeShift) {
        activeShift.cash_refunds += salesReturn.refund_amount;
        activeShift.expected_cash =
          activeShift.opening_float + activeShift.cash_sales - activeShift.cash_refunds;
      }
    }

    this.state.sales_returns.unshift(salesReturn);

    this.addAuditLog({
      user_id: "cashier",
      user_name: salesReturn.processed_by,
      role: "CASHIER",
      action: "PROCESS_SALES_RETURN",
      module: "POS",
      description: `Processed return ${returnNumber} for invoice ${salesReturn.original_invoice_number} (Refund ₹${salesReturn.refund_amount})`,
      metadata: { returnNumber, refund: salesReturn.refund_amount, method: salesReturn.refund_method },
    });

    this.saveToDisk();
    return salesReturn;
  }

  // --- GRN / Stock Inward Counter ---
  public getGRNInvoices(): GRNInvoice[] {
    return [...this.state.grn_invoices];
  }

  public getGRNById(id: string): GRNInvoice | undefined {
    return this.state.grn_invoices.find((g) => g.id === id);
  }

  public createGRN(grnData: Omit<GRNInvoice, "id" | "grn_number" | "created_at" | "updated_at">): GRNInvoice {
    const grnNumber = this.nextGRNNumber();
    const timestamp = new Date().toISOString();

    const grn: GRNInvoice = {
      ...grnData,
      id: `grn-${Date.now()}`,
      grn_number: grnNumber,
      created_at: timestamp,
      updated_at: timestamp,
    };

    this.state.grn_invoices.unshift(grn);

    this.addAuditLog({
      user_id: "grn_operator",
      user_name: grn.received_by,
      role: "GRN_OPERATOR",
      action: "CREATE_GRN_ENTRY",
      module: "GRN",
      description: `Inward GRN ${grnNumber} created from supplier ${grn.supplier_name} (Invoice ${grn.supplier_invoice_no})`,
      metadata: { grnNumber, supplier: grn.supplier_name, total: grn.grand_total },
    });

    this.saveToDisk();
    return grn;
  }

  /**
   * Approves GRN: updates live stock quantities, logs inward to perpetual ledger,
   * updates purchase rate and MRP in catalog, updates supplier outstanding balance.
   */
  public approveGRN(grnId: string, approvedBy: string): GRNInvoice | null {
    const grn = this.state.grn_invoices.find((g) => g.id === grnId);
    if (!grn) return null;
    if (grn.status === "APPROVED") return grn;

    const timestamp = new Date().toISOString();
    grn.status = "APPROVED";
    grn.approved_by = approvedBy;
    grn.approved_at = timestamp;
    grn.updated_at = timestamp;

    for (const item of grn.items) {
      let prod = this.state.products.find((p) => p.id === item.product_id);
      if (!prod) {
        prod = this.state.products.find((p) => p.barcode === item.barcode);
      }

      const receivedAccepted = item.accepted_qty;

      if (prod) {
        const prevStock = prod.stock_qty;
        prod.stock_qty += receivedAccepted;
        prod.purchase_rate = item.purchase_rate;
        prod.mrp = item.mrp;
        prod.selling_price = item.selling_price;
        if (item.batch_number) prod.batch_number = item.batch_number;
        if (item.expiry_date) prod.expiry_date = item.expiry_date;
        prod.updated_at = timestamp;

        // Ledger Entry for Stock Inward
        this.state.stock_ledger.unshift({
          id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          product_id: prod.id,
          barcode: prod.barcode,
          product_name: prod.name,
          transaction_type: "GRN_INWARD",
          reference_id: grn.grn_number,
          qty_change: receivedAccepted,
          previous_stock: prevStock,
          new_stock: prod.stock_qty,
          unit_cost: item.purchase_rate,
          total_value: receivedAccepted * item.purchase_rate,
          timestamp,
          user_name: approvedBy,
          notes: `GRN ${grn.grn_number} from ${grn.supplier_name}`,
        });

        // If damage occurred, record damage write-off entry
        if (item.damaged_qty > 0) {
          this.state.stock_ledger.unshift({
            id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            product_id: prod.id,
            barcode: prod.barcode,
            product_name: prod.name,
            transaction_type: "DAMAGE_WRITE_OFF",
            reference_id: grn.grn_number,
            qty_change: -item.damaged_qty,
            previous_stock: prevStock + receivedAccepted + item.damaged_qty,
            new_stock: prod.stock_qty,
            unit_cost: item.purchase_rate,
            total_value: item.damaged_qty * item.purchase_rate,
            timestamp,
            user_name: approvedBy,
            notes: `Damaged in transit - GRN ${grn.grn_number}`,
          });
        }
      }
    }

    // Update supplier balance
    const supplier = this.state.suppliers.find((s) => s.id === grn.supplier_id);
    if (supplier) {
      supplier.outstanding_balance += grn.grand_total;
    }

    this.addAuditLog({
      user_id: "admin",
      user_name: approvedBy,
      role: "ADMIN",
      action: "APPROVE_GRN",
      module: "GRN",
      description: `Approved GRN ${grn.grn_number}. Inventory updated for ${grn.items.length} items. Total: ₹${grn.grand_total}`,
      metadata: { grnNumber: grn.grn_number, total: grn.grand_total },
    });

    this.saveToDisk();
    return grn;
  }

  // --- Cashier Shift Management ---
  public getShifts(): CashierShift[] {
    return [...this.state.shifts];
  }

  public getActiveShift(cashierId?: string): CashierShift | undefined {
    return this.state.shifts.find(
      (s) => s.status === "OPEN" && (!cashierId || s.cashier_id === cashierId)
    );
  }

  public openShift(
    cashierId: string,
    cashierName: string,
    counterId: string,
    openingFloat: number
  ): CashierShift {
    // If cashier already has an open shift, return it
    const existing = this.getActiveShift(cashierId);
    if (existing) return existing;

    const shiftNumber = this.nextShiftNumber();
    const timestamp = new Date().toISOString();

    const newShift: CashierShift = {
      id: `sh-${Date.now()}`,
      shift_number: shiftNumber,
      cashier_id: cashierId,
      cashier_name: cashierName,
      counter_id: counterId,
      opened_at: timestamp,
      opening_float: openingFloat,
      cash_sales: 0,
      upi_sales: 0,
      card_sales: 0,
      total_sales: 0,
      bills_count: 0,
      cash_refunds: 0,
      expected_cash: openingFloat,
      status: "OPEN",
    };

    this.state.shifts.unshift(newShift);

    this.addAuditLog({
      user_id: cashierId,
      user_name: cashierName,
      role: "CASHIER",
      action: "OPEN_SHIFT",
      module: "POS",
      description: `Opened Shift ${shiftNumber} at ${counterId} with Float ₹${openingFloat}`,
      metadata: { shiftNumber, counterId, openingFloat },
    });

    this.saveToDisk();
    return newShift;
  }

  public closeShift(
    shiftId: string,
    actualCash: number,
    closingNotes?: string
  ): CashierShift | null {
    const shift = this.state.shifts.find((s) => s.id === shiftId);
    if (!shift || shift.status === "CLOSED") return null;

    const timestamp = new Date().toISOString();
    shift.status = "CLOSED";
    shift.closed_at = timestamp;
    shift.actual_cash = actualCash;
    shift.difference = actualCash - shift.expected_cash;
    shift.closing_notes = closingNotes;

    this.addAuditLog({
      user_id: shift.cashier_id,
      user_name: shift.cashier_name,
      role: "CASHIER",
      action: "CLOSE_SHIFT",
      module: "POS",
      description: `Closed Shift ${shift.shift_number}. Expected Cash: ₹${shift.expected_cash}, Counted: ₹${actualCash}, Diff: ₹${shift.difference}`,
      metadata: {
        shiftNumber: shift.shift_number,
        expected: shift.expected_cash,
        actual: actualCash,
        diff: shift.difference,
      },
    });

    this.saveToDisk();
    return shift;
  }

  // --- Expenses & P&L ---
  public getExpenses(): Expense[] {
    return [...this.state.expenses];
  }

  public recordExpense(expenseData: Omit<Expense, "id" | "voucher_no" | "created_at">): Expense {
    const voucherNo = this.nextExpenseNumber();
    const timestamp = new Date().toISOString();

    const expense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      voucher_no: voucherNo,
      created_at: timestamp,
    };

    this.state.expenses.unshift(expense);

    this.addAuditLog({
      user_id: "user",
      user_name: expense.recorded_by,
      role: "ADMIN",
      action: "RECORD_EXPENSE",
      module: "EXPENSES",
      description: `Recorded expense ${voucherNo}: ₹${expense.amount} for ${expense.category} (${expense.description})`,
      metadata: { voucherNo, category: expense.category, amount: expense.amount },
    });

    this.saveToDisk();
    return expense;
  }

  // --- Perpetual Stock Ledger ---
  public getStockLedger(limit = 300, productId?: string): StockLedgerEntry[] {
    if (productId) {
      return this.state.stock_ledger.filter((e) => e.product_id === productId).slice(0, limit);
    }
    return this.state.stock_ledger.slice(0, limit);
  }

  // --- Business Intelligence & Dashboard Reporting ---
  public getDashboardMetrics() {
    const todayStr = new Date().toISOString().substring(0, 10);

    const todayBills = this.state.bills.filter(
      (b) => b.date.substring(0, 10) === todayStr && b.status === "COMPLETED"
    );

    const totalSalesToday = todayBills.reduce((acc, b) => acc + b.grand_total, 0);
    const totalBillsToday = todayBills.length;
    const avgBasketValue = totalBillsToday > 0 ? Math.round(totalSalesToday / totalBillsToday) : 0;

    let cashSalesToday = 0;
    let upiSalesToday = 0;
    let cardSalesToday = 0;

    for (const b of todayBills) {
      for (const p of b.payments) {
        if (p.mode === "CASH") cashSalesToday += p.amount;
        if (p.mode === "UPI") upiSalesToday += p.amount;
        if (p.mode === "CARD") cardSalesToday += p.amount;
      }
    }

    // Inventory Alerts
    const lowStockItems = this.state.products.filter(
      (p) => p.is_active && p.stock_qty <= p.min_stock_alert
    );

    const now = new Date();
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const expiringSoonItems = this.state.products.filter((p) => {
      if (!p.expiry_date) return false;
      const exp = new Date(p.expiry_date);
      return exp <= in60Days;
    });

    // Stock Valuation
    const totalStockCostValuation = this.state.products.reduce(
      (acc, p) => acc + p.stock_qty * p.purchase_rate,
      0
    );
    const totalStockMrpValuation = this.state.products.reduce(
      (acc, p) => acc + p.stock_qty * p.mrp,
      0
    );

    // Expenses Today
    const todayExpenses = this.state.expenses.filter((e) => e.date === todayStr);
    const totalExpensesToday = todayExpenses.reduce((acc, e) => acc + e.amount, 0);

    // Active Counters
    const activeShift = this.getActiveShift();
    const activeGRNsCount = this.state.grn_invoices.filter((g) => g.status === "DRAFT").length;

    return {
      todayStr,
      totalSalesToday,
      totalBillsToday,
      avgBasketValue,
      cashSalesToday,
      upiSalesToday,
      cardSalesToday,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.slice(0, 10),
      expiringSoonCount: expiringSoonItems.length,
      expiringSoonItems: expiringSoonItems.slice(0, 10),
      totalStockCostValuation,
      totalStockMrpValuation,
      totalExpensesToday,
      activeShift: activeShift
        ? {
            shift_number: activeShift.shift_number,
            cashier_name: activeShift.cashier_name,
            counter_id: activeShift.counter_id,
            opened_at: activeShift.opened_at,
            total_sales: activeShift.total_sales,
            bills_count: activeShift.bills_count,
          }
        : null,
      pendingGRNCount: activeGRNsCount,
    };
  }
}

// Global Singleton Instance
let dbInstance: UrbanMartDatabase | null = null;

export function getDatabase(): UrbanMartDatabase {
  if (!dbInstance) {
    dbInstance = new UrbanMartDatabase();
  }
  return dbInstance;
}
