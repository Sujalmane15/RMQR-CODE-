import { describe, it, expect } from "vitest";
import { calculateCartTotals, calculateItemTax, round2 } from "../src/lib/tax";
import { BillItem } from "../src/types";

describe("Indian GST & Tax Engine Tests", () => {
  it("correctly handles 0% GST (Fresh Staples/Milk)", () => {
    // Selling price: 32, Qty: 2 => Line total: 64
    const res = calculateItemTax(32, 35, 2, 0);
    expect(res.taxableValue).toBe(64);
    expect(res.cgst).toBe(0);
    expect(res.sgst).toBe(0);
    expect(res.totalTax).toBe(0);
    expect(res.lineTotal).toBe(64);
  });

  it("correctly calculates 5% GST with equal CGST and SGST split", () => {
    // Fortune Oil 1L: Selling Price: 132 (tax-inclusive), Qty: 1
    // Taxable = 132 / 1.05 = 125.71
    // Total Tax = 132 - 125.71 = 6.29
    // CGST = 3.15, SGST = 3.14 (sum = 6.29)
    const res = calculateItemTax(132, 145, 1, 5);
    expect(res.taxableValue).toBe(125.71);
    expect(res.totalTax).toBe(6.29);
    expect(round2(res.cgst + res.sgst)).toBe(6.29);
    expect(res.lineTotal).toBe(132);
  });

  it("correctly calculates 12% GST (Processed Dairy / Butter)", () => {
    // Amul Butter 500g: Selling Price: 265, Qty: 2 => Gross = 530
    // Taxable = 530 / 1.12 = 473.21
    // Tax = 530 - 473.21 = 56.79
    const res = calculateItemTax(265, 275, 2, 12);
    expect(res.taxableValue).toBe(473.21);
    expect(res.totalTax).toBe(56.79);
    expect(round2(res.cgst + res.sgst)).toBe(56.79);
    expect(res.lineTotal).toBe(530);
  });

  it("correctly calculates 18% GST (Soaps & Detergents)", () => {
    // Surf Excel 1kg: Selling Price: 142, Qty: 1
    // Taxable = 142 / 1.18 = 120.34
    // Tax = 142 - 120.34 = 21.66
    const res = calculateItemTax(142, 155, 1, 18);
    expect(res.taxableValue).toBe(120.34);
    expect(res.totalTax).toBe(21.66);
    expect(round2(res.cgst + res.sgst)).toBe(21.66);
    expect(res.lineTotal).toBe(142);
  });

  it("correctly calculates 28% GST (Aerated Cold Drinks)", () => {
    // Thums Up 2.25L: Selling Price: 88, Qty: 2 => Gross = 176
    // Taxable = 176 / 1.28 = 137.50
    // Tax = 176 - 137.50 = 38.50
    const res = calculateItemTax(88, 95, 2, 28);
    expect(res.taxableValue).toBe(137.5);
    expect(res.totalTax).toBe(38.5);
    expect(res.cgst).toBe(19.25);
    expect(res.sgst).toBe(19.25);
    expect(res.lineTotal).toBe(176);
  });

  it("handles inter-state IGST without CGST/SGST split", () => {
    const res = calculateItemTax(100, 100, 1, 18, 0, true);
    expect(res.igst).toBe(res.totalTax);
    expect(res.cgst).toBe(0);
    expect(res.sgst).toBe(0);
  });

  it("correctly aggregates multi-product cart and applies nearest rupee round-off", () => {
    const items: BillItem[] = [
      {
        product_id: "p1",
        barcode: "8901001",
        name: "Onion",
        unit: "KG",
        mrp: 35,
        selling_price: 32,
        qty: 1.5,
        gst_rate: 0,
        discount_amount: 0,
        taxable_value: 48,
        cgst: 0,
        sgst: 0,
        igst: 0,
        cess: 0,
        total: 48,
      },
      {
        product_id: "p2",
        barcode: "8901002",
        name: "Tata Salt",
        unit: "PACK",
        mrp: 28,
        selling_price: 26,
        qty: 1,
        gst_rate: 5,
        discount_amount: 0,
        taxable_value: 24.76,
        cgst: 0.62,
        sgst: 0.62,
        igst: 0,
        cess: 0,
        total: 26,
      },
    ];

    const result = calculateCartTotals(items, 0, 0);
    expect(result.total_items).toBe(2);
    expect(result.total_qty).toBe(2.5);
    expect(result.grand_total).toBe(74); // 48 + 26 = 74
    expect(result.round_off).toBe(0);
    expect(result.tax_breakup.length).toBe(1); // Only 5% has tax
  });

  it("accurately applies bill-level percentage discount with proportional GST adjustment", () => {
    const items: BillItem[] = [
      {
        product_id: "p1",
        barcode: "8901002",
        name: "Tata Salt",
        unit: "PACK",
        mrp: 100,
        selling_price: 100,
        qty: 1,
        gst_rate: 18,
        discount_amount: 0,
        taxable_value: 84.75,
        cgst: 7.63,
        sgst: 7.63,
        igst: 0,
        cess: 0,
        total: 100,
      },
    ];

    // 10% bill discount
    const result = calculateCartTotals(items, 10, 0);
    expect(result.bill_discount_amount).toBe(10);
    expect(result.grand_total).toBe(90);
    // Taxable subtotal should be proportionally reduced (84.75 * 0.9 = 76.28)
    expect(result.taxable_subtotal).toBe(76.28);
    // CGST + SGST should be proportionally reduced
    expect(result.total_tax).toBe(13.72);
    expect(round2(result.taxable_subtotal + result.total_tax)).toBe(90);
  });

  it("handles fixed rupee bill discount and boundary round-off", () => {
    const items: BillItem[] = [
      {
        product_id: "p1",
        barcode: "8901001",
        name: "Item",
        unit: "PCS",
        mrp: 100,
        selling_price: 99.4,
        qty: 1,
        gst_rate: 0,
        discount_amount: 0,
        taxable_value: 99.4,
        cgst: 0,
        sgst: 0,
        igst: 0,
        cess: 0,
        total: 99.4,
      },
    ];

    const result = calculateCartTotals(items, 0, 10);
    expect(result.bill_discount_amount).toBe(10);
    // 99.4 - 10 = 89.4 => rounds to 89 with round_off = -0.40
    expect(result.grand_total).toBe(89);
    expect(result.round_off).toBe(-0.4);
  });
});
