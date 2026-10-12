"use client";

import React, { useState } from "react";
import {
  AuditLog,
  Bill,
  Customer,
  Expense,
  ExpenseCategory,
  GRNInvoice,
  GSTRate,
  Product,
  ProductUnit,
  StockLedgerEntry,
  StoreConfig,
  Supplier,
  User,
} from "../types";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building,
  Users,
  FileText,
  Printer,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle,
  BarChart3,
  Receipt,
  Search,
} from "lucide-react";

interface AdminDashboardProps {
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  bills: Bill[];
  grnList: GRNInvoice[];
  expenses: Expense[];
  stockLedger: StockLedgerEntry[];
  auditLogs: AuditLog[];
  storeConfig: StoreConfig;
  users: User[];
  onAddProduct: (prod: any) => Promise<Product>;
  onUpdateProduct: (id: string, prod: any) => Promise<Product | undefined>;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onAddSupplier: (sup: any) => Promise<Supplier>;
  onAddExpense: (exp: any) => Promise<Expense>;
  onUpdateSettings: (settings: Partial<StoreConfig>) => Promise<StoreConfig>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  suppliers,
  customers,
  bills,
  grnList,
  expenses,
  stockLedger,
  auditLogs,
  storeConfig,
  users,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddSupplier,
  onAddExpense,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<
    | "OVERVIEW"
    | "PRODUCTS"
    | "LEDGER"
    | "SUPPLIERS"
    | "CUSTOMERS"
    | "EXPENSES"
    | "AUDIT"
    | "SETTINGS"
  >("OVERVIEW");

  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Financial & KPI Calculations ---
  const todayStr = new Date().toISOString().substring(0, 10);
  const todayBills = bills.filter(
    (b) => b.date.substring(0, 10) === todayStr && b.status === "COMPLETED"
  );

  const todayRevenue = todayBills.reduce((acc, b) => acc + b.grand_total, 0);
  const totalBillsCount = todayBills.length;
  const avgBasket = totalBillsCount > 0 ? Math.round(todayRevenue / totalBillsCount) : 0;

  // Cost of Goods Sold for today's completed bills
  let todayCOGS = 0;
  for (const b of todayBills) {
    for (const it of b.items) {
      const prod = products.find((p) => p.id === it.product_id);
      if (prod) {
        todayCOGS += it.qty * prod.purchase_rate;
      }
    }
  }

  const grossProfitToday = todayRevenue - todayCOGS;
  const grossMarginPercent =
    todayRevenue > 0 ? Math.round((grossProfitToday / todayRevenue) * 100) : 0;

  // Stock valuation
  const totalStockCost = products.reduce((acc, p) => acc + p.stock_qty * p.purchase_rate, 0);
  const totalStockMRP = products.reduce((acc, p) => acc + p.stock_qty * p.mrp, 0);

  // Alerts
  const lowStockProducts = products.filter((p) => p.stock_qty <= p.min_stock_alert);

  const now = new Date().getTime();
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  const expiringProducts = products.filter((p) => {
    if (!p.expiry_date) return false;
    return new Date(p.expiry_date).getTime() - now <= sixtyDaysMs;
  });

