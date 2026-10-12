import { describe, it, expect, beforeEach } from "vitest";
import { UrbanMartDatabase } from "../src/lib/db/memory-db";
import { GRNItem } from "../src/types";
import path from "path";
import fs from "fs";

describe("GRN Stock Inward & Approval Workflow Tests", () => {
  let db: UrbanMartDatabase;
  const testDbPath = path.resolve(__dirname, "test-grn-db.json");

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new UrbanMartDatabase(testDbPath);
  });

  it("creates GRN in draft state without updating stock prematurely", () => {
    const products = db.getProducts();
    const targetProduct = products[0];
    const initialStock = targetProduct.stock_qty;

    const grnItem: GRNItem = {
      id: "it-1",
      product_id: targetProduct.id,
      barcode: targetProduct.barcode,
      product_name: targetProduct.name,
      unit: targetProduct.unit,
      batch_number: "BAT-2026-X1",
      mfg_date: "2026-10-01",
      expiry_date: "2027-10-01",
      invoiced_qty: 100,
      received_qty: 100,
      damaged_qty: 0,
      shortage_qty: 0,
      accepted_qty: 100,
      purchase_rate: 25,
      mrp: 35,
      selling_price: 32,
      gst_rate: 0,
      tax_amount: 0,
      total_amount: 2500,
    };

    const grn = db.createGRN({
      supplier_id: "sup-hul-01",
      supplier_name: "HUL",
      supplier_invoice_no: "INV-9988",
      supplier_invoice_date: "2026-10-10",
      items: [grnItem],
      subtotal: 2500,
      total_tax: 0,
      grand_total: 2500,
      status: "DRAFT",
      received_by: "Vikas Kadam",
    });

    expect(grn.status).toBe("DRAFT");
    expect(grn.grn_number).toBe("GRN-2026-00001");

    // Stock must not change before approval
    const prodAfterDraft = db.getProductById(targetProduct.id)!;
    expect(prodAfterDraft.stock_qty).toBe(initialStock);
  });

  it("approves GRN, increments inventory, and writes stock ledger", () => {
    const products = db.getProducts();
    const targetProduct = products[0];
    const initialStock = targetProduct.stock_qty;
    const acceptedQty = 50;

    const grnItem: GRNItem = {
      id: "it-1",
      product_id: targetProduct.id,
      barcode: targetProduct.barcode,
      product_name: targetProduct.name,
      unit: targetProduct.unit,
      batch_number: "BAT-2026-X2",
      mfg_date: "2026-10-01",
      expiry_date: "2027-10-01",
      invoiced_qty: 50,
      received_qty: 50,
      damaged_qty: 0,
      shortage_qty: 0,
      accepted_qty: acceptedQty,
      purchase_rate: 25,
      mrp: 35,
      selling_price: 32,
      gst_rate: 0,
      tax_amount: 0,
      total_amount: 1250,
    };

    const grn = db.createGRN({
      supplier_id: "sup-hul-01",
      supplier_name: "HUL",
      supplier_invoice_no: "INV-9989",
      supplier_invoice_date: "2026-10-10",
      items: [grnItem],
      subtotal: 1250,
      total_tax: 0,
      grand_total: 1250,
      status: "DRAFT",
      received_by: "Vikas Kadam",
    });

    const approved = db.approveGRN(grn.id, "Store Director");
    expect(approved?.status).toBe("APPROVED");

    // Stock should now be incremented by acceptedQty
    const prodAfterApproval = db.getProductById(targetProduct.id)!;
    expect(prodAfterApproval.stock_qty).toBe(initialStock + acceptedQty);

    // Ledger must record GRN_INWARD
    const ledger = db.getStockLedger(5, targetProduct.id);
    const inwardEntry = ledger.find((e) => e.transaction_type === "GRN_INWARD");
    expect(inwardEntry).toBeDefined();
    expect(inwardEntry?.qty_change).toBe(acceptedQty);
    expect(inwardEntry?.new_stock).toBe(initialStock + acceptedQty);
  });

  it("properly writes off damaged quantities during GRN inward inspection", () => {
    const products = db.getProducts();
    const targetProduct = products[0];
    const initialStock = targetProduct.stock_qty;
    const received = 40;
    const damaged = 5;
    const accepted = 35; // 40 - 5

    const grnItem: GRNItem = {
      id: "it-damage-1",
      product_id: targetProduct.id,
      barcode: targetProduct.barcode,
      product_name: targetProduct.name,
      unit: targetProduct.unit,
      batch_number: "BAT-DMG",
      mfg_date: "2026-10-01",
      expiry_date: "2027-10-01",
      invoiced_qty: 40,
      received_qty: received,
      damaged_qty: damaged,
      shortage_qty: 0,
      accepted_qty: accepted,
      purchase_rate: 20,
      mrp: 30,
      selling_price: 28,
      gst_rate: 0,
      tax_amount: 0,
      total_amount: 700,
    };

    const grn = db.createGRN({
      supplier_id: "sup-hul-01",
      supplier_name: "HUL",
      supplier_invoice_no: "INV-DMG",
      supplier_invoice_date: "2026-10-10",
      items: [grnItem],
      subtotal: 700,
      total_tax: 0,
      grand_total: 700,
      status: "DRAFT",
      received_by: "Vikas Kadam",
    });

    db.approveGRN(grn.id, "Store Director");

    // Stock should only increase by accepted (35)
    const prod = db.getProductById(targetProduct.id)!;
    expect(prod.stock_qty).toBe(initialStock + accepted);

    // Ledger should record damage write off
    const ledger = db.getStockLedger(10, targetProduct.id);
    const dmgEntry = ledger.find((e) => e.transaction_type === "DAMAGE_WRITE_OFF");
    expect(dmgEntry).toBeDefined();
    expect(dmgEntry?.qty_change).toBe(-damaged);
  });
});
