-- ============================================================================
-- URBAN MART CRM & SUPERMARKET MANAGEMENT SYSTEM
-- PostgreSQL Enterprise Production Schema & Migrations
-- Location: Sector 19, Ghansoli, Navi Mumbai, Maharashtra 400701
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Store Configuration
CREATE TABLE IF NOT EXISTS store_config (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'default',
    store_name VARCHAR(150) NOT NULL,
    branch_name VARCHAR(100),
    tagline VARCHAR(255),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'Maharashtra',
    state_code VARCHAR(5) NOT NULL DEFAULT '27',
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    gstin VARCHAR(20) NOT NULL,
    fssai_lic_no VARCHAR(30) NOT NULL,
    cin_no VARCHAR(30),
    receipt_footer_msg TEXT,
    thermal_paper_size VARCHAR(10) DEFAULT '80mm',
    auto_cut BOOLEAN DEFAULT TRUE,
    currency_symbol VARCHAR(5) DEFAULT '₹',
    loyalty_points_per_100 NUMERIC(10,2) DEFAULT 1.00,
    loyalty_point_value NUMERIC(10,2) DEFAULT 1.00,
    supervisor_discount_limit_percent NUMERIC(5,2) DEFAULT 10.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & RBAC
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'CASHIER', 'GRN_OPERATOR')),
    counter_assigned VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Master Catalog
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    barcode VARCHAR(64) UNIQUE NOT NULL,
    sku VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    brand VARCHAR(100) NOT NULL,
    hsn VARCHAR(20) NOT NULL,
    unit VARCHAR(10) NOT NULL CHECK (unit IN ('PCS', 'KG', 'PACK', 'LTR', 'GM', 'BOX')),
    mrp NUMERIC(12,2) NOT NULL,
    purchase_rate NUMERIC(12,2) NOT NULL,
    selling_price NUMERIC(12,2) NOT NULL,
    gst_rate INT NOT NULL CHECK (gst_rate IN (0, 5, 12, 18, 28)),
    stock_qty NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    min_stock_alert NUMERIC(12,3) NOT NULL DEFAULT 10.000,
    is_active BOOLEAN DEFAULT TRUE,
    batch_number VARCHAR(64),
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);

-- 4. Product Batches
CREATE TABLE IF NOT EXISTS product_batches (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(64) NOT NULL,
    mfg_date DATE,
    expiry_date DATE,
    purchase_rate NUMERIC(12,2) NOT NULL,
    mrp NUMERIC(12,2) NOT NULL,
    selling_price NUMERIC(12,2) NOT NULL,
    stock_qty NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Suppliers CRM
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    gstin VARCHAR(20) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50) DEFAULT 'Maharashtra',
    payment_terms_days INT DEFAULT 15,
    outstanding_balance NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Customers CRM & Loyalty
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    address TEXT,
    loyalty_points NUMERIC(10,2) DEFAULT 0.00,
    total_spend NUMERIC(14,2) DEFAULT 0.00,
    visits_count INT DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_phone ON customers(phone);

