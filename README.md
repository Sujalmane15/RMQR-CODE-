# URBAN MART CRM & SUPERMARKET MANAGEMENT SYSTEM

> **Production-Ready Multi-Counter Supermarket POS, GRN Inward, Real-Time Perpetual Stock Ledger, Indian GST Engine & Thermal Printing System**  
> *Inspired by high-volume suburban supermarkets (B-Mart Ghansoli, Navi Mumbai style).*

---

## 🌟 Executive Overview & Key Highlights

**Urban Mart** is a high-speed, enterprise-grade supermarket operating system designed to manage high retail footfalls, multi-counter workflows, real-time inventory adjustments, and statutory Indian GST compliance.

1. **3 Dedicated Counter / Role Profiles**:
   - **Profile A: GRN / Stock Inward Bay (`Counter 2`)** — Supplier invoice intake, barcode scanning, batch & expiry tracking, damage & shortage write-offs, 1-click approval & live ledger update, printable GRN vouchers.
   - **Profile B: Billing / POS Counter (`Counter 1`)** — High-speed keyboard shortcut navigation (F1-F10), barcode wedge scanning, cart tax calculations, Cash / UPI dynamic QR / Card / Split tender, multi-cart hold & resume, sales returns, cashier shift reconciliation.
   - **Profile C: Main Admin / Owner Console** — Real-time executive dashboards, product & barcode catalog, supplier & customer CRM, perpetual stock ledger, RBAC, expense vouchers, P&L reporting, store & thermal printer config.
2. **Indian GST Slabs Supported**:
   - **0% GST**: Fresh staples, loose grains, unpackaged fresh milk, eggs (HSN: 0703, 0701, 0401, 1006).
   - **5% GST**: Packaged staples, edible oils, tea, iodised salt, spices (HSN: 1512, 2501, 1101, 0902).
   - **12% GST**: Processed dairy, butter, ghee, fruit juices, sauces (HSN: 0405, 0406, 2009, 2103).
   - **18% GST**: Soaps, detergents, shampoos, biscuits, snacks, cleaning products (HSN: 3402, 3401, 3306, 1905).
   - **28% GST**: Aerated carbonated cold drinks, chocolates, energy drinks (HSN: 2202, 1806).
   - Intra-state (CGST + SGST equal split) and Inter-state (IGST) calculation with 2-decimal arithmetic precision and nearest-rupee retail rounding.
3. **Hardware & Thermal Printer Ready**:
   - Native format support for standard **80mm thermal receipt printers** (~44 cols) and **58mm compact printers** (~32 cols), with cut lines and feed margins.
   - Standard **A4 Tax Invoice format** for institutional buyers.
   - Zero-driver direct ESC/POS plain text copy.
4. **Dual Engine Persistence**:
   - **Zero-Dependency Out-of-the-Box**: Atomic JSON disk persistence (`data/urbanmart-db.json`) with monotonic sequential numbering (`UM-2026-00001`, `GRN-2026-00001`, `SH-2026-00001`, `RT-2026-00001`).
   - **PostgreSQL Enterprise Schema**: Complete SQL migrations in `src/lib/db/schema.sql` with foreign keys, checks, and performance indexes.

---

## 🔑 Login Profiles & Default Credentials

| Profile | Role | Assigned Counter | Default Email | Password | Primary Workflow |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Profile A** | `GRN_OPERATOR` | Counter 2 (Inward Bay) | `grn@urbanmart.com` | `Grn@123` | Supplier invoices, receiving, expiry, damage, GRN approval |
| **Profile B** | `CASHIER` | Counter 1 (Express POS) | `cashier1@urbanmart.com` | `Cashier@123` | Fast checkout, barcode scanning, payments, hold/resume, shifts |
| **Profile C** | `ADMIN` | Central Admin Console | `admin@urbanmart.com` | `Admin@123` | Live BI metrics, catalog CRUD, CRM, stock ledger, expenses, P&L |

*Passwords are securely hashed using cryptographically salted PBKDF2 (10,000 rounds, SHA-256).*

---

## ⌨️ POS Billing Keyboard Shortcuts Cheatsheet

Supermarket billing counters need blazing speed. The POS Counter supports direct function key access:

| Shortcut | Action | Description |
| :---: | :--- | :--- |
| **`F1`** | **Scan / Focus** | Focuses the barcode scan input and selects text for immediate scanning |
| **`F2`** | **Hold Bill** | Parks the current active cart to serve the next customer |
| **`F3`** | **Recall Cart** | Displays the list of held/parked carts with timestamps and items to resume |
| **`F4`** | **Payment Dialog** | Opens tender selection modal (Cash, UPI, Card, Split) |
| **`F5`** | **Discount** | Apply bill-level discount (Percentage or Flat Rupee amount) |
| **`F6`** | **Customer CRM** | Look up customer by 10-digit mobile number, show accumulated loyalty points |
| **`F7`** | **Sales Return** | Open sales return & refund dialog (restock good items, write off damaged) |
| **`F8`** | **Reprint Last** | Immediately previews and prints the most recent finalized invoice |
| **`F9`** | **Shift Summary** | Cashier drawer reconciliation: opening float, cash sales, refunds, counted cash |
| **`F10`** | **Settle & Print** | Fast checkout confirmation & launches receipt printer |
| **`Esc`** | **Dismiss Modal** | Closes any open dialog without losing the active cart |

