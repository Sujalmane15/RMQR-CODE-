import { describe, it, expect, beforeEach } from "vitest";
import { UrbanMartDatabase } from "../src/lib/db/memory-db";
import { createBillItem } from "../src/lib/tax";
import path from "path";
import fs from "fs";

describe("Cashier Shift & Drawer Reconciliation Tests", () => {
  let db: UrbanMartDatabase;
  const testDbPath = path.resolve(__dirname, "test-shift-db.json");

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new UrbanMartDatabase(testDbPath);
  });

  it("opens shift with opening float and accumulates cash & digital sales", () => {
    const openingFloat = 2000;
    const shift = db.openShift("usr-pos-01", "Ramesh Pawar", "POS-01", openingFloat);

    expect(shift.status).toBe("OPEN");
    expect(shift.opening_float).toBe(2000);
    expect(shift.expected_cash).toBe(2000);

    const products = db.getProducts();
    const item = createBillItem(products[0], 2);

    // Bill 1: Cash sale
    db.createBill({
      cashier_id: "usr-pos-01",
      cashier_name: "Ramesh Pawar",
      counter_id: "POS-01",
      items: [item],
      total_items: 1,
      total_qty: 2,
      subtotal_mrp: item.mrp * 2,
      item_discount_total: 0,
      bill_discount_percent: 0,
      bill_discount_amount: 0,
      taxable_subtotal: item.taxable_value,
      cgst_total: item.cgst,
      sgst_total: item.sgst,
      igst_total: 0,
      cess_total: 0,
      total_tax: item.cgst + item.sgst,
      round_off: 0,
      grand_total: item.total,
      payment_mode: "CASH",
      payments: [{ mode: "CASH", amount: item.total }],
      tender_amount: item.total,
      change_returned: 0,
      loyalty_points_earned: 0,
      loyalty_points_redeemed: 0,
      status: "COMPLETED",
    });

    const active = db.getActiveShift("usr-pos-01")!;
    expect(active.bills_count).toBe(1);
    expect(active.cash_sales).toBe(item.total);
    expect(active.expected_cash).toBe(openingFloat + item.total);
  });

  it("accurately handles cash sales return and computes drawer difference on close", () => {
    const shift = db.openShift("usr-pos-01", "Ramesh Pawar", "POS-01", 1000);

    // Record cash sales return
    db.createSalesReturn({
      original_invoice_number: "UM-2026-00001",
      original_bill_id: "bill-1",
      items: [],
      refund_amount: 150,
      refund_method: "CASH",
      reason: "Item returned",
      processed_by: "Ramesh Pawar",
    });

    const active = db.getActiveShift("usr-pos-01")!;
    expect(active.cash_refunds).toBe(150);
    expect(active.expected_cash).toBe(1000 - 150); // 850

    // Cashier counts 840 (short by 10)
    const closed = db.closeShift(shift.id, 840, "₹10 short change given");
    expect(closed?.status).toBe("CLOSED");
    expect(closed?.actual_cash).toBe(840);
    expect(closed?.difference).toBe(-10);
  });
});
