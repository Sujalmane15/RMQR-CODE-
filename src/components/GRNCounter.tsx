"use client";

import React, { useState } from "react";
import {
  GRNInvoice,
  GRNItem,
  GSTRate,
  Product,
  StoreConfig,
  Supplier,
} from "../types";
import {
  Boxes,
  Truck,
  FileCheck,
  Printer,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Check,
  Calendar,
  Building,
} from "lucide-react";

interface GRNCounterProps {
  products: Product[];
  suppliers: Supplier[];
  store: StoreConfig;
  grnList: GRNInvoice[];
  onCreateGRN: (grnData: any) => Promise<GRNInvoice>;
  onApproveGRN: (grnId: string, approverName: string) => Promise<GRNInvoice>;
  onRefreshData?: () => void;
}

export const GRNCounter: React.FC<GRNCounterProps> = ({
  products,
  suppliers,
  store,
  grnList,
  onCreateGRN,
  onApproveGRN,
}) => {
  // Active Tab: "NEW_INWARD" or "INWARD_HISTORY"
  const [activeTab, setActiveTab] = useState<"NEW_INWARD" | "INWARD_HISTORY">("NEW_INWARD");

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || "");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState<string>("");
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [deliveryChallanNo, setDeliveryChallanNo] = useState<string>("");
  const [vehicleNo, setVehicleNo] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Inward Items Table
  const [items, setItems] = useState<GRNItem[]>([]);

  // Item Add Form Controls
  const [barcodeSearch, setBarcodeSearch] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [batchNo, setBatchNo] = useState<string>("BAT-" + new Date().getFullYear() + "-01");
  const [mfgDate, setMfgDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [expiryDate, setExpiryDate] = useState<string>("2027-12-31");
  const [invoicedQty, setInvoicedQty] = useState<number>(50);
  const [receivedQty, setReceivedQty] = useState<number>(50);
  const [damagedQty, setDamagedQty] = useState<number>(0);
  const [purchaseRate, setPurchaseRate] = useState<number>(100);
  const [mrp, setMrp] = useState<number>(130);
  const [sellingPrice, setSellingPrice] = useState<number>(120);
  const [gstRate, setGstRate] = useState<GSTRate>(5);

  // Selected GRN for Voucher Print Preview
  const [selectedVoucherGRN, setSelectedVoucherGRN] = useState<GRNInvoice | null>(null);

  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // When barcode is entered or item selected
  const handleProductSelect = (prod: Product) => {
    setSelectedProduct(prod);
    setPurchaseRate(prod.purchase_rate);
    setMrp(prod.mrp);
    setSellingPrice(prod.selling_price);
    setGstRate(prod.gst_rate);
    setBarcodeSearch("");
  };

  const handleBarcodeSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = barcodeSearch.trim();
    if (!clean) return;
    const found = products.find(
      (p) => p.barcode === clean || p.sku.toLowerCase() === clean.toLowerCase()
    );
    if (found) {
      handleProductSelect(found);
    } else {
      notify("Barcode not found in catalog", "error");
    }
  };

  // Add Item to Inward Lines
  const handleAddItemToGRN = () => {
    if (!selectedProduct) {
      notify("Please select a product first", "error");
      return;
    }

    const shortage = Math.max(0, invoicedQty - receivedQty);
    const accepted = Math.max(0, receivedQty - damagedQty);
    const lineSubtotal = accepted * purchaseRate;
    const lineTax = (lineSubtotal * gstRate) / 100;
    const lineTotal = lineSubtotal + lineTax;

    const newItem: GRNItem = {
      id: `grn-item-${Date.now()}`,
      product_id: selectedProduct.id,
      barcode: selectedProduct.barcode,
      product_name: selectedProduct.name,
      unit: selectedProduct.unit,
      batch_number: batchNo,
      mfg_date: mfgDate,
      expiry_date: expiryDate,
      invoiced_qty: invoicedQty,
      received_qty: receivedQty,
      damaged_qty: damagedQty,
      shortage_qty: shortage,
      accepted_qty: accepted,
      purchase_rate: purchaseRate,
      mrp,
      selling_price: sellingPrice,
      gst_rate: gstRate,
      tax_amount: Math.round(lineTax * 100) / 100,
      total_amount: Math.round(lineTotal * 100) / 100,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedProduct(null);
    notify(`Added ${newItem.product_name} to GRN lines`);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Compute Totals
  const totalSubtotal = items.reduce((acc, it) => acc + it.accepted_qty * it.purchase_rate, 0);
  const totalTax = items.reduce((acc, it) => acc + it.tax_amount, 0);
  const grandTotal = Math.round(totalSubtotal + totalTax);

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!supplierInvoiceNo) {
      notify("Supplier Invoice No. is required", "error");
      return;
    }
    if (items.length === 0) {
      notify("Add at least 1 inward item", "error");
      return;
    }
    const sup = suppliers.find((s) => s.id === selectedSupplierId);

    try {
      const created = await onCreateGRN({
        supplier_id: selectedSupplierId,
        supplier_name: sup?.name || "Supplier",
        supplier_invoice_no: supplierInvoiceNo,
        supplier_invoice_date: supplierInvoiceDate,
        delivery_challan_no: deliveryChallanNo || undefined,
        vehicle_no: vehicleNo || undefined,
        items,
        subtotal: totalSubtotal,
        total_tax: totalTax,
        grand_total: grandTotal,
        status: "DRAFT",
        received_by: "Vikas Kadam (Inward Supervisor)",
        remarks,
      });

      notify(`GRN ${created.grn_number} saved as Draft`);
      setItems([]);
      setSupplierInvoiceNo("");
      setActiveTab("INWARD_HISTORY");
    } catch {
      notify("Failed to save GRN", "error");
    }
  };

  // Direct Inward Approval
  const handleApproveImmediate = async () => {
    if (!supplierInvoiceNo) {
      notify("Supplier Invoice No. is required", "error");
      return;
    }
    if (items.length === 0) {
      notify("Add at least 1 inward item", "error");
      return;
    }
    const sup = suppliers.find((s) => s.id === selectedSupplierId);

    try {
      const draft = await onCreateGRN({
        supplier_id: selectedSupplierId,
        supplier_name: sup?.name || "Supplier",
        supplier_invoice_no: supplierInvoiceNo,
        supplier_invoice_date: supplierInvoiceDate,
        delivery_challan_no: deliveryChallanNo || undefined,
        vehicle_no: vehicleNo || undefined,
        items,
        subtotal: totalSubtotal,
        total_tax: totalTax,
        grand_total: grandTotal,
        status: "DRAFT",
        received_by: "Vikas Kadam (Inward Supervisor)",
        remarks,
      });

      const approved = await onApproveGRN(draft.id, "Vikas Kadam (Inward Supervisor)");
      notify(`GRN ${approved.grn_number} Approved! Stock updated.`);
      setSelectedVoucherGRN(approved);
      setItems([]);
      setSupplierInvoiceNo("");
    } catch {
      notify("Failed to approve GRN", "error");
    }
  };

  // Near-expiry check helper (within 60 days)
  const isNearExpiry = (dateStr: string) => {
    const exp = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const sixtyDays = 60 * 24 * 60 * 60 * 1000;
    return exp - now <= sixtyDays;
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-slate-100 text-slate-800">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-18 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 text-sm font-semibold transition-all ${
            notification.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {notification.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Sub-Header & Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">
              Counter 2: GRN & Stock Inward Bay
            </h1>
            <p className="text-xs text-slate-500">
              Supplier invoice receiving, batch/expiry controls, damage inspection & live ledger updates
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("NEW_INWARD")}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === "NEW_INWARD"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            New Inward Note
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("INWARD_HISTORY")}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === "INWARD_HISTORY"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            GRN History ({grnList.length})
          </button>
        </div>
      </div>

      {activeTab === "NEW_INWARD" ? (
        <div className="p-4 max-w-7xl mx-auto w-full space-y-4">
          {/* Supplier & Invoice Header Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
              <Truck className="w-4 h-4 text-amber-500" />
              <span>Supplier & Invoice Details</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Supplier Vendor:</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Supplier Invoice No.:</label>
                <input
                  type="text"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  placeholder="e.g. INV-98442"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Invoice Date:</label>
                <input
                  type="date"
                  value={supplierInvoiceDate}
                  onChange={(e) => setSupplierInvoiceDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Delivery Challan No.:</label>
                <input
                  type="text"
                  value={deliveryChallanNo}
                  onChange={(e) => setDeliveryChallanNo(e.target.value)}
                  placeholder="DC-1049"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Vehicle / Gate Reg No.:</label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  placeholder="MH-43-AK-2918"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Item Add Control Bar */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>Add Inward Stock Item</span>
            </h2>

            {/* Product Scanner / Selector */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs mb-3">
              <div>
                <label className="font-semibold text-slate-700">Scan Product Barcode:</label>
                <form onSubmit={handleBarcodeSearchSubmit} className="mt-1 flex gap-1">
                  <input
                    type="text"
                    value={barcodeSearch}
                    onChange={(e) => setBarcodeSearch(e.target.value)}
                    placeholder="Scan Barcode (Enter)"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-slate-800 text-white rounded-lg text-xs font-semibold"
                  >
                    Scan
                  </button>
                </form>
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700">Or Select from Catalog:</label>
                <select
                  value={selectedProduct?.id || ""}
                  onChange={(e) => {
                    const found = products.find((p) => p.id === e.target.value);
                    if (found) handleProductSelect(found);
                  }}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.barcode}] - Current Stock: {p.stock_qty} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Batch Number:</label>
                <input
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            {/* Rates, Quantities & Inspection Parameters */}
            {selectedProduct && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="font-bold text-sm text-slate-900">
                    {selectedProduct.name} ({selectedProduct.unit})
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    HSN: {selectedProduct.hsn} • GST Slab: {selectedProduct.gst_rate}%
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700">Invoiced Qty:</label>
                    <input
                      type="number"
                      value={invoicedQty}
                      onChange={(e) => {
                        const q = parseFloat(e.target.value) || 0;
                        setInvoicedQty(q);
                        setReceivedQty(q);
                      }}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Received Qty:</label>
                    <input
                      type="number"
                      value={receivedQty}
                      onChange={(e) => setReceivedQty(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 text-rose-600">Damaged Qty:</label>
                    <input
                      type="number"
                      value={damagedQty}
                      onChange={(e) => setDamagedQty(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-rose-300 rounded-lg font-bold text-rose-600"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Purchase Rate (₹):</label>
                    <input
                      type="number"
                      value={purchaseRate}
                      onChange={(e) => setPurchaseRate(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">MRP (₹):</label>
                    <input
                      type="number"
                      value={mrp}
                      onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Selling Price (₹):</label>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Expiry Date:</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 border border-slate-300 rounded-lg text-[11px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="text-xs text-slate-600">
                    Accepted Qty: <strong>{Math.max(0, receivedQty - damagedQty)}</strong> | Shortage:{" "}
                    <strong>{Math.max(0, invoicedQty - receivedQty)}</strong> | Gross Margin:{" "}
                    <strong className="text-emerald-700">
                      {sellingPrice > purchaseRate
                        ? (((sellingPrice - purchaseRate) / sellingPrice) * 100).toFixed(1) + "%"
                        : "0%"}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToGRN}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                  >
                    Add to Inward Table
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Inward Items Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider">
                Inward Items Line Items ({items.length})
              </span>
              <span>
                Net Inward Value: <strong className="text-slate-900">₹{grandTotal.toFixed(2)}</strong>
              </span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No items added yet. Scan a barcode above to add products to this inward note.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-2">Batch</th>
                    <th className="py-2.5 px-2">Expiry</th>
                    <th className="py-2.5 px-2 text-right">Inv Qty</th>
                    <th className="py-2.5 px-2 text-right">Rec Qty</th>
                    <th className="py-2.5 px-2 text-right text-rose-600">Damage</th>
                    <th className="py-2.5 px-2 text-right font-bold">Accepted</th>
                    <th className="py-2.5 px-2 text-right">Cost Rate</th>
                    <th className="py-2.5 px-2 text-right">MRP</th>
                    <th className="py-2.5 px-2 text-center">GST</th>
                    <th className="py-2.5 px-3 text-right">Total (Inc Tax)</th>
                    <th className="py-2.5 px-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{it.product_name}</td>
                      <td className="py-2 px-2 font-mono text-[11px] text-slate-600">{it.batch_number}</td>
                      <td className="py-2 px-2 text-[11px]">
                        <span
                          className={
                            isNearExpiry(it.expiry_date)
                              ? "text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded"
                              : "text-slate-600"
                          }
                        >
                          {it.expiry_date}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">{it.invoiced_qty}</td>
                      <td className="py-2 px-2 text-right">{it.received_qty}</td>
                      <td className="py-2 px-2 text-right text-rose-600">{it.damaged_qty}</td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-700">{it.accepted_qty}</td>
                      <td className="py-2 px-2 text-right">₹{it.purchase_rate.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-slate-500">₹{it.mrp.toFixed(2)}</td>
                      <td className="py-2 px-2 text-center">{it.gst_rate}%</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        ₹{it.total_amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* GRN Summary & Action Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 space-y-1">
                <div>Subtotal: <strong>₹{totalSubtotal.toFixed(2)}</strong> | Total GST: <strong>₹{totalTax.toFixed(2)}</strong></div>
                <div className="text-base font-black text-slate-900">Grand Total Inward: ₹{grandTotal.toFixed(2)}</div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={items.length === 0}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 rounded-lg text-xs font-semibold transition"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={handleApproveImmediate}
                  disabled={items.length === 0}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-amber-600/20 flex items-center space-x-2 transition"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Approve & Update Live Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* GRN Inward History Tab */
        <div className="p-6 max-w-7xl mx-auto w-full">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-bold text-sm text-slate-800">Historical Goods Receipt Notes (GRN)</h2>
            </div>

            {grnList.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                No GRN inward transactions recorded yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">GRN #</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-3">Supplier Inv #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3 text-center">Items</th>
                    <th className="py-3 px-3 text-right">Inward Total</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grnList.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{g.grn_number}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{g.supplier_name}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{g.supplier_invoice_no}</td>
                      <td className="py-3 px-3 text-slate-500">{new Date(g.created_at).toLocaleDateString("en-IN")}</td>
                      <td className="py-3 px-3 text-center">{g.items.length}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">₹{g.grand_total.toFixed(2)}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            g.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {g.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center space-x-2">
                        {g.status === "DRAFT" && (
                          <button
                            type="button"
                            onClick={async () => {
                              await onApproveGRN(g.id, "Vikas Kadam");
                              notify(`GRN ${g.grn_number} Approved! Stock updated.`);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedVoucherGRN(g)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold border border-slate-300 inline-flex items-center space-x-1"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Voucher</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Printable GRN Voucher Modal */}
      {selectedVoucherGRN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Goods Receipt Note (GRN) Voucher</h3>
              <button
                type="button"
                onClick={() => setSelectedVoucherGRN(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-800">
              <div className="text-center border-b pb-3 mb-4">
                <h1 className="text-lg font-bold text-slate-900">{store.store_name}</h1>
                <p className="text-slate-500">{store.branch_name} — {store.address_line1}, {store.city}</p>
                <div className="text-[11px] font-mono mt-1 text-slate-600">
                  GSTIN: {store.gstin} • FSSAI: {store.fssai_lic_no}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 border-b pb-3">
                <div>
                  <p><strong>GRN No:</strong> {selectedVoucherGRN.grn_number}</p>
                  <p><strong>Supplier:</strong> {selectedVoucherGRN.supplier_name}</p>
                  <p><strong>Invoice No:</strong> {selectedVoucherGRN.supplier_invoice_no}</p>
                </div>
                <div className="text-right">
                  <p><strong>Date:</strong> {new Date(selectedVoucherGRN.created_at).toLocaleString("en-IN")}</p>
                  <p><strong>Received By:</strong> {selectedVoucherGRN.received_by}</p>
                  <p><strong>Approved By:</strong> {selectedVoucherGRN.approved_by || "Pending"}</p>
                </div>
              </div>

              <table className="w-full mb-4 border-collapse">
                <thead>
                  <tr className="border-b font-semibold text-slate-700">
                    <th className="py-1 text-left">Item</th>
                    <th className="py-1 text-center">Batch</th>
                    <th className="py-1 text-right">Inv</th>
                    <th className="py-1 text-right">Accepted</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedVoucherGRN.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-1">{it.product_name}</td>
                      <td className="py-1 text-center font-mono">{it.batch_number}</td>
                      <td className="py-1 text-right">{it.invoiced_qty}</td>
                      <td className="py-1 text-right font-bold text-emerald-700">{it.accepted_qty}</td>
                      <td className="py-1 text-right">₹{it.purchase_rate.toFixed(2)}</td>
                      <td className="py-1 text-right font-semibold">₹{it.total_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t pt-3 flex justify-between font-bold text-sm">
                <span>Grand Total:</span>
                <span>₹{selectedVoucherGRN.grand_total.toFixed(2)}</span>
              </div>

              <div className="mt-8 pt-6 border-t grid grid-cols-2 text-center text-slate-500 text-[11px]">
                <div>
                  <div className="border-t border-slate-300 w-32 mx-auto mb-1"></div>
                  <span>Inward Operator Signature</span>
                </div>
                <div>
                  <div className="border-t border-slate-300 w-32 mx-auto mb-1"></div>
                  <span>Store Manager Approval</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setSelectedVoucherGRN(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
              >
                Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
