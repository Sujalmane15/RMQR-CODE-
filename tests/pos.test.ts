import { describe, it, expect, beforeEach } from "vitest";
import { UrbanMartDatabase } from "../src/lib/db/memory-db";
import { createBillItem } from "../src/lib/tax";
import path from "path";
import fs from "fs";

describe("POS Billing & Inventory Decrement Tests", () => {
  let db: UrbanMartDatabase;
  const testDbPath = path.resolve(__dirname, "test-pos-db.json");

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new UrbanMartDatabase(testDbPath);
  });

  it("generates sequential monotonic invoice numbers", () => {
    const products = db.getProducts();
    const item = createBillItem(products[0], 1);

    const bill1 = db.createBill({
      cashier_id: "usr-pos-01",
      cashier_name: "Cashier",
      counter_id: "POS-01",
      items: [item],
      total_items: 1,
      total_qty: 1,
      subtotal_mrp: item.mrp,
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

    const bill2 = db.createBill({
      cashier_id: "usr-pos-01",
      cashier_name: "Cashier",
      counter_id: "POS-01",
      items: [item],
      total_items: 1,
      total_qty: 1,
      subtotal_mrp: item.mrp,
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

    expect(bill1.invoice_number).toBe("UM-2026-00001");
    expect(bill2.invoice_number).toBe("UM-2026-00002");
  });

  it("atomically decrements stock and creates perpetual stock ledger entry", () => {
    const products = db.getProducts();
    const targetProduct = products[0]; // e.g. Onion with 120kg initial
    const initialStock = targetProduct.stock_qty;

    const sellQty = 5;
    const item = createBillItem(targetProduct, sellQty);

    const bill = db.createBill({
      cashier_id: "usr-pos-01",
      cashier_name: "Cashier",
      counter_id: "POS-01",
      items: [item],
      total_items: 1,
      total_qty: sellQty,
      subtotal_mrp: item.mrp * sellQty,
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

    const updatedProduct = db.getProductById(targetProduct.id)!;
    expect(updatedProduct.stock_qty).toBe(initialStock - sellQty);

    const ledger = db.getStockLedger(5, targetProduct.id);
    const saleEntry = ledger.find((e) => e.transaction_type === "POS_SALE");
    expect(saleEntry).toBeDefined();
    expect(saleEntry?.qty_change).toBe(-sellQty);
    expect(saleEntry?.new_stock).toBe(initialStock - sellQty);
    expect(saleEntry?.reference_id).toBe(bill.invoice_number);
  });

  it("supports parking (holding) and resuming bills", () => {
    const products = db.getProducts();
    const item = createBillItem(products[0], 2);

    const held = db.holdBill({
      cashier_id: "usr-pos-01",
      cashier_name: "Cashier",
      items: [item],
      subtotal: item.total,
      note: "Customer forgot wallet in car",
    });

    expect(db.getHeldBills().length).toBe(1);

    const resumed = db.resumeBill(held.id);
    expect(resumed).not.toBeNull();
    expect(resumed?.items.length).toBe(1);
    expect(db.getHeldBills().length).toBe(0);
  });
});