-- 7. Goods Receipt Notes (GRN - Stock Inward)
CREATE TABLE IF NOT EXISTS grn_invoices (
    id VARCHAR(36) PRIMARY KEY,
    grn_number VARCHAR(32) UNIQUE NOT NULL,
    supplier_id VARCHAR(36) REFERENCES suppliers(id),
    supplier_name VARCHAR(150) NOT NULL,
    supplier_invoice_no VARCHAR(100) NOT NULL,
    supplier_invoice_date DATE NOT NULL,
    delivery_challan_no VARCHAR(100),
    vehicle_no VARCHAR(50),
    subtotal NUMERIC(14,2) NOT NULL,
    total_tax NUMERIC(14,2) NOT NULL,
    grand_total NUMERIC(14,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    received_by VARCHAR(100) NOT NULL,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grn_items (
    id VARCHAR(36) PRIMARY KEY,
    grn_id VARCHAR(36) REFERENCES grn_invoices(id) ON DELETE CASCADE,
    product_id VARCHAR(36) REFERENCES products(id),
    barcode VARCHAR(64) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    batch_number VARCHAR(64),
    mfg_date DATE,
    expiry_date DATE,
    invoiced_qty NUMERIC(12,3) NOT NULL,
    received_qty NUMERIC(12,3) NOT NULL,
    damaged_qty NUMERIC(12,3) DEFAULT 0.000,
    shortage_qty NUMERIC(12,3) DEFAULT 0.000,
    accepted_qty NUMERIC(12,3) NOT NULL,
    purchase_rate NUMERIC(12,2) NOT NULL,
    mrp NUMERIC(12,2) NOT NULL,
    selling_price NUMERIC(12,2) NOT NULL,
    gst_rate INT NOT NULL,
    tax_amount NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL
);

-- 8. Cashier Shift Management
CREATE TABLE IF NOT EXISTS cashier_shifts (
    id VARCHAR(36) PRIMARY KEY,
    shift_number VARCHAR(32) UNIQUE NOT NULL,
    cashier_id VARCHAR(36) REFERENCES users(id),
    cashier_name VARCHAR(100) NOT NULL,
    counter_id VARCHAR(50) NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_float NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_sales NUMERIC(14,2) DEFAULT 0.00,
    upi_sales NUMERIC(14,2) DEFAULT 0.00,
    card_sales NUMERIC(14,2) DEFAULT 0.00,
    total_sales NUMERIC(14,2) DEFAULT 0.00,
    bills_count INT DEFAULT 0,
    cash_refunds NUMERIC(12,2) DEFAULT 0.00,
    expected_cash NUMERIC(14,2) DEFAULT 0.00,
    actual_cash NUMERIC(14,2),
    difference NUMERIC(14,2),
    status VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    closing_notes TEXT
);

-- 9. Sales Invoices / Bills
CREATE TABLE IF NOT EXISTS bills (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(32) UNIQUE NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cashier_id VARCHAR(36) REFERENCES users(id),
    cashier_name VARCHAR(100) NOT NULL,
    counter_id VARCHAR(50) NOT NULL,
    customer_id VARCHAR(36) REFERENCES customers(id),
    customer_phone VARCHAR(20),
    customer_name VARCHAR(100),
    total_items INT NOT NULL,
    total_qty NUMERIC(12,3) NOT NULL,
    subtotal_mrp NUMERIC(14,2) NOT NULL,
    item_discount_total NUMERIC(12,2) DEFAULT 0.00,
    bill_discount_percent NUMERIC(5,2) DEFAULT 0.00,
    bill_discount_amount NUMERIC(12,2) DEFAULT 0.00,
    taxable_subtotal NUMERIC(14,2) NOT NULL,
    cgst_total NUMERIC(12,2) NOT NULL,
    sgst_total NUMERIC(12,2) NOT NULL,
    igst_total NUMERIC(12,2) DEFAULT 0.00,
    cess_total NUMERIC(12,2) DEFAULT 0.00,
    total_tax NUMERIC(12,2) NOT NULL,
    round_off NUMERIC(6,2) DEFAULT 0.00,
    grand_total NUMERIC(14,2) NOT NULL,
    payment_mode VARCHAR(10) NOT NULL CHECK (payment_mode IN ('CASH', 'UPI', 'CARD', 'SPLIT')),
    payments JSONB NOT NULL DEFAULT '[]'::jsonb,
    tender_amount NUMERIC(14,2) DEFAULT 0.00,
    change_returned NUMERIC(14,2) DEFAULT 0.00,
    loyalty_points_earned NUMERIC(10,2) DEFAULT 0.00,
    loyalty_points_redeemed NUMERIC(10,2) DEFAULT 0.00,
    status VARCHAR(15) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'HELD', 'CANCELLED', 'RETURNED', 'REFUNDED')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bills_invoice_num ON bills(invoice_number);
CREATE INDEX idx_bills_date ON bills(date);

CREATE TABLE IF NOT EXISTS bill_items (
    id VARCHAR(36) PRIMARY KEY,
    bill_id VARCHAR(36) REFERENCES bills(id) ON DELETE CASCADE,
    product_id VARCHAR(36) REFERENCES products(id),
    barcode VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    mrp NUMERIC(12,2) NOT NULL,
    selling_price NUMERIC(12,2) NOT NULL,
    qty NUMERIC(12,3) NOT NULL,
    gst_rate INT NOT NULL,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    taxable_value NUMERIC(12,2) NOT NULL,
    cgst NUMERIC(12,2) NOT NULL,
    sgst NUMERIC(12,2) NOT NULL,
    igst NUMERIC(12,2) DEFAULT 0.00,
    cess NUMERIC(12,2) DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL
);

-- 10. Held Bills (Parked Carts)
CREATE TABLE IF NOT EXISTS held_bills (
    id VARCHAR(36) PRIMARY KEY,
    held_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cashier_id VARCHAR(36) REFERENCES users(id),
    cashier_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),
    customer_name VARCHAR(100),
    items JSONB NOT NULL,
    subtotal NUMERIC(14,2) NOT NULL,
    note TEXT
);

-- 11. Sales Returns & Refunds
CREATE TABLE IF NOT EXISTS sales_returns (
    id VARCHAR(36) PRIMARY KEY,
    return_number VARCHAR(32) UNIQUE NOT NULL,
    original_invoice_number VARCHAR(32) NOT NULL,
    original_bill_id VARCHAR(36) REFERENCES bills(id),
    customer_phone VARCHAR(20),
    return_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    items JSONB NOT NULL,
    refund_amount NUMERIC(12,2) NOT NULL,
    refund_method VARCHAR(15) NOT NULL CHECK (refund_method IN ('CASH', 'CREDIT_NOTE')),
    credit_note_code VARCHAR(32),
    reason TEXT NOT NULL,
    processed_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Expenses & P&L
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(36) PRIMARY KEY,
    voucher_no VARCHAR(32) UNIQUE NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('RENT', 'ELECTRICITY', 'SALARY', 'PACKAGING', 'MAINTENANCE', 'INTERNET_PHONE', 'MARKETING', 'OTHER')),
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    paid_to VARCHAR(150) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('CASH', 'UPI', 'BANK_TRANSFER')),
    recorded_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Perpetual Stock Ledger (Inventory Audit Trail)
CREATE TABLE IF NOT EXISTS stock_ledger (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) REFERENCES products(id),
    barcode VARCHAR(64) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('GRN_INWARD', 'POS_SALE', 'SALES_RETURN', 'DAMAGE_WRITE_OFF', 'MANUAL_ADJUSTMENT')),
    reference_id VARCHAR(64) NOT NULL,
    qty_change NUMERIC(12,3) NOT NULL,
    previous_stock NUMERIC(12,3) NOT NULL,
    new_stock NUMERIC(12,3) NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL,
    total_value NUMERIC(14,2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_name VARCHAR(100) NOT NULL,
    notes TEXT
);

CREATE INDEX idx_ledger_product ON stock_ledger(product_id);
CREATE INDEX idx_ledger_time ON stock_ledger(timestamp);

-- 14. Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    user_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_time ON audit_logs(timestamp);
