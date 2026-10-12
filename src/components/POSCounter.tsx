"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bill,
  BillItem,
  CashierShift,
  Customer,
  HeldBill,
  PaymentMode,
  PaymentSplit,
  Product,
  StoreConfig,
} from "../types";
import { calculateCartTotals, createBillItem } from "../lib/tax";
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  Pause,
  Play,
  RotateCcw,
  Printer,
  CreditCard,
  QrCode,
  Banknote,
  DollarSign,
  User,
  Percent,
  Layers,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
} from "lucide-react";

interface POSCounterProps {
  products: Product[];
  store: StoreConfig;
  activeShift: CashierShift | null;
  onCheckout: (billData: any) => Promise<Bill>;
  onHoldBill: (heldData: any) => Promise<HeldBill>;
  onResumeBill: (heldId: string) => Promise<HeldBill | null>;
  onOpenShift: (float: number) => Promise<CashierShift>;
  onCloseShift: (shiftId: string, actualCash: number, notes?: string) => Promise<CashierShift | null>;
  onProcessReturn: (returnData: any) => Promise<any>;
  onPrintBill: (bill: Bill) => void;
  heldBills: HeldBill[];
  recentBills: Bill[];
}

export const POSCounter: React.FC<POSCounterProps> = ({
  products,
  store,
  activeShift,
  onCheckout,
  onHoldBill,
  onResumeBill,
  onOpenShift,
  onCloseShift,
  onProcessReturn,
  onPrintBill,
  heldBills,
  recentBills,
}) => {
  // Cart state
  const [cart, setCart] = useState<BillItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Customer state
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPoints, setCustomerPoints] = useState(0);

  // Discount state
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [billDiscountPercent, setBillDiscountPercent] = useState(0);
  const [billDiscountAmount, setBillDiscountAmount] = useState(0);

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [tenderAmount, setTenderAmount] = useState<number>(0);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitDigital, setSplitDigital] = useState<number>(0);
  const [splitDigitalMode, setSplitDigitalMode] = useState<"UPI" | "CARD">("UPI");

  // Held Bills & Return & Shift modal states
  const [heldModalOpen, setHeldModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState("2000");
  const [closingCashInput, setClosingCashInput] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  // Sales return input
  const [returnInvoiceNo, setReturnInvoiceNo] = useState("");
  const [returnProductBarcode, setReturnProductBarcode] = useState("");
  const [returnQty, setReturnQty] = useState(1);
  const [returnCondition, setReturnCondition] = useState<"GOOD" | "DAMAGED">("GOOD");
  const [returnRefundMethod, setReturnRefundMethod] = useState<"CASH" | "CREDIT_NOTE">("CASH");
  const [returnReason, setReturnReason] = useState("");

  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Keyboard Shortcuts Listener (F1 to F10 and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes open modals
      if (e.key === "Escape") {
        setSearchModalOpen(false);
        setCustomerModalOpen(false);
        setDiscountModalOpen(false);
        setPaymentModalOpen(false);
        setHeldModalOpen(false);
        setReturnModalOpen(false);
        setShiftModalOpen(false);
        barcodeInputRef.current?.focus();
        return;
      }

      // F1: Focus Barcode or Search
      if (e.key === "F1") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      }

      // F2: Hold Bill
      if (e.key === "F2") {
        e.preventDefault();
        handleHoldCart();
      }

      // F3: Resume Bill
      if (e.key === "F3") {
        e.preventDefault();
        setHeldModalOpen(true);
      }

      // F4: Select Payment Method
      if (e.key === "F4") {
        e.preventDefault();
        if (cart.length > 0) {
          openPaymentModal();
        } else {
          notify("Cart is empty!", "error");
        }
      }

      // F5: Apply Discount
      if (e.key === "F5") {
        e.preventDefault();
        setDiscountModalOpen(true);
      }

      // F6: Customer Lookup
      if (e.key === "F6") {
        e.preventDefault();
        setCustomerModalOpen(true);
      }

      // F7: Sales Return
      if (e.key === "F7") {
        e.preventDefault();
        setReturnModalOpen(true);
      }

      // F8: Reprint Last Bill
      if (e.key === "F8") {
        e.preventDefault();
        if (recentBills.length > 0) {
          onPrintBill(recentBills[0]);
        } else {
          notify("No previous bill to reprint", "error");
        }
      }

      // F9: Shift Summary / Reconciliation
      if (e.key === "F9") {
        e.preventDefault();
        setShiftModalOpen(true);
      }

      // F10: Settle & Print
      if (e.key === "F10") {
        e.preventDefault();
        if (cart.length > 0) {
          openPaymentModal();
        } else {
          notify("Cart is empty! Add items first.", "error");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, recentBills]);

  // Always keep focus on barcode input when not inside a modal
  useEffect(() => {
    if (
      !searchModalOpen &&
      !customerModalOpen &&
      !discountModalOpen &&
      !paymentModalOpen &&
      !heldModalOpen &&
      !returnModalOpen &&
      !shiftModalOpen
    ) {
      barcodeInputRef.current?.focus();
    }
  }, [
    searchModalOpen,
    customerModalOpen,
    discountModalOpen,
    paymentModalOpen,
    heldModalOpen,
    returnModalOpen,
    shiftModalOpen,
  ]);

  // Current calculated cart totals
  const cartTotals = calculateCartTotals(cart, billDiscountPercent, billDiscountAmount);

  // Add product to cart by barcode or direct selection
  const addProductToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product_id === product.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        const newQty = next[existingIdx].qty + quantity;
        next[existingIdx] = createBillItem(product, newQty);
        return next;
      } else {
        const newItem = createBillItem(product, quantity);
        return [newItem, ...prev];
      }
    });
    setBarcodeInput("");
  };

  // Handle barcode submission (simulate scanner wedge enter)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = barcodeInput.trim();
    if (!clean) return;

    // Search by exact barcode or SKU
    const found = products.find(
      (p) => p.barcode === clean || p.sku.toLowerCase() === clean.toLowerCase()
    );

    if (found) {
      addProductToCart(found);
      notify(`Added ${found.name}`);
    } else {
      // If not exact match, open search modal with current query
      setSearchQuery(clean);
      setSearchModalOpen(true);
    }
  };

  // Modify quantity of item in cart
  const updateItemQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id === productId) {
          const prod = products.find((p) => p.id === productId);
          if (prod) {
            return createBillItem(prod, newQty, item.discount_amount / item.qty);
          }
        }
        return item;
      })
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerPhone("");
    setCustomerName("");
    setCustomerPoints(0);
    setBillDiscountPercent(0);
    setBillDiscountAmount(0);
  };

  // Hold current cart
  const handleHoldCart = async () => {
    if (cart.length === 0) {
      notify("Cannot hold empty cart", "error");
      return;
    }
    try {
      await onHoldBill({
        items: cart,
        cashier_id: activeShift?.cashier_id || "cashier-01",
        cashier_name: activeShift?.cashier_name || "Billing Operator",
        customer_phone: customerPhone || undefined,
        customer_name: customerName || undefined,
        subtotal: cartTotals.grand_total,
        note: `Held cart with ${cart.length} items`,
      });
      clearCart();
      notify("Bill parked on hold (F3 to resume)");
    } catch {
      notify("Failed to park bill", "error");
    }
  };

  // Resume a held cart
  const handleResumeCart = async (heldId: string) => {
    try {
      const resumed = await onResumeBill(heldId);
      if (resumed) {
        setCart(resumed.items);
        if (resumed.customer_phone) setCustomerPhone(resumed.customer_phone);
        if (resumed.customer_name) setCustomerName(resumed.customer_name);
        setHeldModalOpen(false);
        notify("Bill resumed successfully");
      }
    } catch {
      notify("Failed to resume bill", "error");
    }
  };

  // Open payment modal
  const openPaymentModal = () => {
    const total = cartTotals.grand_total;
    setTenderAmount(total);
    setSplitCash(Math.floor(total / 2));
    setSplitDigital(total - Math.floor(total / 2));
    setPaymentModalOpen(true);
  };

  // Complete checkout
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    let payments: PaymentSplit[] = [];
    if (paymentMode === "SPLIT") {
      payments = [
        { mode: "CASH", amount: splitCash },
        { mode: splitDigitalMode, amount: splitDigital },
      ];
    } else {
      payments = [{ mode: paymentMode, amount: cartTotals.grand_total }];
    }

    try {
      const bill = await onCheckout({
        items: cart,
        cashier_id: activeShift?.cashier_id || "cashier-01",
        cashier_name: activeShift?.cashier_name || "Billing Operator",
        counter_id: activeShift?.counter_id || "POS-01",
        customer_phone: customerPhone || undefined,
        customer_name: customerName || undefined,
        payment_mode: paymentMode,
        payments,
        tender_amount: paymentMode === "CASH" ? tenderAmount : cartTotals.grand_total,
        bill_discount_percent: billDiscountPercent,
        bill_discount_amount: billDiscountAmount,
      });

      setPaymentModalOpen(false);
      clearCart();
      notify(`Sale completed! Invoice ${bill.invoice_number}`);
      onPrintBill(bill);
    } catch (err: any) {
      notify(err.message || "Checkout failed", "error");
    }
  };

  // Customer search simulation
  const handleCustomerPhoneChange = (val: string) => {
    setCustomerPhone(val);
    const clean = val.replace(/[^0-9]/g, "");
    if (clean.length === 10) {
      if (clean === "9820123456") {
        setCustomerName("Rajesh Sharma");
        setCustomerPoints(120);
      } else if (clean === "9819876543") {
        setCustomerName("Sneha Patel");
        setCustomerPoints(85);
      } else if (clean === "9967112233") {
        setCustomerName("Amit Deshmukh");
        setCustomerPoints(210);
      }
    }
  };

  // Sales return submission
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnInvoiceNo || !returnProductBarcode) {
      notify("Invoice # and Product Barcode required", "error");
      return;
    }
    const prod = products.find((p) => p.barcode === returnProductBarcode);
    if (!prod) {
      notify("Barcode not recognized", "error");
      return;
    }
    const refundAmt = prod.selling_price * returnQty;
    try {
      await onProcessReturn({
        original_invoice_number: returnInvoiceNo,
        items: [
          {
            product_id: prod.id,
            barcode: prod.barcode,
            name: prod.name,
            returned_qty: returnQty,
            unit_price: prod.selling_price,
            refund_amount: refundAmt,
            condition: returnCondition,
            gst_rate: prod.gst_rate,
          },
        ],
        refund_amount: refundAmt,
        refund_method: returnRefundMethod,
        reason: returnReason || "Customer return",
      });
      setReturnModalOpen(false);
      notify(`Return processed! Refund: ₹${refundAmt}`);
      setReturnInvoiceNo("");
      setReturnProductBarcode("");
    } catch {
      notify("Return processing failed", "error");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100 text-slate-800">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`fixed top-18 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 text-sm font-semibold transition-all ${
            notification.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Main Billing Canvas (Split View: Left Cart Table / Right Financial Control) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 gap-3">
        {/* Left Side: Barcode Scanner & Active Cart Items */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Barcode Search Header */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
            <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                <Barcode className="w-5 h-5" />
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan Barcode (EAN) or Enter Item Name / SKU [F1]"
                className="w-full pl-11 pr-24 py-2.5 bg-slate-800 text-white placeholder-slate-400 rounded-lg border border-slate-700 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autoComplete="off"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md transition"
              >
                Enter
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchModalOpen(true);
              }}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center space-x-1.5 transition"
              title="Search Item Directory"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Catalog</span>
            </button>
          </div>

          {/* Cart Table */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400">
                <Barcode className="w-16 h-16 text-slate-300 mb-3 animate-pulse" />
                <h3 className="text-base font-semibold text-slate-600">POS Cart is Empty</h3>
                <p className="text-xs text-slate-400 text-center max-w-sm mt-1">
                  Ready to scan barcodes or search products. Press <span className="font-mono font-bold text-slate-600">F1</span> to focus scanner.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {products.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProductToCart(p)}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded text-xs text-slate-700 transition"
                    >
                      + {p.name.substring(0, 22)} (₹{p.selling_price})
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-2 text-center w-16">Unit</th>
                    <th className="py-2.5 px-2 text-right w-20">MRP</th>
                    <th className="py-2.5 px-2 text-right w-20">Rate</th>
                    <th className="py-2.5 px-2 text-center w-32">Qty</th>
                    <th className="py-2.5 px-2 text-center w-16">GST</th>
                    <th className="py-2.5 px-3 text-right w-24">Total</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item, idx) => (
                    <tr key={item.product_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 leading-tight">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.barcode}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-medium text-slate-500">
                        {item.unit}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-400 line-through">
                        ₹{item.mrp.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                        ₹{item.selling_price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="inline-flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.product_id, item.qty - 1)}
                            className="p-1 hover:bg-slate-100 text-slate-600 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            step="any"
                            value={item.qty}
                            onChange={(e) => updateItemQty(item.product_id, parseFloat(e.target.value) || 0)}
                            className="w-12 text-center py-0.5 text-xs font-semibold text-slate-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.product_id, item.qty + 1)}
                            className="p-1 hover:bg-slate-100 text-slate-600 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          {item.gst_rate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        ₹{item.total.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.product_id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Cart Bottom Status Bar */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center space-x-3">
              <span>Lines: <strong>{cartTotals.total_items}</strong></span>
              <span>Total Qty: <strong>{cartTotals.total_qty}</strong></span>
              {customerPhone && (
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                  Cust: {customerName || customerPhone} ({customerPoints} pts)
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-rose-600 hover:text-rose-700 font-medium text-xs transition"
              >
                Clear Cart
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Financial Summary, Quick Keypad & Settle Actions */}
        <div className="w-full lg:w-96 flex flex-col gap-3">
          {/* Grand Total & Tax Summary Card */}
          <div className="bg-slate-900 rounded-xl p-4 text-white shadow-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
                Amount Payable (₹ INR)
              </div>
              <div className="text-4xl font-black text-emerald-400 tracking-tight">
                ₹{cartTotals.grand_total.toFixed(2)}
              </div>
              {cartTotals.subtotal_mrp > cartTotals.grand_total && (
                <div className="mt-1 flex items-center space-x-1.5 text-xs text-amber-300 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    You Save ₹{(cartTotals.subtotal_mrp - cartTotals.grand_total).toFixed(2)} Today!
                  </span>
                </div>
              )}
            </div>

            {/* Tax & Discount Breakdown */}
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (MRP):</span>
                <span>₹{cartTotals.subtotal_mrp.toFixed(2)}</span>
              </div>
              {cartTotals.bill_discount_amount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Bill Discount:</span>
                  <span>-₹{cartTotals.bill_discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Taxable Value:</span>
                <span>₹{cartTotals.taxable_subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>CGST / SGST:</span>
                <span>₹{cartTotals.cgst_total.toFixed(2)} / ₹{cartTotals.sgst_total.toFixed(2)}</span>
              </div>
              {cartTotals.round_off !== 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Round Off:</span>
                  <span>{cartTotals.round_off > 0 ? "+" : ""}₹{cartTotals.round_off.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Checkout & Action Buttons */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex-1 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Fast POS Functions
              </div>

              {/* Primary Settle & Print Button [F10] */}
              <button
                type="button"
                onClick={openPaymentModal}
                disabled={cart.length === 0}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-base shadow-md shadow-emerald-600/20 flex items-center justify-between transition"
              >
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Settle Bill & Print</span>
                </div>
                <span className="text-xs font-mono bg-emerald-700 px-2 py-0.5 rounded">F10</span>
              </button>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Hold Bill [F2] */}
                <button
                  type="button"
                  onClick={handleHoldCart}
                  disabled={cart.length === 0}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-lg font-semibold flex items-center justify-between border border-slate-200 transition"
                >
                  <div className="flex items-center space-x-1.5">
                    <Pause className="w-3.5 h-3.5 text-amber-600" />
                    <span>Hold Bill</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">F2</span>
                </button>

                {/* Resume Bill [F3] */}
                <button
                  type="button"
                  onClick={() => setHeldModalOpen(true)}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center justify-between border border-slate-200 transition"
                >
                  <div className="flex items-center space-x-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Recall ({heldBills.length})</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">F3</span>
                </button>

                {/* Discount [F5] */}
                <button
                  type="button"
                  onClick={() => setDiscountModalOpen(true)}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center justify-between border border-slate-200 transition"
                >
                  <div className="flex items-center space-x-1.5">
                    <Percent className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Discount</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">F5</span>
                </button>

                {/* Customer [F6] */}
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center justify-between border border-slate-200 transition"
                >
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Customer</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">F6</span>
                </button>

                {/* Sales Return [F7] */}
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(true)}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center justify-between border border-slate-200 transition"
                >
                  <div className="flex items-center space-x-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>Returns</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">F7</span>
                </button>

                {/* Reprint Last [F8] */}
                <button
                  type="button"
                  onClick={() => {
                    if (recentBills.length > 0) {
                      onPrintBill(recentBills[0]);
                    } else {
                      notify("No bill to reprint", "error");
                    }
                  }}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center justify-between border border-slate-200 transition"
                >
                  <div className="flex items-center space-x-1.5">
                    <Printer className="w-3.5 h-3.5 text-slate-700" />
                    <span>Reprint</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">F8</span>
                </button>
              </div>
            </div>

            {/* Shift Reconciliation Trigger [F9] */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShiftModalOpen(true)}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center justify-between transition"
              >
                <span>Shift #{activeShift?.shift_number || "None"} (F9)</span>
                <span className="text-emerald-600 font-bold">
                  {activeShift ? "Open" : "Open Shift"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Ribbon (F1 - F10 Display) */}
      <footer className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-white text-[11px] overflow-x-auto select-none">
        <div className="flex items-center space-x-3 whitespace-nowrap">
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-emerald-400">F1</kbd>
            <span className="text-slate-400">Scan</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-amber-400">F2</kbd>
            <span className="text-slate-400">Hold</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-emerald-400">F3</kbd>
            <span className="text-slate-400">Recall</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-blue-400">F4</kbd>
            <span className="text-slate-400">Pay</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-indigo-400">F5</kbd>
            <span className="text-slate-400">Disc</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-cyan-400">F6</kbd>
            <span className="text-slate-400">Cust</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-rose-400">F7</kbd>
            <span className="text-slate-400">Return</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-purple-400">F8</kbd>
            <span className="text-slate-400">Reprint</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-teal-400">F9</kbd>
            <span className="text-slate-400">Shift</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-emerald-600 rounded font-mono font-bold text-white">F10</kbd>
            <span className="text-slate-200 font-semibold">Settle</span>
          </span>
        </div>
        <div className="text-[10px] text-slate-400 hidden md:block">
          Press <kbd className="px-1 bg-slate-800 rounded text-slate-300">Esc</kbd> to dismiss dialogs
        </div>
      </footer>

      {/* --- MODAL 1: PAYMENT & SETTLEMENT --- */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Payment & Tender [F4 / F10]</h3>
                <p className="text-xs text-slate-400">Select payment method and confirm tender</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Grand Total Display */}
              <div className="text-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Payable Total</span>
                <div className="text-3xl font-black text-slate-900 mt-0.5">
                  ₹{cartTotals.grand_total.toFixed(2)}
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="grid grid-cols-4 gap-2">
                {(["CASH", "UPI", "CARD", "SPLIT"] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1.5 ${
                      paymentMode === mode
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {mode === "CASH" && <Banknote className="w-5 h-5" />}
                    {mode === "UPI" && <QrCode className="w-5 h-5" />}
                    {mode === "CARD" && <CreditCard className="w-5 h-5" />}
                    {mode === "SPLIT" && <Layers className="w-5 h-5" />}
                    <span>{mode}</span>
                  </button>
                ))}
              </div>

              {/* Cash Tender & Change Due Calculator */}
              {paymentMode === "CASH" && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700">Cash Received / Tendered (₹):</label>
                    <input
                      type="number"
                      value={tenderAmount || ""}
                      onChange={(e) => setTenderAmount(parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-1.5 border border-slate-300 rounded-lg text-right font-bold text-sm text-slate-900 bg-white"
                      autoFocus
                    />
                  </div>

                  {/* Fast Tender Buttons */}
                  <div className="flex gap-1.5 justify-end">
                    {[100, 200, 500, 1000, 2000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTenderAmount(amt)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-semibold"
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-600">Change Due to Customer:</span>
                    <span
                      className={`text-lg ${
                        tenderAmount >= cartTotals.grand_total ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      ₹{Math.max(0, tenderAmount - cartTotals.grand_total).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* UPI Dynamic QR Mock */}
              {paymentMode === "UPI" && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
                  <div className="w-32 h-32 mx-auto bg-white border-2 border-slate-800 rounded-lg p-2 flex items-center justify-center shadow-inner">
                    <QrCode className="w-24 h-24 text-slate-900" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">UPI QR: urbanmart@icici</p>
                  <p className="text-[11px] text-slate-500">
                    Scan using PhonePe, Google Pay, or Paytm. Press Complete once verified.
                  </p>
                </div>
              )}

              {/* Card Swipe */}
              {paymentMode === "CARD" && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
                  <CreditCard className="w-10 h-10 text-blue-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">EDC Card Machine Terminal</p>
                  <p className="text-[11px] text-slate-500">
                    Swipe or tap card on POS terminal for ₹{cartTotals.grand_total.toFixed(2)}.
                  </p>
                </div>
              )}

              {/* Split Tender Form */}
              {paymentMode === "SPLIT" && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-700">Cash Portion (₹):</label>
                    <input
                      type="number"
                      value={splitCash}
                      onChange={(e) => {
                        const c = parseFloat(e.target.value) || 0;
                        setSplitCash(c);
                        setSplitDigital(Math.max(0, cartTotals.grand_total - c));
                      }}
                      className="w-28 px-3 py-1 border border-slate-300 rounded-lg text-right font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <label className="font-semibold text-slate-700">Digital Portion (₹):</label>
                      <select
                        value={splitDigitalMode}
                        onChange={(e) => setSplitDigitalMode(e.target.value as any)}
                        className="text-[11px] font-semibold bg-white border border-slate-300 rounded px-1.5 py-0.5"
                      >
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
                      </select>
                    </div>
                    <input
                      type="number"
                      value={splitDigital}
                      onChange={(e) => {
                        const d = parseFloat(e.target.value) || 0;
                        setSplitDigital(d);
                        setSplitCash(Math.max(0, cartTotals.grand_total - d));
                      }}
                      className="w-28 px-3 py-1 border border-slate-300 rounded-lg text-right font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel (Esc)
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center space-x-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm & Print Bill (Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: SEARCH PRODUCTS CATALOG --- */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Product Directory Lookup</h3>
              </div>
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-200">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type item name, category, or barcode..."
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {products
                .filter((p) => {
                  const q = searchQuery.toLowerCase();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    p.barcode.includes(q) ||
                    p.category.toLowerCase().includes(q)
                  );
                })
                .slice(0, 30)
                .map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      addProductToCart(p);
                      setSearchModalOpen(false);
                      notify(`Added ${p.name}`);
                    }}
                    className="py-2.5 px-3 flex items-center justify-between hover:bg-emerald-50 rounded-lg cursor-pointer transition"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {p.barcode} • {p.category} • In-Stock: {p.stock_qty} {p.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xs text-emerald-700">₹{p.selling_price.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400 line-through">MRP ₹{p.mrp.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: HELD BILLS (PARKED CARTS) --- */}
      {heldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Parked Bills / Recall Cart [F3]</h3>
              <button
                type="button"
                onClick={() => setHeldModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {heldBills.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No parked bills currently held. Press F2 to park an active cart.
                </div>
              ) : (
                heldBills.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 border border-slate-200 rounded-xl flex items-center justify-between hover:border-emerald-400 transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {h.customer_name || h.customer_phone || "Walk-in Cart"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Held at: {new Date(h.held_at).toLocaleTimeString("en-IN")} • {h.items.length} items
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-black text-sm text-slate-900">₹{h.subtotal.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => handleResumeCart(h.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                      >
                        Resume Cart
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: CUSTOMER LOOKUP & LOYALTY --- */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Customer CRM & Loyalty [F6]</h3>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Mobile Phone (10-digit):</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                  placeholder="e.g. 9820123456"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Customer Full Name:</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {customerPoints > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-800">
                  Available Loyalty Points: <strong>{customerPoints}</strong> (₹{customerPoints} savings value)
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition"
              >
                Apply Customer (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: DISCOUNT PROMO --- */}
      {discountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Apply Bill Discount [F5]</h3>
              <button
                type="button"
                onClick={() => setDiscountModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Discount Percentage (%):</label>
                <input
                  type="number"
                  max={50}
                  value={billDiscountPercent || ""}
                  onChange={(e) => {
                    setBillDiscountPercent(parseFloat(e.target.value) || 0);
                    setBillDiscountAmount(0);
                  }}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  autoFocus
                />
                <span className="text-[10px] text-slate-400">Max cashier limit: 10% (higher needs supervisor)</span>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Or Flat Amount (₹):</label>
                <input
                  type="number"
                  value={billDiscountAmount || ""}
                  onChange={(e) => {
                    setBillDiscountAmount(parseFloat(e.target.value) || 0);
                    setBillDiscountPercent(0);
                  }}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setDiscountModalOpen(false)}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 6: SALES RETURN & REFUND --- */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Sales Return & Refund [F7]</h3>
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Original Invoice Number:</label>
                <input
                  type="text"
                  value={returnInvoiceNo}
                  onChange={(e) => setReturnInvoiceNo(e.target.value)}
                  placeholder="e.g. UM-2026-00001"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Item Barcode to Return:</label>
                <input
                  type="text"
                  value={returnProductBarcode}
                  onChange={(e) => setReturnProductBarcode(e.target.value)}
                  placeholder="Scan or enter item barcode"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Return Qty:</label>
                  <input
                    type="number"
                    min={1}
                    value={returnQty}
                    onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Item Condition:</label>
                  <select
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="GOOD">Good (Restock to Inventory)</option>
                    <option value="DAMAGED">Damaged (Do Not Restock)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Refund Method:</label>
                  <select
                    value={returnRefundMethod}
                    onChange={(e) => setReturnRefundMethod(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="CASH">Cash Refund</option>
                    <option value="CREDIT_NOTE">Credit Note Voucher</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Return Reason:</label>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Wrong size, expired, etc."
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
                >
                  Process Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 7: CASHIER SHIFT SUMMARY & RECONCILIATION --- */}
      {shiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Cashier Shift & Drawer Reconciliation [F9]</h3>
              <button
                type="button"
                onClick={() => setShiftModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeShift ? (
              <div className="p-5 space-y-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Shift:</span>
                    <span className="font-bold text-slate-800">{activeShift.shift_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Opening Float:</span>
                    <span className="font-semibold text-slate-800">₹{activeShift.opening_float.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cash Sales:</span>
                    <span className="font-semibold text-emerald-700">₹{activeShift.cash_sales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">UPI / Card Sales:</span>
                    <span className="font-semibold text-slate-800">
                      ₹{(activeShift.upi_sales + activeShift.card_sales).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cash Refunds:</span>
                    <span className="font-semibold text-rose-600">-₹{activeShift.cash_refunds.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-sm">
                    <span>Expected Cash in Drawer:</span>
                    <span className="text-slate-900">₹{activeShift.expected_cash.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Actual Cash Counted (₹):</label>
                  <input
                    type="number"
                    value={closingCashInput}
                    onChange={(e) => setClosingCashInput(e.target.value)}
                    placeholder="Enter physical cash count"
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                  />
                  {closingCashInput && (
                    <div className="mt-1 text-[11px] font-semibold">
                      Difference:{" "}
                      <span
                        className={
                          parseFloat(closingCashInput) >= activeShift.expected_cash
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }
                      >
                        {parseFloat(closingCashInput) - activeShift.expected_cash >= 0 ? "+" : ""}
                        ₹{(parseFloat(closingCashInput) - activeShift.expected_cash).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Closing Notes / Discrepancy Reason:</label>
                  <input
                    type="text"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShiftModalOpen(false)}
                    className="px-4 py-2 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!closingCashInput) {
                        notify("Enter actual cash count", "error");
                        return;
                      }
                      await onCloseShift(
                        activeShift.id,
                        parseFloat(closingCashInput) || 0,
                        closingNotes
                      );
                      setShiftModalOpen(false);
                      notify("Shift closed successfully");
                    }}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
                  >
                    Close & Lock Shift
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4 text-xs">
                <p className="text-slate-600">
                  No active cashier shift is open. Please open a shift with an initial starting cash float.
                </p>
                <div>
                  <label className="font-semibold text-slate-700">Opening Cash Float (₹):</label>
                  <input
                    type="number"
                    value={openingFloatInput}
                    onChange={(e) => setOpeningFloatInput(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShiftModalOpen(false)}
                    className="px-4 py-2 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onOpenShift(parseFloat(openingFloatInput) || 0);
                      setShiftModalOpen(false);
                      notify("Shift opened successfully");
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                  >
                    Open New Shift
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