---

## 🏗️ Project Architecture & Directory Map

```
d:\rmqr\urbanmart/
├── package.json               # Dedicated package config (scripts: dev, build, test)
├── tsconfig.json              # TypeScript compilation config
├── vitest.config.ts           # Automated test harness configuration
├── README.md                  # Comprehensive documentation
├── data/
│   └── urbanmart-db.json      # Atomic persistent database store (with backup)
├── src/
│   ├── types/
│   │   └── index.ts           # Complete TypeScript domain models
│   ├── lib/
│   │   ├── auth.ts            # PBKDF2 password hashing & HMAC session tokens
│   │   ├── tax.ts             # Indian GST tax engine (0%, 5%, 12%, 18%, 28%)
│   │   ├── receipt.ts         # Thermal receipt generator (80mm / 58mm / A4)
│   │   └── db/
│   │       ├── index.ts       # Unified database export
│   │       ├── memory-db.ts   # In-memory + atomic JSON disk persistence engine
│   │       ├── schema.sql     # Enterprise PostgreSQL schema & migrations
│   │       └── seed-data.ts   # Realistic B-Mart Ghansoli supermarket dataset
│   ├── server/
│   │   ├── api-handler.ts     # REST controller for all 12 business modules
│   │   └── standalone-server.ts # Standalone zero-overhead HTTP server
│   ├── components/
│   │   ├── Navbar.tsx         # Brand header, profile switcher & live clock
│   │   ├── POSCounter.tsx     # Profile B: Cashier POS interface with F1-F10
│   │   ├── GRNCounter.tsx     # Profile A: Stock Inward & GRN approval bay
│   │   ├── AdminDashboard.tsx # Profile C: Executive console & stock ledger
│   │   └── ThermalReceiptModal.tsx # Printable receipt dialog with format toggle
│   └── app/
│       ├── layout.tsx         # Root Next.js layout
│       ├── page.tsx           # Multi-profile interactive application
│       ├── globals.css        # Tailwind CSS & print media styles
│       └── api/
│           └── [...slug]/route.ts # Next.js API catch-all route
└── tests/
    ├── tax.test.ts            # GST calculation precision & slabs test suite
    ├── auth.test.ts           # PBKDF2 hashing, sessions & RBAC test suite
    ├── pos.test.ts            # Monotonic bill numbering & inventory decrement
    ├── grn.test.ts            # GRN inward, damage write-off & approval test suite
    ├── shift.test.ts          # Cashier shift opening, refunds & drawer balance
    ├── receipt.test.ts        # ESC/POS thermal formatting (80mm/58mm) & wrapping
    └── db.test.ts             # Master catalog CRUD & live KPI test suite
```

---

## 🚀 Running & Verification Instructions

### 1. Run Automated Test Suite
From `d:\rmqr\urbanmart` (or root):
```cmd
cmd.exe /c "npx vitest run urbanmart/tests"
```
Or inside `urbanmart`:
```cmd
cmd.exe /c "npm test"
```

### 2. Start the Development Server
```cmd
cmd.exe /c "npm run dev"
```
The application will launch on `http://localhost:3001`.

### 3. Build for Production
```cmd
cmd.exe /c "npm run build"
```

---

## 🖨️ Thermal Printer Setup & Calibration Guide

### Standard 80mm POS Thermal Printers (Epson TM-T82, TVS RP-3200, Posiflex)
- In Urban Mart, click **Store & Printer Config** in the Admin Console.
- Set **Default Thermal Paper Size** to `80mm`.
- In the browser print dialog:
  - Destination: Select your thermal receipt printer.
  - Paper size: `80 x 297 mm` (or `Roll Paper 80mm`).
  - Margins: `None` / `0mm`.
  - Headers and footers: `Unchecked`.
- Enable Auto-Cut: The print routine outputs trailing line feeds to trigger the hardware cutter.

### Compact 58mm Thermal Printers (Everycom, NGX, Bluetooth Mini)
- Select `58mm Compact POS Thermal`. The line layout automatically shifts to 32 monospace columns, formatting item names and totals cleanly on narrow rolls.

---

## 💾 Backup, Recovery & Disaster Recovery

1. **Live Database Location**:
   `d:\rmqr\urbanmart\data\urbanmart-db.json`
2. **Scheduled Backup**:
   The engine uses atomic write operations (`.tmp` write followed by atomic rename), preventing corrupted partial writes if power is lost during a bill settlement.
3. **Manual Snapshot**:
   To backup current store data, copy `urbanmart-db.json` to an external drive or cloud bucket.
4. **Restoration**:
   Replacing `urbanmart-db.json` and restarting the application immediately restores all product balances, supplier records, and historical bills.

---

## 🛡️ PostgreSQL Production Deployment

When scaling to a multi-store chain:
1. Create a PostgreSQL 15+ database:
   ```sql
   CREATE DATABASE urbanmart_db;
   ```
2. Execute the schema script:
   ```cmd
   psql -U postgres -d urbanmart_db -f urbanmart/src/lib/db/schema.sql
   ```
3. Set the environment variable:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/urbanmart_db
   ```