  // --- Product Form State ---
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodBarcode, setProdBarcode] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState("Grocery & Staples");
  const [prodBrand, setProdBrand] = useState("Urban Mart");
  const [prodHsn, setProdHsn] = useState("1006");
  const [prodUnit, setProdUnit] = useState<ProductUnit>("PACK");
  const [prodPurchaseRate, setProdPurchaseRate] = useState<number>(100);
  const [prodSellingPrice, setProdSellingPrice] = useState<number>(120);
  const [prodMrp, setProdMrp] = useState<number>(130);
  const [prodGstRate, setProdGstRate] = useState<GSTRate>(5);
  const [prodStockQty, setProdStockQty] = useState<number>(50);
  const [prodMinAlert, setProdMinAlert] = useState<number>(10);

  // --- Expense Form State ---
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("RENT");
  const [expAmount, setExpAmount] = useState<number>(1000);
  const [expDescription, setExpDescription] = useState("");
  const [expPaidTo, setExpPaidTo] = useState("");
  const [expMode, setExpMode] = useState<"CASH" | "UPI" | "BANK_TRANSFER">("UPI");

  // --- Settings Form State ---
  const [cfgStoreName, setCfgStoreName] = useState(storeConfig.store_name);
  const [cfgBranch, setCfgBranch] = useState(storeConfig.branch_name);
  const [cfgGstin, setCfgGstin] = useState(storeConfig.gstin);
  const [cfgFssai, setCfgFssai] = useState(storeConfig.fssai_lic_no);
  const [cfgPhone, setCfgPhone] = useState(storeConfig.phone);
  const [cfgAddress, setCfgAddress] = useState(storeConfig.address_line1);
  const [cfgPaperSize, setCfgPaperSize] = useState(storeConfig.thermal_paper_size);

  // Search filter for products table
  const [productSearch, setProductSearch] = useState("");

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodBarcode || !prodName) {
      notify("Barcode and Product Name are required");
      return;
    }

    const payload = {
      barcode: prodBarcode,
      sku: "SKU-" + prodBarcode.slice(-4),
      name: prodName,
      category: prodCategory,
      subcategory: prodCategory,
      brand: prodBrand,
      hsn: prodHsn,
      unit: prodUnit,
      purchase_rate: Number(prodPurchaseRate),
      selling_price: Number(prodSellingPrice),
      mrp: Number(prodMrp),
      gst_rate: Number(prodGstRate) as GSTRate,
      stock_qty: Number(prodStockQty),
      min_stock_alert: Number(prodMinAlert),
      is_active: true,
    };

    if (editingProductId) {
      await onUpdateProduct(editingProductId, payload);
      notify("Product updated successfully");
    } else {
      await onAddProduct(payload);
      notify("New product added to master catalog");
    }

    setShowProductModal(false);
    setEditingProductId(null);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || !expPaidTo) {
      notify("Amount and recipient required");
      return;
    }
    await onAddExpense({
      category: expCategory,
      amount: Number(expAmount),
      date: new Date().toISOString().substring(0, 10),
      description: expDescription || expCategory,
      paid_to: expPaidTo,
      payment_mode: expMode,
      recorded_by: "Sujal Mane (Admin)",
    });
    setShowExpenseModal(false);
    notify("Expense recorded successfully");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      store_name: cfgStoreName,
      branch_name: cfgBranch,
      gstin: cfgGstin,
      fssai_lic_no: cfgFssai,
      phone: cfgPhone,
      address_line1: cfgAddress,
      thermal_paper_size: cfgPaperSize as any,
    });
    notify("Store & Printer settings updated");
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-slate-100 text-slate-800">
      {/* Toast */}
      {notification && (
        <div className="fixed top-18 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl bg-slate-900 text-white text-xs font-semibold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Admin Top Tab Navigation */}
      <div className="bg-slate-900 text-white px-6 py-2 border-b border-slate-800 flex items-center justify-between overflow-x-auto">
        <div className="flex space-x-1">
          {[
            { id: "OVERVIEW", label: "Executive Dashboard", icon: BarChart3 },
            { id: "PRODUCTS", label: "Products Master", icon: ShoppingCart },
            { id: "LEDGER", label: "Perpetual Stock Ledger", icon: Boxes },
            { id: "SUPPLIERS", label: "Suppliers CRM", icon: Building },
            { id: "CUSTOMERS", label: "Customers CRM", icon: Users },
            { id: "EXPENSES", label: "Expenses & P&L", icon: DollarSign },
            { id: "AUDIT", label: "Audit Trail", icon: ShieldCheck },
            { id: "SETTINGS", label: "Store & Printer Config", icon: Printer },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* --- TAB 1: EXECUTIVE OVERVIEW --- */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-6">
            {/* Top Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Today's Total Sales</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  ₹{todayRevenue.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  From <strong>{totalBillsCount}</strong> completed POS bills
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Gross Profit & Margin</span>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-emerald-600 mt-2">
                  ₹{grossProfitToday.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Margin: <strong className="text-emerald-700">{grossMarginPercent}%</strong> (COGS: ₹{todayCOGS.toFixed(2)})
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Inventory Valuation</span>
                  <Boxes className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  ₹{Math.round(totalStockCost).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  At Cost Price (MRP Value: ₹{Math.round(totalStockMRP).toLocaleString("en-IN")})
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Inventory Alerts</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-600 mt-2">
                  {lowStockProducts.length + expiringProducts.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {lowStockProducts.length} Low Stock • {expiringProducts.length} Expiring Soon
                </div>
              </div>
            </div>

            {/* Counter Monitors & Live Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Counters Monitor */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Real-Time Multi-Counter Status</span>
                </h3>

                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Counter 1 (Express POS Billing)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Cashier: Ramesh Pawar • Active Cash Register
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>ONLINE</span>
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Counter 2 (GRN Stock Inward Bay)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Supervisor: Vikas Kadam • Total Inward Notes: {grnList.length}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>INWARD ACTIVE</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Critical Alerts: Low Stock & Expiry */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Critical Stock Alerts & Near Expiry</span>
                </h3>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                  {lowStockProducts.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-rose-900">{p.name}</div>
                        <div className="text-[10px] text-rose-600 font-mono">
                          Barcode: {p.barcode} • Min Alert: {p.min_stock_alert}
                        </div>
                      </div>
                      <span className="font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-300">
                        Stock: {p.stock_qty} {p.unit}
                      </span>
                    </div>
                  ))}

                  {expiringProducts.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-amber-900">{p.name}</div>
                        <div className="text-[10px] text-amber-600 font-mono">
                          Expires: {p.expiry_date}
                        </div>
                      </div>
                      <span className="font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-300">
                        Stock: {p.stock_qty}
                      </span>
                    </div>
                  ))}

                  {lowStockProducts.length === 0 && expiringProducts.length === 0 && (
                    <div className="text-center py-8 text-slate-400">All inventory levels healthy.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: PRODUCTS MASTER --- */}
        {activeTab === "PRODUCTS" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Filter products..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingProductId(null);
                  setProdBarcode("890" + Math.floor(1000000000 + Math.random() * 9000000000));
                  setProdName("");
                  setShowProductModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Product</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2">HSN</th>
                    <th className="py-2.5 px-2 text-right">Cost (₹)</th>
                    <th className="py-2.5 px-2 text-right">Sale (₹)</th>
                    <th className="py-2.5 px-2 text-right">MRP (₹)</th>
                    <th className="py-2.5 px-2 text-center">GST %</th>
                    <th className="py-2.5 px-2 text-right">Stock</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products
                    .filter((p) => {
                      const q = productSearch.toLowerCase();
                      return (
                        p.name.toLowerCase().includes(q) ||
                        p.barcode.includes(q) ||
                        p.category.toLowerCase().includes(q)
                      );
                    })
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">{p.barcode}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{p.name}</td>
                        <td className="py-2.5 px-2 text-slate-500">{p.category}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-500">{p.hsn}</td>
                        <td className="py-2.5 px-2 text-right">₹{p.purchase_rate.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right font-medium text-emerald-700">
                          ₹{p.selling_price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-400">₹{p.mrp.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {p.gst_rate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold">
                          <span
                            className={
                              p.stock_qty <= p.min_stock_alert ? "text-rose-600" : "text-slate-900"
                            }
                          >
                            {p.stock_qty} {p.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProductId(p.id);
                              setProdBarcode(p.barcode);
                              setProdName(p.name);
                              setProdCategory(p.category);
                              setProdBrand(p.brand);
                              setProdHsn(p.hsn);
                              setProdUnit(p.unit);
                              setProdPurchaseRate(p.purchase_rate);
                              setProdSellingPrice(p.selling_price);
                              setProdMrp(p.mrp);
                              setProdGstRate(p.gst_rate);
                              setProdStockQty(p.stock_qty);
                              setProdMinAlert(p.min_stock_alert);
                              setShowProductModal(true);
                            }}
                            className="p-1 text-slate-500 hover:text-slate-800 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteProduct(p.id);
                              notify("Product deleted");
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 3: PERPETUAL STOCK LEDGER --- */}
        {activeTab === "LEDGER" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Perpetual Inventory Stock Ledger</h3>
              <p className="text-xs text-slate-500">
                Complete audit trail of all GRN inward, POS sales, sales returns, and manual adjustments
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-2">Transaction Type</th>
                    <th className="py-2.5 px-2 font-mono">Reference #</th>
                    <th className="py-2.5 px-2 text-right">Qty Change</th>
                    <th className="py-2.5 px-2 text-right">Prev Stock</th>
                    <th className="py-2.5 px-2 text-right font-bold">New Balance</th>
                    <th className="py-2.5 px-2 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {stockLedger.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 text-slate-500 font-sans">
                        {new Date(e.timestamp).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                        {e.product_name}
                      </td>
                      <td className="py-2 px-2 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            e.transaction_type === "GRN_INWARD"
                              ? "bg-emerald-100 text-emerald-800"
                              : e.transaction_type === "POS_SALE"
                              ? "bg-blue-100 text-blue-800"
                              : e.transaction_type === "SALES_RETURN"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {e.transaction_type}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-600">{e.reference_id}</td>
                      <td
                        className={`py-2 px-2 text-right font-bold ${
                          e.qty_change > 0 ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {e.qty_change > 0 ? "+" : ""}
                        {e.qty_change}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-500">{e.previous_stock}</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900">{e.new_stock}</td>
                      <td className="py-2 px-2 text-right text-slate-600">₹{e.unit_cost.toFixed(2)}</td>
                      <td className="py-2 px-3 text-slate-600 font-sans">{e.user_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 4: SUPPLIERS CRM --- */}
        {activeTab === "SUPPLIERS" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Registered Supermarket Suppliers</h3>
                <p className="text-xs text-slate-500">Authorized FMCG depots and distributors</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-3">GSTIN</th>
                    <th className="py-3 px-3">Contact Person</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3 text-center">Credit Terms</th>
                    <th className="py-3 px-4 text-right">Outstanding Payables</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{s.gstin}</td>
                      <td className="py-3 px-3 text-slate-700">{s.contact_person}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{s.phone}</td>
                      <td className="py-3 px-3 text-center font-medium text-slate-600">
                        {s.payment_terms_days} Days
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        ₹{s.outstanding_balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 5: CUSTOMERS CRM & LOYALTY --- */}
        {activeTab === "CUSTOMERS" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Customer CRM Directory & Loyalty Program</h3>
              <p className="text-xs text-slate-500">
                Frequent shoppers with purchase volume and accumulated reward points
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-3">Mobile Phone</th>
                    <th className="py-3 px-3 text-center">Visits</th>
                    <th className="py-3 px-3 text-right">Total Lifetime Spend</th>
                    <th className="py-3 px-4 text-right">Loyalty Points Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{c.phone}</td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-600">{c.visits_count}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ₹{c.total_spend.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">
                        {c.loyalty_points} Pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 6: EXPENSES & P&L --- */}
        {activeTab === "EXPENSES" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Store Operational Expenses</h3>
                  <p className="text-xs text-slate-500">Rent, electricity, packaging, and maintenance</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Expense</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Voucher #</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-3">Paid To</th>
                      <th className="py-3 px-3">Mode</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{e.voucher_no}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{e.category}</td>
                        <td className="py-3 px-4 text-slate-600">{e.description}</td>
                        <td className="py-3 px-3 text-slate-800">{e.paid_to}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{e.payment_mode}</td>
                        <td className="py-3 px-4 text-right font-black text-rose-600">
                          ₹{e.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 7: IMMUTABLE AUDIT TRAIL --- */}
        {activeTab === "AUDIT" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">System Security & Governance Audit Log</h3>
              <p className="text-xs text-slate-500">
                Immutable record of cashier sales, supervisor discounts, GRN approvals, and logins
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-2">Role</th>
                    <th className="py-2.5 px-2">Module</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-4 text-slate-500 font-sans">
                        {new Date(a.timestamp).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-900">{a.user_name}</td>
                      <td className="py-2 px-2 font-sans font-bold text-slate-600">{a.role}</td>
                      <td className="py-2 px-2 font-sans font-bold text-emerald-700">{a.module}</td>
                      <td className="py-2 px-3 text-slate-700">{a.action}</td>
                      <td className="py-2 px-4 font-sans text-slate-600">{a.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 8: STORE & PRINTER CONFIG --- */}
        {activeTab === "SETTINGS" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-3xl">
            <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center space-x-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              <span>Supermarket Entity & Thermal Printer Setup</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700">Store Name:</label>
                  <input
                    type="text"
                    value={cfgStoreName}
                    onChange={(e) => setCfgStoreName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Branch Name:</label>
                  <input
                    type="text"
                    value={cfgBranch}
                    onChange={(e) => setCfgBranch(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700">GSTIN Tax Registration:</label>
                  <input
                    type="text"
                    value={cfgGstin}
                    onChange={(e) => setCfgGstin(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">FSSAI License No.:</label>
                  <input
                    type="text"
                    value={cfgFssai}
                    onChange={(e) => setCfgFssai(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Store Address (Printed on Receipt):</label>
                <input
                  type="text"
                  value={cfgAddress}
                  onChange={(e) => setCfgAddress(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700">Phone Support:</label>
                  <input
                    type="text"
                    value={cfgPhone}
                    onChange={(e) => setCfgPhone(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Default Thermal Paper Size:</label>
                  <select
                    value={cfgPaperSize}
                    onChange={(e) => setCfgPaperSize(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="80mm">80mm Standard POS Thermal</option>
                    <option value="58mm">58mm Compact POS Thermal</option>
                    <option value="A4">A4 Full Sheet Tax Invoice</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md transition flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Product Add / Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {editingProductId ? "Edit Catalog Product" : "Add New Product"}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Barcode (EAN-13):</label>
                  <input
                    type="text"
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Product Name:</label>
                  <input
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Category:</label>
                  <input
                    type="text"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">HSN Code:</label>
                  <input
                    type="text"
                    value={prodHsn}
                    onChange={(e) => setProdHsn(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Unit:</label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="PCS">PCS</option>
                    <option value="KG">KG</option>
                    <option value="PACK">PACK</option>
                    <option value="LTR">LTR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Purchase Rate:</label>
                  <input
                    type="number"
                    value={prodPurchaseRate}
                    onChange={(e) => setProdPurchaseRate(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Selling Price:</label>
                  <input
                    type="number"
                    value={prodSellingPrice}
                    onChange={(e) => setProdSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">MRP:</label>
                  <input
                    type="number"
                    value={prodMrp}
                    onChange={(e) => setProdMrp(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">GST %:</label>
                  <select
                    value={prodGstRate}
                    onChange={(e) => setProdGstRate(parseInt(e.target.value) as any)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Current Stock Qty:</label>
                  <input
                    type="number"
                    value={prodStockQty}
                    onChange={(e) => setProdStockQty(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Min Alert Threshold:</label>
                  <input
                    type="number"
                    value={prodMinAlert}
                    onChange={(e) => setProdMinAlert(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Record Store Expense</h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Category:</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="RENT">Rent</option>
                  <option value="ELECTRICITY">Electricity</option>
                  <option value="SALARY">Salary</option>
                  <option value="PACKAGING">Packaging</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Amount (₹):</label>
                <input
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Paid To (Vendor/Person):</label>
                <input
                  type="text"
                  value={expPaidTo}
                  onChange={(e) => setExpPaidTo(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Payment Mode:</label>
                <select
                  value={expMode}
                  onChange={(e) => setExpMode(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Description:</label>
                <input
                  type="text"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
