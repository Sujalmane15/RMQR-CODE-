"use client";

import React, { useState } from "react";
import { Bill, StoreConfig } from "../types";
import { generateThermalReceiptText } from "../lib/receipt";
import { Printer, X, FileText, Check } from "lucide-react";

interface ThermalReceiptModalProps {
  bill: Bill | null;
  store: StoreConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  bill,
  store,
  isOpen,
  onClose,
}) => {
  const [printSize, setPrintSize] = useState<"80mm" | "58mm" | "A4">("80mm");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !bill) return null;

  const rawText = generateThermalReceiptText(bill, store, printSize === "58mm" ? "58mm" : "80mm");

  const handlePrint = () => {
    window.print();
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-2xl max-h-[92vh] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base tracking-wide">
              Receipt Preview & Print — {bill.invoice_number}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {/* Format Selector */}
            <div className="flex bg-slate-800 rounded-lg p-1 text-xs">
              <button
                type="button"
                onClick={() => setPrintSize("80mm")}
                className={`px-3 py-1 rounded font-medium transition ${
                  printSize === "80mm"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setPrintSize("58mm")}
                className={`px-3 py-1 rounded font-medium transition ${
                  printSize === "58mm"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                58mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setPrintSize("A4")}
                className={`px-3 py-1 rounded font-medium transition ${
                  printSize === "A4"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                A4 Tax Invoice
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
          {printSize === "A4" ? (
            /* A4 Format */
            <div className="w-full max-w-xl bg-white p-8 shadow-md rounded-lg text-slate-800 text-xs border border-slate-200 printable-receipt">
              <div className="text-center border-b pb-4 mb-4">
                <h1 className="text-xl font-bold tracking-wider text-slate-900">
                  {store.store_name}
                </h1>
                <p className="text-slate-600 font-medium">{store.branch_name}</p>
                <p className="text-slate-500">{store.address_line1}, {store.city} - {store.pincode}</p>
                <div className="mt-1 flex justify-center gap-4 text-[11px] text-slate-600">
                  <span>GSTIN: <strong>{store.gstin}</strong></span>
                  <span>FSSAI: <strong>{store.fssai_lic_no}</strong></span>
                  <span>Ph: <strong>{store.phone}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 pb-2 border-b border-dashed">
                <div>
                  <p><span className="text-slate-500">Invoice No:</span> <strong>{bill.invoice_number}</strong></p>
                  <p><span className="text-slate-500">Date/Time:</span> {new Date(bill.date).toLocaleString("en-IN")}</p>
                  <p><span className="text-slate-500">Cashier:</span> {bill.cashier_name} ({bill.counter_id})</p>
                </div>
                <div className="text-right">
                  <p><span className="text-slate-500">Customer:</span> {bill.customer_name || "Walk-in Guest"}</p>
                  <p><span className="text-slate-500">Mobile:</span> {bill.customer_phone || "N/A"}</p>
                  <p><span className="text-slate-500">Payment:</span> <span className="font-semibold text-emerald-700">{bill.payment_mode}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-4 border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-left font-semibold text-slate-700">
                    <th className="py-1">#</th>
                    <th className="py-1">Item Description</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">MRP</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-center">GST %</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bill.items.map((it, idx) => (
                    <tr key={idx} className="text-slate-700">
                      <td className="py-1">{idx + 1}</td>
                      <td className="py-1 font-medium">{it.name}</td>
                      <td className="py-1 text-center">{it.qty} {it.unit}</td>
                      <td className="py-1 text-right">₹{it.mrp.toFixed(2)}</td>
                      <td className="py-1 text-right">₹{it.selling_price.toFixed(2)}</td>
                      <td className="py-1 text-center">{it.gst_rate}%</td>
                      <td className="py-1 text-right font-semibold">₹{it.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* GST Breakup */}
              <div className="bg-slate-50 p-3 rounded mb-4 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-700 mb-1">GST Tax Analysis:</div>
                <div className="grid grid-cols-5 text-[10px] text-slate-600 font-medium">
                  <span>Taxable: ₹{bill.taxable_subtotal.toFixed(2)}</span>
                  <span>CGST: ₹{bill.cgst_total.toFixed(2)}</span>
                  <span>SGST: ₹{bill.sgst_total.toFixed(2)}</span>
                  <span>Total Tax: ₹{bill.total_tax.toFixed(2)}</span>
                  <span>Round Off: ₹{bill.round_off.toFixed(2)}</span>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-3 flex justify-between items-center text-sm">
                <div>
                  <p className="text-emerald-700 font-semibold">
                    Total Savings: ₹{(bill.subtotal_mrp - bill.grand_total).toFixed(2)}
                  </p>
                  <p className="text-slate-500 text-[11px]">Items: {bill.total_items} | Qty: {bill.total_qty}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Grand Total Payable</div>
                  <div className="text-2xl font-black text-slate-900">₹{bill.grand_total.toFixed(2)}</div>
                </div>
              </div>

              <div className="text-center mt-6 pt-4 border-t text-[11px] text-slate-500">
                <p>{store.receipt_footer_msg}</p>
                <p className="font-mono mt-1 text-[10px]">{bill.invoice_number}</p>
              </div>
            </div>
          ) : (
            /* Thermal 80mm / 58mm Monospace View */
            <div
              className={`bg-white p-6 shadow-md rounded border border-slate-300 font-mono text-slate-900 leading-tight ${
                printSize === "58mm" ? "w-[280px] text-[11px]" : "w-[360px] text-xs"
              }`}
            >
              <pre className="whitespace-pre-wrap font-mono select-all">{rawText}</pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-slate-200">
          <button
            type="button"
            onClick={handleCopyRaw}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4" />}
            <span>{copied ? "Copied Raw ESC/POS" : "Copy Raw Receipt Text"}</span>
          </button>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt (Ctrl+P)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
