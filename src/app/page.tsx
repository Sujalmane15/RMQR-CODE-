"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { POSCounter } from "../components/POSCounter";
import { GRNCounter } from "../components/GRNCounter";
import { AdminDashboard } from "../components/AdminDashboard";
import { ThermalReceiptModal } from "../components/ThermalReceiptModal";
import {
  AuditLog,
  Bill,
  CashierShift,
  Customer,
  Expense,
  GRNInvoice,
  HeldBill,
  Product,
  SalesReturn,
  StockLedgerEntry,
  StoreConfig,
  Supplier,
  User,
  UserRole,
} from "../types";
import {
  getSeedCustomers,
  getSeedExpenses,
  getSeedProducts,
  getSeedStoreConfig,
  getSeedSuppliers,
  getSeedUsers,
} from "../lib/db/seed-data";

export default function UrbanMartApp() {
  // Profiles: CASHIER (Profile B), GRN_OPERATOR (Profile A), ADMIN (Profile C)
  const [currentRole, setCurrentRole] = useState<UserRole>("CASHIER");
  const [userName, setUserName] = useState("Ramesh Pawar (Billing Operator)");
  const [counterName, setCounterName] = useState("Counter 1 (Express POS)");

  // Live state
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(getSeedStoreConfig());
  const [products, setProducts] = useState<Product[]>(getSeedProducts());
  const [suppliers, setSuppliers] = useState<Supplier[]>(getSeedSuppliers());
  const [customers, setCustomers] = useState<Customer[]>(getSeedCustomers());
  const [activeShift, setActiveShift] = useState<CashierShift | null>({
    id: "sh-001",
    shift_number: "SH-2026-00001",
    cashier_id: "usr-pos-01",
    cashier_name: "Ramesh Pawar",
    counter_id: "POS-01",
    opened_at: new Date().toISOString(),
    opening_float: 2000,
    cash_sales: 0,
    upi_sales: 0,
    card_sales: 0,
    total_sales: 0,
    bills_count: 0,
    cash_refunds: 0,
    expected_cash: 2000,
    status: "OPEN",
  });
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [grnList, setGrnList] = useState<GRNInvoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>(getSeedExpenses());
  const [stockLedger, setStockLedger] = useState<StockLedgerEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>(getSeedUsers());

  // Receipt Modal State
  const [printBill, setPrintBill] = useState<Bill | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Fetch initial data from local server if accessible
  const loadData = async () => {
    try {
      const [resProd, resSup, resCust, resShift, resHeld, resGrn, resExp, resLed, resAud, resCfg] =
        await Promise.all([
          fetch("/api/products").then((r) => r.json()).catch(() => null),
          fetch("/api/suppliers").then((r) => r.json()).catch(() => null),
          fetch("/api/customers").then((r) => r.json()).catch(() => null),
          fetch("/api/shifts/active").then((r) => r.json()).catch(() => null),
          fetch("/api/billing/held").then((r) => r.json()).catch(() => null),
          fetch("/api/grn").then((r) => r.json()).catch(() => null),
          fetch("/api/expenses").then((r) => r.json()).catch(() => null),
          fetch("/api/stock-ledger").then((r) => r.json()).catch(() => null),
          fetch("/api/audit-logs").then((r) => r.json()).catch(() => null),
          fetch("/api/settings").then((r) => r.json()).catch(() => null),
        ]);

      if (resProd && Array.isArray(resProd)) setProducts(resProd);
      if (resSup && Array.isArray(resSup)) setSuppliers(resSup);
      if (resCust && Array.isArray(resCust)) setCustomers(resCust);
      if (resShift && resShift.id) {
        setActiveShift(resShift);
      } else if (resShift === null) {
        setActiveShift(null);
      }
      if (resHeld && Array.isArray(resHeld)) setHeldBills(resHeld);
      if (resGrn && Array.isArray(resGrn)) setGrnList(resGrn);
      if (resExp && Array.isArray(resExp)) setExpenses(resExp);
      if (resLed && Array.isArray(resLed)) setStockLedger(resLed);
      if (resAud && Array.isArray(resAud)) setAuditLogs(resAud);
      if (resCfg && resCfg.store_name) setStoreConfig(resCfg);
    } catch {
      // Fallback kept in memory
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Profile switcher handler
  const handleSelectProfile = (role: UserRole) => {
    setCurrentRole(role);
    if (role === "CASHIER") {
      setUserName("Ramesh Pawar (Billing Operator)");
      setCounterName("Counter 1 (Express POS)");
    } else if (role === "GRN_OPERATOR") {
      setUserName("Vikas Kadam (Inward Supervisor)");
      setCounterName("Counter 2 (Inward Bay)");
    } else {
      setUserName("Sujal Mane (Store Director)");
      setCounterName("Central Admin Console");
    }
  };

  // --- API Action wrappers ---
  const handleCheckout = async (billData: any): Promise<Bill> => {
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billData),
      });
      if (res.ok) {
        const bill = await res.json();
        setRecentBills((prev) => [bill, ...prev]);
        loadData();
        return bill;
      }
    } catch {
      // Fallback local bill generator
    }

    // Client local fallback bill
    const invNo = `UM-2026-${String(recentBills.length + 1).padStart(5, "0")}`;
    const localBill: Bill = {
      ...billData,
      id: `bill-${Date.now()}`,
      invoice_number: invNo,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      status: "COMPLETED",
    };
    setRecentBills((prev) => [localBill, ...prev]);
    return localBill;
  };

  const handleHoldBill = async (heldData: any): Promise<HeldBill> => {
    const res = await fetch("/api/billing/held", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(heldData),
    });
    if (res.ok) {
      const held = await res.json();
      setHeldBills((prev) => [held, ...prev]);
      return held;
    }
    const fallbackHeld: HeldBill = {
      ...heldData,
      id: `hld-${Date.now()}`,
      held_at: new Date().toISOString(),
    };
    setHeldBills((prev) => [fallbackHeld, ...prev]);
    return fallbackHeld;
  };

  const handleResumeBill = async (heldId: string): Promise<HeldBill | null> => {
    const res = await fetch(`/api/billing/held/${heldId}`, { method: "DELETE" });
    if (res.ok) {
      const resumed = await res.json();
      setHeldBills((prev) => prev.filter((h) => h.id !== heldId));
      return resumed;
    }
    const found = heldBills.find((h) => h.id === heldId);
    if (found) {
      setHeldBills((prev) => prev.filter((h) => h.id !== heldId));
      return found;
    }
    return null;
  };

  const handleOpenShift = async (float: number): Promise<CashierShift> => {
    const res = await fetch("/api/shifts/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cashier_id: "usr-pos-01",
        cashier_name: "Ramesh Pawar",
        counter_id: "POS-01",
        opening_float: float,
      }),
    });
    if (res.ok) {
      const shift = await res.json();
      setActiveShift(shift);
      return shift;
    }
    const fallbackShift: CashierShift = {
      id: `sh-${Date.now()}`,
      shift_number: "SH-2026-00001",
      cashier_id: "usr-pos-01",
      cashier_name: "Ramesh Pawar",
      counter_id: "POS-01",
      opened_at: new Date().toISOString(),
      opening_float: float,
      cash_sales: 0,
      upi_sales: 0,
      card_sales: 0,
      total_sales: 0,
      bills_count: 0,
      cash_refunds: 0,
      expected_cash: float,
      status: "OPEN",
    };
    setActiveShift(fallbackShift);
    return fallbackShift;
  };

  const handleCloseShift = async (
    shiftId: string,
    actualCash: number,
    notes?: string
  ): Promise<CashierShift | null> => {
    const res = await fetch("/api/shifts/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId, actual_cash: actualCash, closing_notes: notes }),
    });
    if (res.ok) {
      const closed = await res.json();
      setActiveShift(null);
      return closed;
    }
    setActiveShift(null);
    return null;
  };

  const handleProcessReturn = async (returnData: any) => {
    const res = await fetch("/api/billing/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(returnData),
    });
    loadData();
    return res.ok ? await res.json() : returnData;
  };

  const handleCreateGRN = async (grnData: any): Promise<GRNInvoice> => {
    const res = await fetch("/api/grn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(grnData),
    });
    if (res.ok) {
      const created = await res.json();
      setGrnList((prev) => [created, ...prev]);
      loadData();
      return created;
    }
    const fallback: GRNInvoice = {
      ...grnData,
      id: `grn-${Date.now()}`,
      grn_number: `GRN-2026-${String(grnList.length + 1).padStart(5, "0")}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setGrnList((prev) => [fallback, ...prev]);
    return fallback;
  };

  const handleApproveGRN = async (grnId: string, approver: string): Promise<GRNInvoice> => {
    const res = await fetch(`/api/grn/${grnId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved_by: approver }),
    });
    if (res.ok) {
      const approved = await res.json();
      loadData();
      return approved;
    }
    const idx = grnList.findIndex((g) => g.id === grnId);
    if (idx >= 0) {
      const copy = { ...grnList[idx], status: "APPROVED" as const, approved_by: approver };
      setGrnList((prev) => prev.map((g) => (g.id === grnId ? copy : g)));
      return copy;
    }
    throw new Error("GRN not found");
  };

  const handleAddProduct = async (prod: any): Promise<Product> => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prod),
    });
    loadData();
    return res.json();
  };

  const handleUpdateProduct = async (id: string, prod: any): Promise<Product | undefined> => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prod),
    });
    loadData();
    return res.json();
  };

  const handleDeleteProduct = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    loadData();
    return res.ok;
  };

  const handleAddSupplier = async (sup: any): Promise<Supplier> => {
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sup),
    });
    loadData();
    return res.json();
  };

  const handleAddExpense = async (exp: any): Promise<Expense> => {
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exp),
    });
    loadData();
    return res.json();
  };

  const handleUpdateSettings = async (settings: Partial<StoreConfig>): Promise<StoreConfig> => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    loadData();
    return res.json();
  };

  const handleOpenReceiptPrint = (bill: Bill) => {
    setPrintBill(bill);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans">
      {/* Global Navbar with Profile Switcher */}
      <Navbar
        currentRole={currentRole}
        currentCounter={counterName}
        userName={userName}
        activeShiftNumber={activeShift?.shift_number}
        onSelectProfile={handleSelectProfile}
      />

      {/* Profile Render View */}
      <main className="flex-1 flex flex-col">
        {currentRole === "CASHIER" && (
          <POSCounter
            products={products}
            store={storeConfig}
            activeShift={activeShift}
            onCheckout={handleCheckout}
            onHoldBill={handleHoldBill}
            onResumeBill={handleResumeBill}
            onOpenShift={handleOpenShift}
            onCloseShift={handleCloseShift}
            onProcessReturn={handleProcessReturn}
            onPrintBill={handleOpenReceiptPrint}
            heldBills={heldBills}
            recentBills={recentBills}
          />
        )}

        {currentRole === "GRN_OPERATOR" && (
          <GRNCounter
            products={products}
            suppliers={suppliers}
            store={storeConfig}
            grnList={grnList}
            onCreateGRN={handleCreateGRN}
            onApproveGRN={handleApproveGRN}
            onRefreshData={loadData}
          />
        )}

        {currentRole === "ADMIN" && (
          <AdminDashboard
            products={products}
            suppliers={suppliers}
            customers={customers}
            bills={recentBills}
            grnList={grnList}
            expenses={expenses}
            stockLedger={stockLedger}
            auditLogs={auditLogs}
            storeConfig={storeConfig}
            users={users}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddSupplier={handleAddSupplier}
            onAddExpense={handleAddExpense}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>

      {/* Thermal Receipt Print Dialog (80mm / 58mm / A4) */}
      <ThermalReceiptModal
        bill={printBill}
        store={storeConfig}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </div>
  );
}
